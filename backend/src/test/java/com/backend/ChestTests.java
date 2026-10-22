package com.backend;

import com.backend.dto.ChestContents;
import com.backend.dto.ChestRewardRequest;
import com.backend.dto.ChestRewardResponse;
import com.backend.entity.ApprovalStatus;
import com.backend.entity.Campaign;
import com.backend.entity.Character;
import com.backend.entity.ChestReward;
import com.backend.entity.RuneTier;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.repository.CampaignRepository;
import com.backend.repository.CharacterRepository;
import com.backend.repository.ChestRewardRepository;
import com.backend.repository.InventoryItemRepository;
import com.backend.service.ChestService;
import com.backend.service.ChestService.OpenOutcome;
import com.backend.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Stage 7: Сундучок - opening moves everything once, riddles bite, the
// answer never leaves the server, rewards go to a whole campaign.
@SpringBootTest
class ChestTests {

    @Autowired private ChestService chest;
    @Autowired private RoleService roleService;
    @Autowired private CharacterRepository characterRepository;
    @Autowired private CampaignRepository campaignRepository;
    @Autowired private ChestRewardRepository rewardRepository;
    @Autowired private InventoryItemRepository itemRepository;
    // The web layer's own (Jackson 3) mapper: what the client would receive.
    @Autowired private ObjectMapper webMapper;

