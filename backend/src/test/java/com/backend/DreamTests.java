package com.backend;

import com.backend.dto.ChestContents;
import com.backend.dto.ChestRewardRequest;
import com.backend.dto.ChestRewardResponse;
import com.backend.dto.DreamDtos.DreamInput;
import com.backend.dto.DreamDtos.GmDream;
import com.backend.dto.DreamDtos.ParticipantInput;
import com.backend.dto.DreamDtos.PlayerDream;
import com.backend.dto.DreamDtos.PlayerParticipant;
import com.backend.dto.InventoryItemResponse;
import com.backend.entity.ApprovalStatus;
import com.backend.entity.Campaign;
import com.backend.entity.Character;
import com.backend.entity.RuneTier;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.repository.CampaignRepository;
import com.backend.repository.CharacterRepository;
import com.backend.service.ChestService;
import com.backend.service.DreamService;
import com.backend.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// «Сны»: who sees which case, the GM notes never leave, immersion and form,
// trophies into the Сундучок and breaking items into aspects.
@SpringBootTest
class DreamTests {

    @Autowired private DreamService dreams;
    @Autowired private ChestService chest;
    @Autowired private RoleService roleService;
    @Autowired private CharacterRepository characterRepository;
    @Autowired private CampaignRepository campaignRepository;
    @Autowired private ObjectMapper webMapper;

