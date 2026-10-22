package com.backend;

import com.backend.dto.AdmissionRequestResponse;
import com.backend.dto.CharacterCreateRequest;
import com.backend.dto.CharacterSheetRequest;
import com.backend.entity.ApprovalStatus;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.repository.AdmissionRequestRepository;
import com.backend.repository.CharacterRepository;
import com.backend.service.AdmissionService;
import com.backend.service.CharacterCreationService;
import com.backend.service.CharacterService;
import com.backend.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Stage 5 campaign rules: the wizard's server-side checks, GM-only fields
// on the sheet, and admission requests above the rune cap.
@SpringBootTest
class AdmissionTests {

    @Autowired private RoleService roleService;
    @Autowired private CharacterCreationService creationService;
    @Autowired private CharacterService characterService;
    @Autowired private AdmissionService admissionService;
    @Autowired private CharacterRepository characterRepository;
    @Autowired private AdmissionRequestRepository requestRepository;

    private User newPlayer() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return roleService.createAccount("player-" + tag, tag + "@example.test", "test-password-123");
    }

    // Elf wizard, standard array, acolyte background, three wizard cantrips.
    private CharacterCreateRequest wizardElf() {
        CharacterCreateRequest r = new CharacterCreateRequest();
        r.setName("Мирра");
        r.setRaceKey("Elf");
        r.setClassKey("Wizard");
        r.setBackgroundKey("ACOLYTE");
        r.setAbilityMethod("STANDARD");
        r.setBaseScores(Map.of("STR", 8, "DEX", 14, "CON", 13, "INT", 15, "WIS", 12, "CHA", 10));
        r.setClassSkills(List.of("ARCANA", "HISTORY"));
        r.setCantrips(List.of("fire-bolt", "ray-of-frost", "mage-hand"));
        r.setRuneTier("COMMON");
        r.setStartLevel(1);
        return r;
    }

    private CharacterSheetRequest sheetFrom(Character c, int level) {
        CharacterSheetRequest s = new CharacterSheetRequest();
        s.setName(c.getName());
        s.setCharacterClass(c.getCharacterClass());
        s.setLevel(level);
        s.setHitDiceTotal(c.getHitDiceTotal());
        return s;
    }

    @Test
    void creationBuildsAPendingCharacterWithRequest() {
        User player = newPlayer();
        Character c = creationService.create(wizardElf(), player.getId());

        assertEquals(ApprovalStatus.PENDING, c.getApprovalStatus());
        assertEquals(16, c.getDexterity());   // 14 + 2 (elf)
        assertEquals(16, c.getIntelligence()); // 15 + 1 (high elf)
        assertEquals(7, c.getHpMax());         // d6 max 6 + CON mod 1
        assertTrue(c.getProficientSkills().containsAll(List.of("ARCANA", "HISTORY", "INSIGHT", "RELIGION", "PERCEPTION")));
        assertTrue(requestRepository.existsByCharacterIdAndStatus(c.getId(), ApprovalStatus.PENDING));
    }

    @Test
    void creationWithTooManyCantripsIsRejected() {
        User player = newPlayer();
        CharacterCreateRequest r = wizardElf();
        r.setCantrips(List.of("fire-bolt", "ray-of-frost", "mage-hand", "light"));
        ApiException e = assertThrows(ApiException.class, () -> creationService.create(r, player.getId()));
        assertTrue(e.getMessage().contains("не больше 3"));
    }

    @Test
    void creationAboveRuneCapIsRejected() {
        User player = newPlayer();
        CharacterCreateRequest r = wizardElf();
        r.setStartLevel(11);
        assertThrows(ApiException.class, () -> creationService.create(r, player.getId()));
    }

    @Test
    void playerCannotRaiseOwnLevelThroughTheSheet() {
        User player = newPlayer();
        Character c = creationService.create(wizardElf(), player.getId());

        characterService.updateSheet(c.getId(), sheetFrom(c, 10), player.getId(), false);

        assertEquals(1, characterRepository.findById(c.getId()).orElseThrow().getLevel());
    }

    @Test
    void levelUpAboveCapIsFlaggedAndApprovalGrantsClearance() {
        User player = newPlayer();
        Character c = creationService.create(wizardElf(), player.getId());
        Long creationId = admissionService.forCharacter(c.getId(), player).get(0).getId();
        admissionService.approve(creationId, null, false, null);

        // The GM may set the level directly; the rune cap is 10.
        characterService.updateSheet(c.getId(), sheetFrom(c, 10), player.getId(), true);

        AdmissionRequestResponse req = admissionService.requestLevelUp(c.getId(), null, "Готова к 11", player);
        assertTrue(req.isAboveCap());
        assertEquals(11, req.getRequestedLevel());

        admissionService.approve(req.getId(), "Допуск выдан", false, null);

        Character after = characterRepository.findById(c.getId()).orElseThrow();
        assertEquals(11, after.getLevel());
        assertEquals(11, after.getClearanceLevel());
        assertEquals(11, after.getLevelCap());
    }

    @Test
    void secondOpenLevelUpRequestIsRefused() {
        User player = newPlayer();
        Character c = creationService.create(wizardElf(), player.getId());
        Long creationId = admissionService.forCharacter(c.getId(), player).get(0).getId();
        admissionService.approve(creationId, null, false, null);

        admissionService.requestLevelUp(c.getId(), null, null, player);
        assertThrows(ApiException.class, () -> admissionService.requestLevelUp(c.getId(), null, null, player));
    }
}