    private User newPlayer() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return roleService.createAccount("chest-" + tag, tag + "@example.test", "test-password-123");
    }

    private Character hero(User owner, ApprovalStatus status, Campaign campaign) {
        return characterRepository.save(Character.builder()
                .user(owner).name("Герой").characterClass("Fighter").level(1)
                .hpMax(10).hpCurrent(10).gp(5)
                .approvalStatus(status).runeTier(RuneTier.COMMON).campaign(campaign)
                .build());
    }

    private ChestRewardRequest reward(Long characterId, String question, String answer, String penalty) {
        ChestRewardRequest r = new ChestRewardRequest();
        if (characterId != null) r.setCharacterIds(List.of(characterId));
        r.setTitle("Латунный ключ");
        r.setGmNote("За находчивость.");
        r.setContents(ChestContents.builder()
                .aspects(Map.of("steam", 3))
                .coins(Map.of("gp", 10))
                .items(List.of(ChestContents.Item.builder().name("Латунный ключ").rarity("UNCOMMON").build()))
                .build());
        r.setRiddleQuestion(question);
        r.setRiddleAnswer(answer);
        r.setPenalty(penalty);
        return r;
    }

    private Character reload(Character c) {
        return characterRepository.findById(c.getId()).orElseThrow();
    }

    @Test
    void openingMovesEverythingOnce() {
        User player = newPlayer();
        Character c = hero(player, ApprovalStatus.APPROVED, null);
        Long id = chest.send(reward(c.getId(), null, null, null), null).get(0).getId();

        ChestRewardResponse sealed = chest.chest(c.getId(), player).get(0);
        assertNull(sealed.getContents());
        assertNull(sealed.getGmNote());

        OpenOutcome out = chest.open(c.getId(), id, null, player);
        assertEquals(OpenOutcome.Kind.OPENED, out.kind());
        assertEquals("За находчивость.", out.reward().getGmNote());

        Character after = reload(c);
        assertEquals(3, after.getAspects().get("steam"));
        assertEquals(15, after.getGp());
        assertEquals(1, itemRepository.findByCharacterIdOrderByCreatedAtAsc(c.getId()).size());
        assertEquals("Награда: Латунный ключ", itemRepository.findByCharacterIdOrderByCreatedAtAsc(c.getId()).get(0).getOrigin());

        ApiException again = assertThrows(ApiException.class, () -> chest.open(c.getId(), id, null, player));
        assertEquals("Сундучок уже открыт.", again.getMessage());
        assertEquals(3, reload(c).getAspects().get("steam"));
    }

    @Test
    void wrongAnswerBitesWithEachPenalty() {
        User player = newPlayer();
        Character c = hero(player, ApprovalStatus.APPROVED, null);

        Long hp = chest.send(reward(c.getId(), "Что открывает ключ?", "Дверь", "HP_1"), null).get(0).getId();
        OpenOutcome bite = chest.open(c.getId(), hp, "окно", player);
        assertEquals(OpenOutcome.Kind.BITTEN, bite.kind());
        assertEquals(9, reload(c).getHpCurrent());

        Long none = chest.send(reward(c.getId(), "Что открывает ключ?", "Дверь", "NONE"), null).get(0).getId();
        assertEquals(OpenOutcome.Kind.BITTEN, chest.open(c.getId(), none, "окно", player).kind());
        assertEquals(9, reload(c).getHpCurrent());
        assertEquals(1, rewardRepository.findById(none).orElseThrow().getWrongAttempts());

        Long lock = chest.send(reward(c.getId(), "Что открывает ключ?", "Дверь", "LOCK_10_MIN"), null).get(0).getId();
        OpenOutcome locked = chest.open(c.getId(), lock, "окно", player);
        assertEquals(OpenOutcome.Kind.BITTEN, locked.kind());
        assertTrue(locked.lockedUntil().isAfter(LocalDateTime.now().plusMinutes(9)));
        assertTrue(locked.lockSeconds() > 590 && locked.lockSeconds() <= 600);

        // While locked even the right answer is refused...
        assertEquals(OpenOutcome.Kind.LOCKED, chest.open(c.getId(), lock, "дверь", player).kind());
        // ...and once the lock runs out it opens.
        ChestReward r = rewardRepository.findById(lock).orElseThrow();
        r.setLockedUntil(LocalDateTime.now().minusSeconds(1));
        rewardRepository.save(r);
        assertEquals(OpenOutcome.Kind.OPENED, chest.open(c.getId(), lock, " ДВЕРЬ ", player).kind());
    }

    @Test
    void hpNeverGoesBelowZero() {
        User player = newPlayer();
        Character c = hero(player, ApprovalStatus.APPROVED, null);
        c.setHpCurrent(0);
        characterRepository.save(c);
        Long id = chest.send(reward(c.getId(), "?", "да", "HP_1"), null).get(0).getId();
        OpenOutcome out = chest.open(c.getId(), id, "нет", player);
        assertTrue(out.spared());
        assertEquals(0, reload(c).getHpCurrent());
    }

    @Test
    void wrongAnswersAreKeptForTheGmOnly() {
        User player = newPlayer();
        Character c = hero(player, ApprovalStatus.APPROVED, null);
        Long id = chest.send(reward(c.getId(), "?", "да", "NONE"), null).get(0).getId();
        for (int i = 1; i <= 12; i++) chest.open(c.getId(), id, "попытка " + i, player);
        chest.open(c.getId(), id, "x".repeat(150), player);

        ChestRewardResponse gm = chest.sent(null).stream().filter(r -> r.getId().equals(id)).findFirst().orElseThrow();
        assertEquals(10, gm.getWrongAnswers().size());
        assertEquals("попытка 4", gm.getWrongAnswers().get(0).get("answer"));
        assertEquals(100, gm.getWrongAnswers().get(9).get("answer").length());
        assertNotNull(gm.getWrongAnswers().get(9).get("at"));

        assertNull(chest.chest(c.getId(), player).get(0).getWrongAnswers());
    }

    @Test
    void answerIsNormalized() {
        assertEquals(ChestService.hashAnswer("елка"), ChestService.hashAnswer("Ёлка "));
        assertEquals("елка", ChestService.normalize("  ЁЛКА"));
        assertNotEquals(ChestService.hashAnswer("елка"), ChestService.hashAnswer("ель"));
    }

    @Test
    void riddleAnswerIsNeverSerialized() throws Exception {
        User player = newPlayer();
        Character c = hero(player, ApprovalStatus.APPROVED, null);
        List<ChestRewardResponse> sent = chest.send(reward(c.getId(), "Что открывает ключ?", "Сокровенная-дверь", "NONE"), null);
        String hash = ChestService.hashAnswer("Сокровенная-дверь");

        String[] jsons = {
                webMapper.writeValueAsString(sent),
                webMapper.writeValueAsString(chest.sent(null)),
                webMapper.writeValueAsString(chest.chest(c.getId(), player)),
                webMapper.writeValueAsString(rewardRepository.findById(sent.get(0).getId()).orElseThrow()),
                webMapper.writeValueAsString(chest.open(c.getId(), sent.get(0).getId(), "Сокровенная-дверь", player).reward()),
        };
        for (String json : jsons) {
            assertFalse(json.contains(hash), json);
            assertFalse(json.toLowerCase().contains("сокровенная"), json);
            assertFalse(json.contains("riddleAnswer"), json);
        }
    }

    @Test
    void someoneElsesCharacterIsOffLimits() {
        Character c = hero(newPlayer(), ApprovalStatus.APPROVED, null);
        Long id = chest.send(reward(c.getId(), null, null, null), null).get(0).getId();
        User stranger = newPlayer();
        assertThrows(ApiException.class, () -> chest.chest(c.getId(), stranger));
        assertThrows(ApiException.class, () -> chest.open(c.getId(), id, null, stranger));
        assertThrows(ApiException.class, () -> chest.inventory(c.getId(), stranger));
    }

    @Test
    void campaignRewardGoesToEveryApprovedCharacter() {
        User gm = newPlayer();
        Campaign campaign = campaignRepository.save(Campaign.builder().name("Златопряды").owner(gm).build());
        Character a = hero(newPlayer(), ApprovalStatus.APPROVED, campaign);
        Character b = hero(newPlayer(), ApprovalStatus.APPROVED, campaign);
        Character pending = hero(newPlayer(), ApprovalStatus.PENDING, campaign);

        ChestRewardRequest r = reward(null, null, null, null);
        r.setCampaignId(campaign.getId());
        List<ChestRewardResponse> sent = chest.send(r, gm);

        assertEquals(2, sent.size());
        assertEquals(1, rewardRepository.findByCharacterIdOrderByCreatedAtDesc(a.getId()).size());
        assertEquals(1, rewardRepository.findByCharacterIdOrderByCreatedAtDesc(b.getId()).size());
        assertTrue(rewardRepository.findByCharacterIdOrderByCreatedAtDesc(pending.getId()).isEmpty());
    }

    @Test
    void playerMayOnlyUseItemsUp() {
        User player = newPlayer();
        Character c = hero(player, ApprovalStatus.APPROVED, null);
        Long id = chest.gmAddItem(c.getId(), ChestContents.Item.builder().name("Зелье").quantity(2).build()).getId();
        assertThrows(ApiException.class, () -> chest.patchItem(c.getId(), id, null, 3, player));
        assertEquals(1, chest.patchItem(c.getId(), id, "на чёрный день", 1, player).getQuantity());
        assertNull(chest.patchItem(c.getId(), id, null, 0, player));
        assertTrue(itemRepository.findById(id).isEmpty());
    }
}