    private User newPlayer(String prefix) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return roleService.createAccount(prefix + "-" + tag, tag + "@example.test", "test-password-123");
    }

    private Character hero(User owner, String name, Campaign campaign) {
        return characterRepository.save(Character.builder()
                .user(owner).name(name).characterClass("Fighter").level(1).hpMax(10).hpCurrent(10)
                .approvalStatus(ApprovalStatus.APPROVED).runeTier(RuneTier.COMMON).campaign(campaign)
                .build());
    }

    private GmDream dream(Campaign campaign) {
        return dreams.create(new DreamInput(null, "Латунная дверь", "Сотрудники знают про дверь.", "OPEN",
                campaign != null ? campaign.getId() : null, "Трофеи по описи.", "Заметка ГМ: дверь ведёт в подвал"));
    }

    @Test
    void numbersGoInOrderOrFromWhereTheGmSays() {
        GmDream a = dream(null);
        GmDream b = dream(null);
        assertEquals(a.number() + 1, b.number());
        assertEquals("№0012", DreamService.caseNumber(12));

        int start = dreams.nextNumber() + 100;
        GmDream custom = dreams.create(new DreamInput(start, "Своя нумерация", null, null, null, null, null));
        assertEquals(start, custom.number());
        assertEquals("DRAFT", custom.status(), "a new case starts as a draft");
        assertEquals(start + 1, dreams.nextNumber());
        ApiException taken = assertThrows(ApiException.class,
                () -> dreams.create(new DreamInput(start, "Дубль", null, null, null, null, null)));
        assertEquals(409, taken.getStatus().value());
        assertThrows(ApiException.class, () -> dreams.create(new DreamInput(0, "Ноль", null, null, null, null, null)));
    }

    @Test
    void draftsAreInvisibleToPlayers() {
        User anya = newPlayer("anya");
        Campaign campaign = campaignRepository.save(Campaign.builder().name("Златопряды").owner(anya).build());
        Character mirra = hero(anya, "Мирра", campaign);
        GmDream draft = dreams.create(new DreamInput(null, "Черновик", "Секрет", null, campaign.getId(), null, null));
        dreams.addParticipant(draft.id(), mirra.getId());
        assertTrue(dreams.list(anya).stream().noneMatch(d -> d.id().equals(draft.id())));
        assertThrows(ApiException.class, () -> dreams.get(draft.id(), anya));
        assertTrue(dreams.current(mirra.getId(), anya).isEmpty());

        // Announced: players see the announcement.
        dreams.update(draft.id(), new DreamInput(null, "Анонс", "Скоро", "ANNOUNCED", campaign.getId(), null, null));
        assertEquals("ANNOUNCED", dreams.get(draft.id(), anya).status());
    }

    @Test
    void playersSeeTheirCasesWithoutGmNotes() throws Exception {
        User anya = newPlayer("anya");
        User ivan = newPlayer("ivan");
        User stranger = newPlayer("stranger");
        Campaign campaign = campaignRepository.save(Campaign.builder().name("Златопряды").owner(anya).build());
        Character mirra = hero(anya, "Мирра", campaign);
        Character torvald = hero(ivan, "Торвальд", campaign);
        GmDream d = dream(campaign);
        dreams.addParticipant(d.id(), mirra.getId());
        GmDream withBoth = dreams.addParticipant(d.id(), torvald.getId());
        Long ivanSeat = withBoth.participants().stream().filter(p -> p.characterId().equals(torvald.getId())).findFirst().orElseThrow().id();
        dreams.updateParticipant(d.id(), ivanSeat, new ParticipantInput(3, "Меч стал легендарным", "Aarakocra"));

        PlayerDream seen = dreams.get(d.id(), anya);
        assertEquals("OPEN", seen.status());
        PlayerParticipant other = seen.participants().stream().filter(p -> !p.mine()).findFirst().orElseThrow();
        assertNull(other.immersionStage());
        assertNull(other.stageNote());
        assertNull(other.dreamForm());

        PlayerDream ivans = dreams.get(d.id(), ivan);
        PlayerParticipant mine = ivans.participants().stream().filter(PlayerParticipant::mine).findFirst().orElseThrow();
        assertEquals(3, mine.immersionStage());
        assertEquals("Aarakocra", mine.dreamForm());
        assertNotNull(mine.dreamFormName());

        for (String json : List.of(webMapper.writeValueAsString(dreams.list(anya)), webMapper.writeValueAsString(seen),
                webMapper.writeValueAsString(ivans))) {
            assertFalse(json.contains("gmNotes"), json);
            assertFalse(json.contains("подвал"), json);
        }
        assertFalse(webMapper.writeValueAsString(seen).contains("легендарным"), "someone else's stage note");
        assertThrows(ApiException.class, () -> dreams.get(d.id(), stranger));
        assertTrue(dreams.list(stranger).stream().noneMatch(x -> x.id().equals(d.id())));
    }

    @Test
    void stageFormAndTheSheetHeader() {
        User anya = newPlayer("anya");
        Character mirra = hero(anya, "Мирра", null);
        GmDream d = dream(null);
        Long seat = dreams.addParticipant(d.id(), mirra.getId()).participants().get(0).id();
        assertThrows(ApiException.class, () -> dreams.updateParticipant(d.id(), seat, new ParticipantInput(5, null, null)));
        assertThrows(ApiException.class, () -> dreams.updateParticipant(d.id(), seat, new ParticipantInput(null, null, "Nope")));
        dreams.updateParticipant(d.id(), seat, new ParticipantInput(2, "Меняется одежда", "Tiefling"));

        var now = dreams.current(mirra.getId(), anya).orElseThrow();
        assertEquals(2, now.immersionStage());
        assertEquals(d.number(), now.number());
        assertThrows(ApiException.class, () -> dreams.current(mirra.getId(), newPlayer("nosy")));

        // "" is the character's own form again.
        dreams.updateParticipant(d.id(), seat, new ParticipantInput(null, null, ""));
        assertNull(dreams.current(mirra.getId(), anya).orElseThrow().dreamForm());

        GmDream closed = dreams.close(d.id(), "CLEARED", null);
        assertEquals("CLEARED", closed.status());
        assertNotNull(closed.closedAt());
        assertTrue(dreams.current(mirra.getId(), anya).isEmpty(), "a closed dream is not 'now'");
        assertThrows(ApiException.class, () -> dreams.close(d.id(), "OPEN", null));
    }

    @Test
    void trophyGoesToTheChestAndBreaksIntoAspects() throws Exception {
        User anya = newPlayer("anya");
        Character mirra = hero(anya, "Мирра", null);
        GmDream d = dream(null);
        dreams.addParticipant(d.id(), mirra.getId());

        ChestRewardRequest req = new ChestRewardRequest();
        req.setContents(ChestContents.builder()
                .items(List.of(ChestContents.Item.builder().name("Латунная шестерня").rarity("RARE").quantity(2)
                        .disassembleInto(Map.of("steam", 3, "order", 1)).build()))
                .build());
        List<ChestRewardResponse> sent = dreams.trophy(d.id(), req, null);
        assertEquals(1, sent.size());
        assertEquals(mirra.getId(), sent.get(0).getCharacterId());
        assertEquals("Трофей из Дела " + DreamService.caseNumber(d.number()), sent.get(0).getTitle());
        // The GM sees what it breaks into; the player does not, even once opened.
        assertEquals(Map.of("steam", 3, "order", 1), sent.get(0).getContents().getItems().get(0).getDisassembleInto());

        ChestRewardResponse opened = chest.open(mirra.getId(), sent.get(0).getId(), null, anya).reward();
        List<InventoryItemResponse> items = chest.inventory(mirra.getId(), anya);
        InventoryItemResponse gear = items.get(0);
        assertEquals("Из сна: Дело " + DreamService.caseNumber(d.number()), gear.getOrigin());
        assertTrue(gear.isCanDisassemble());
        for (String json : List.of(webMapper.writeValueAsString(opened), webMapper.writeValueAsString(items),
                webMapper.writeValueAsString(chest.chest(mirra.getId(), anya)))) {
            assertFalse(json.contains("disassembleInto"), json);
        }

        int steamBefore = characterRepository.findById(mirra.getId()).orElseThrow().getAspects().getOrDefault("steam", 0);
        ChestService.Disassembled first = chest.disassemble(mirra.getId(), gear.getId(), anya);
        assertEquals(Map.of("steam", 3, "order", 1), first.aspects());
        assertEquals(1, first.item().getQuantity());
        ChestService.Disassembled second = chest.disassemble(mirra.getId(), gear.getId(), anya);
        assertNull(second.item(), "the last piece is gone");
        assertEquals(steamBefore + 6, characterRepository.findById(mirra.getId()).orElseThrow().getAspects().get("steam"));
        assertTrue(chest.inventory(mirra.getId(), anya).isEmpty());
    }

    @Test
    void plainItemsDoNotBreak() {
        User anya = newPlayer("anya");
        Character mirra = hero(anya, "Мирра", null);
        InventoryItemResponse rope = chest.gmAddItem(mirra.getId(), ChestContents.Item.builder().name("Верёвка").build());
        assertFalse(rope.isCanDisassemble());
        assertThrows(ApiException.class, () -> chest.disassemble(mirra.getId(), rope.getId(), anya));
        assertThrows(ApiException.class, () -> chest.disassemble(mirra.getId(), rope.getId(), newPlayer("nosy")));
    }
}
