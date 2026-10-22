package com.backend;

import com.backend.dto.CharacterCreateRequest;
import com.backend.dto.ResearchNoteResponse;
import com.backend.dto.ResearchTopicSummary;
import com.backend.dto.ResearchTopicView;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.repository.CharacterRepository;
import com.backend.repository.KnownSpellRepository;
import com.backend.research.Placement;
import com.backend.research.ResearchSolver;
import com.backend.research.ResearchTopicGenerator;
import com.backend.service.AdmissionService;
import com.backend.service.CharacterCreationService;
import com.backend.service.MagicData;
import com.backend.service.RoleService;
import com.backend.service.SpellResearchService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Stage 6 on H2: research notes spend and return aspects, approval teaches
// the spell, access and ownership are checked, casters get a starter kit.
@SpringBootTest
class ResearchApiTests {

    @Autowired private RoleService roleService;
    @Autowired private CharacterCreationService creationService;
    @Autowired private AdmissionService admissionService;
    @Autowired private SpellResearchService research;
    @Autowired private CharacterRepository characterRepository;
    @Autowired private KnownSpellRepository knownSpellRepository;
    @Autowired private MagicData magic;

    private User newPlayer() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return roleService.createAccount("res-" + tag, tag + "@example.test", "test-password-123");
    }

    private Character approved(User player, String classKey) {
        CharacterCreateRequest r = new CharacterCreateRequest();
        r.setName("Исследователь");
        r.setRaceKey("Human");
        r.setClassKey(classKey);
        r.setBackgroundKey("CLERK");
        r.setAbilityMethod("STANDARD");
        r.setBaseScores(Map.of("STR", 8, "DEX", 14, "CON", 13, "INT", 15, "WIS", 12, "CHA", 10));
        Character c = creationService.create(r, player.getId());
        admissionService.approve(admissionService.forCharacter(c.getId(), player).get(0).getId(), null, false, null);
        return characterRepository.findById(c.getId()).orElseThrow();
    }

    private List<Placement> solution(ResearchTopicView view) {
        return ResearchSolver.solve(magic.graph(), new ResearchTopicGenerator.Topic(view.getRadius(), view.getAnchors()));
    }

    private static Map<String, Integer> counts(List<Placement> placed) {
        Map<String, Integer> out = new LinkedHashMap<>();
        placed.forEach(p -> out.merge(p.aspect(), 1, Integer::sum));
        return out;
    }

    // Grants exactly what the solution needs beyond the bag.
    private void topUp(Character c, List<Placement> placed) {
        Map<String, Integer> bag = characterRepository.findById(c.getId()).orElseThrow().getAspects();
        counts(placed).forEach((k, n) -> {
            int missing = n - bag.getOrDefault(k, 0);
            if (missing > 0) research.grant(c.getId(), k, missing);
        });
    }

    private Map<String, Integer> bag(Character c) {
        return new HashMap<>(characterRepository.findById(c.getId()).orElseThrow().getAspects());
    }

    @Test
    void approvedCasterGetsTheStarterKitAndFighterDoesNot() {
        Character wizard = approved(newPlayer(), "Wizard");
        Map<String, Integer> bag = bag(wizard);
        for (String primal : magic.primalKeys()) assertEquals(3, bag.get(primal), primal);

        Character fighter = approved(newPlayer(), "Fighter");
        assertTrue(bag(fighter).isEmpty());
    }

    @Test
    void submitSpendsRejectReturnsApproveTeaches() {
        User player = newPlayer();
        Character c = approved(player, "Wizard");
        ResearchTopicView view = research.topic(c.getId(), "magic-missile", player);
        assertEquals("AVAILABLE", view.getStatus());
        List<Placement> placed = solution(view);
        topUp(c, placed);
        Map<String, Integer> before = bag(c);

        research.saveDraft(c.getId(), "magic-missile", placed.subList(0, 1), player);
        assertEquals(1, research.topic(c.getId(), "magic-missile", player).getDraft().size());

        ResearchNoteResponse note = research.submit(c.getId(), "magic-missile", placed, player);
        assertEquals("PENDING", note.getStatus());
        Map<String, Integer> after = bag(c);
        counts(placed).forEach((k, n) -> assertEquals(before.get(k) - n, after.getOrDefault(k, 0), k));
        assertTrue(research.topic(c.getId(), "magic-missile", player).getDraft().isEmpty());

        // An open note blocks a second one.
        assertThrows(ApiException.class, () -> research.submit(c.getId(), "magic-missile", placed, player));

        research.reject(note.getId(), "Перепроверьте", null);
        assertEquals(before, bag(c));

        ResearchNoteResponse again = research.submit(c.getId(), "magic-missile", placed, player);
        research.approve(again.getId(), null, null);
        assertTrue(knownSpellRepository.existsByCharacterIdAndSpellId(c.getId(), "magic-missile"));
        assertEquals("KNOWN", research.topic(c.getId(), "magic-missile", player).getStatus());
    }

    @Test
    void cannotSubmitWithoutAspectsInTheBag() {
        User player = newPlayer();
        Character c = approved(player, "Wizard");
        List<Placement> placed = solution(research.topic(c.getId(), "magic-missile", player));
        Character fresh = characterRepository.findById(c.getId()).orElseThrow();
        fresh.getAspects().clear();
        characterRepository.save(fresh);

        ApiException e = assertThrows(ApiException.class, () -> research.submit(c.getId(), "magic-missile", placed, player));
        assertTrue(e.getMessage().startsWith("В сумке не хватает"));
    }

    @Test
    void cannotSubmitAnUnavailableTopicOrAWrongGrid() {
        User player = newPlayer();
        Character c = approved(player, "Wizard");
        Map<String, ResearchTopicSummary> topics = new HashMap<>();
        research.topics(c.getId(), player).forEach(t -> topics.put(t.getSpellId(), t));
        assertEquals("Нужен 5 уровень", topics.get("fireball").getReason());
        assertEquals("Не ваш список", topics.get("cure-wounds").getReason());
        assertEquals("AVAILABLE", topics.get("magic-missile").getStatus());

        List<Placement> placed = solution(research.topic(c.getId(), "magic-missile", player));
        assertThrows(ApiException.class, () -> research.submit(c.getId(), "fireball", placed, player));

        // Half a chain does not connect the anchors.
        topUp(c, placed);
        assertThrows(ApiException.class,
                () -> research.submit(c.getId(), "magic-missile", placed.subList(0, placed.size() - 1), player));
    }

    @Test
    void someoneElsesCharacterIsOffLimits() {
        Character c = approved(newPlayer(), "Wizard");
        User stranger = newPlayer();
        assertThrows(ApiException.class, () -> research.topics(c.getId(), stranger));
        assertThrows(ApiException.class, () -> research.submit(c.getId(), "magic-missile", List.of(new Placement(0, 0, "dawn")), stranger));
        assertThrows(ApiException.class, () -> research.combine(c.getId(), "order", "steam", stranger));
    }

    @Test
    void combiningTakesTwoAndGivesTheCompound() {
        User player = newPlayer();
        Character c = approved(player, "Wizard");
        Map<String, Integer> bag = research.combine(c.getId(), "order", "steam", player);
        assertEquals(2, bag.get("order"));
        assertEquals(2, bag.get("steam"));
        assertEquals(1, bag.get("gear"));
        assertThrows(ApiException.class, () -> research.combine(c.getId(), "dawn", "shadow", player));
    }

    @Test
    void preparedFlagIsStoredAndNeverLimited() {
        User player = newPlayer();
        Character c = approved(player, "Wizard");
        research.addCantrip(c.getId(), "light", player);
        research.setPrepared(c.getId(), "light", true, player);
        assertTrue(research.knownSpells(c.getId()).stream()
                .filter(k -> k.getSpellId().equals("light")).findFirst().orElseThrow().isPrepared());
        research.setPrepared(c.getId(), "light", false, player);
        assertFalse(research.knownSpells(c.getId()).stream()
                .filter(k -> k.getSpellId().equals("light")).findFirst().orElseThrow().isPrepared());
        assertThrows(ApiException.class, () -> research.setPrepared(c.getId(), "fireball", true, player));
    }
}
