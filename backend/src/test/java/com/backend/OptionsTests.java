package com.backend;

import com.backend.dto.CharacterCreateRequest;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.service.CharacterCreationService;
import com.backend.service.OptionsService;
import com.backend.service.RoleService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Stage 5b: the races / classes a player sees and may pick, GM overrides
// and unlock flags.
@SpringBootTest
class OptionsTests {

    @Autowired private OptionsService optionsService;
    @Autowired private CharacterCreationService creationService;
    @Autowired private RoleService roleService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Every test that touches overrides or flags puts them back.
    @AfterEach
    void reset() {
        optionsService.setStatus("RACE", "Elf", "unlockable");
        optionsService.setStatus("RACE", "Kenku", "allowed");
        optionsService.setStatus("CLASS", "Fighter", "allowed");
        optionsService.setStatus("RACE", "CUSTOM", "undecided");
        optionsService.setFlag("magic_continent", false, "");
    }

    private Map<String, JsonNode> playerRaces() throws Exception {
        Map<String, JsonNode> out = new HashMap<>();
        for (JsonNode n : objectMapper.readTree(optionsService.dataJson("races", false))) {
            out.put(n.get("key").asText(), n);
        }
        return out;
    }

    private User newPlayer() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return roleService.createAccount("opt-" + tag, tag + "@example.test", "test-password-123");
    }

    // Full access like the GM, but not OWNER: SetupStatusTests needs the
    // owner seat to stay empty.
    private User newGm() {
        if (roleService.listRoles().stream().noneMatch(r -> "TEST_GM".equals(r.getKey()))) {
            roleService.createRole("TEST_GM", "Test GM", "Тестовая роль", List.of("*"));
        }
        return roleService.assignRole(newPlayer().getId(), "TEST_GM");
    }

    private CharacterCreateRequest fighter(String race) {
        CharacterCreateRequest r = new CharacterCreateRequest();
        r.setName("Тест");
        r.setRaceKey(race);
        r.setClassKey("Fighter");
        r.setBackgroundKey("CLERK");
        r.setAbilityMethod("STANDARD");
        r.setBaseScores(Map.of("STR", 15, "DEX", 14, "CON", 13, "INT", 12, "WIS", 10, "CHA", 8));
        return r;
    }

    @Test
    void playersSeeOnlyAllowedAndUnlockableWithoutTheUnlockKey() throws Exception {
        Map<String, JsonNode> races = playerRaces();

        assertTrue(races.containsKey("Human"));
        assertEquals("unlockable", races.get("Elf").get("status").asText());
        assertFalse(races.get("Elf").has("unlock"));
        assertFalse(races.containsKey("Half-Orc"));   // undecided
        assertFalse(races.containsKey("Aarakocra"));  // closed
        for (JsonNode n : races.values()) assertFalse(n.has("unlock"));

        JsonNode classes = objectMapper.readTree(optionsService.dataJson("classes", false));
        for (JsonNode n : classes) {
            String status = n.get("status").asText();
            assertTrue(status.equals("allowed") || status.equals("unlockable"), n.get("key").asText());
        }

        // The GM sees everything, unlock keys included.
        JsonNode gm = objectMapper.readTree(optionsService.dataJson("races", true));
        assertTrue(gm.size() > races.size());
    }

    @Test
    void anOpenFlagTurnsUnlockableIntoAllowed() throws Exception {
        optionsService.setFlag("magic_continent", true, "подпись");

        JsonNode elf = playerRaces().get("Elf");
        assertEquals("allowed", elf.get("status").asText());
        assertFalse(elf.has("unlock"));
        assertTrue(optionsService.isAllowed(OptionsService.RACE, "Elf", false));
    }

    @Test
    void gmOverrideWinsOverTheData() throws Exception {
        optionsService.setStatus("RACE", "Kenku", "closed");
        assertFalse(playerRaces().containsKey("Kenku"));

        optionsService.setStatus("RACE", "Half-Orc", "allowed");
        assertEquals("allowed", playerRaces().get("Half-Orc").get("status").asText());
        optionsService.setStatus("RACE", "Half-Orc", "undecided");
        assertFalse(playerRaces().containsKey("Half-Orc"));
    }

    @Test
    void creationRefusesWhatIsNotAllowed() {
        User player = newPlayer();
        ApiException e = assertThrows(ApiException.class, () -> creationService.create(fighter("Elf"), player.getId()));
        assertEquals("Эта раса пока закрыта для оформления.", e.getMessage());

        optionsService.setStatus("CLASS", "Fighter", "closed");
        assertThrows(ApiException.class, () -> creationService.create(fighter("Human"), player.getId()));
    }

    @Test
    void nonSrdRaceTakesFlexibleBonusesAndTypedTraits() {
        User player = newPlayer();
        CharacterCreateRequest r = fighter("Kenku");
        assertThrows(ApiException.class, () -> creationService.create(r, player.getId())); // bonuses required

        r.setFlexibleBonuses(Map.of("DEX", 2, "WIS", 1));
        r.setRaceSpeed(35);
        r.setRaceSize("Маленький");
        r.setRaceTraits("Черты из книги.");
        Character c = creationService.create(r, player.getId());
        assertEquals(16, c.getDexterity());
        assertEquals(11, c.getWisdom());
        assertEquals(35, c.getSpeed());
        assertTrue(c.getFeaturesAndTraits().contains("Размер: Маленький."));
        assertTrue(c.getFeaturesAndTraits().contains("Черты из книги."));

        CharacterCreateRequest bad = fighter("Kenku");
        bad.setFlexibleBonuses(Map.of("DEX", 2, "WIS", 2));
        assertThrows(ApiException.class, () -> creationService.create(bad, player.getId()));
    }

    @Test
    void srdRaceMaySwitchToFlexibleBonuses() {
        User player = newPlayer();
        CharacterCreateRequest r = fighter("Dwarf");
        r.setFlexibleBonuses(Map.of("STR", 1, "DEX", 1, "INT", 1));
        Character c = creationService.create(r, player.getId());
        assertEquals(16, c.getStrength());
        assertEquals(13, c.getConstitution()); // no fixed dwarf +2
        assertEquals(13, c.getIntelligence());
    }

    @Test
    void classWithoutMechanicsTakesWhatThePlayerTyped() {
        User player = newPlayer();
        CharacterCreateRequest r = fighter("Human");
        r.setClassKey("Alchemist");
        assertThrows(ApiException.class, () -> creationService.create(r, player.getId())); // no hit die

        r.setCustomHitDie(8);
        r.setCustomSaves(List.of("CON", "INT"));
        r.setCustomSpellAbility("INT");
        r.setClassSkills(List.of("ARCANA", "MEDICINE"));
        r.setCantrips(List.of("fire-bolt", "guidance"));
        Character c = creationService.create(r, player.getId());
        assertEquals("d8", c.getHitDiceType());
        assertEquals(10, c.getHpMax()); // 8 + CON mod 1 (13 + 1 human)
        assertEquals("INT", c.getSpellcastingAbility());
        assertTrue(c.getProficientSaves().containsAll(List.of("CON", "INT")));
    }

    @Test
    void artificerPicksAnyCantrip() {
        User player = newPlayer();
        CharacterCreateRequest r = fighter("Human");
        r.setClassKey("Artificer");
        r.setClassSkills(List.of("ARCANA", "INVESTIGATION"));
        r.setCantrips(List.of("fire-bolt", "guidance"));
        Character c = creationService.create(r, player.getId());
        assertEquals("d8", c.getHitDiceType());
        assertEquals("INT", c.getSpellcastingAbility());
    }

    @Test
    void customRaceIsHiddenUntilTheGmAllowsIt() throws Exception {
        assertFalse(playerRaces().containsKey("CUSTOM"));
        User player = newPlayer();
        CharacterCreateRequest r = fighter("CUSTOM");
        r.setCustomRaceName("Лисий народ");
        r.setCustomRaceBonuses(Map.of("DEX", 2, "WIS", 1));
        ApiException e = assertThrows(ApiException.class, () -> creationService.create(r, player.getId()));
        assertEquals("Эта раса пока закрыта для оформления.", e.getMessage());

        optionsService.setStatus("RACE", "CUSTOM", "allowed");
        assertTrue(playerRaces().containsKey("CUSTOM"));
        assertEquals("Лисий народ", creationService.create(r, player.getId()).getRace());
    }

    @Test
    void npcOnlyClassesAreForTheGmOnly() throws Exception {
        for (JsonNode n : objectMapper.readTree(optionsService.dataJson("classes", false))) {
            assertNotEquals("npc_only", n.get("status").asText());
        }
        CharacterCreateRequest r = fighter("Human");
        r.setClassKey("Warrior Sidekick");
        r.setCustomHitDie(8);
        r.setCustomSaves(List.of("STR", "CON"));

        User player = newPlayer();
        assertThrows(ApiException.class, () -> creationService.create(r, player.getId()));

        User gm = newGm();
        assertEquals("Warrior Sidekick", creationService.create(r, gm.getId()).getCharacterClass());
    }
}
