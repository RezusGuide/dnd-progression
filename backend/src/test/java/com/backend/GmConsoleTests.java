package com.backend;

import com.backend.dto.GmDtos.StaffRow;
import com.backend.entity.ApprovalStatus;
import com.backend.entity.Character;
import com.backend.entity.RuneTier;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.repository.CharacterRepository;
import com.backend.repository.GmActionLogRepository;
import com.backend.service.GmConsoleService;
import com.backend.service.GmLogService;
import com.backend.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Пульт ГМ: experience and inspiration for a group, the staff table, the
// GM's note, and every change landing in «Журнал».
@SpringBootTest
class GmConsoleTests {

    @Autowired private GmConsoleService console;
    @Autowired private GmLogService gmLog;
    @Autowired private RoleService roleService;
    @Autowired private CharacterRepository characterRepository;
    @Autowired private GmActionLogRepository logRepository;

    private Character hero(String name, int xp) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        User owner = roleService.createAccount("gm-" + tag, tag + "@example.test", "test-password-123");
        return characterRepository.save(Character.builder()
                .user(owner).name(name + " " + tag).characterClass("Fighter").race("Human").level(2).experiencePoints(xp)
                .hpMax(12).hpCurrent(12).approvalStatus(ApprovalStatus.APPROVED).runeTier(RuneTier.COMMON)
                .build());
    }

    private int xp(Character c) {
        return characterRepository.findById(c.getId()).orElseThrow().getExperiencePoints();
    }

    @Test
    void experienceGoesToTheWholeGroup() {
        Character a = hero("Мирра", 300);
        Character b = hero("Торвальд", 0);
        Character c = hero("Посторонний", 50);
        long logBefore = logRepository.count();

        List<StaffRow> rows = console.grantXp(List.of(a.getId(), b.getId(), a.getId()), 450, "Сессия 13");
        assertEquals(750, xp(a), "a duplicate id counts once");
        assertEquals(450, xp(b));
        assertEquals(50, xp(c), "not selected");
        assertEquals(750, rows.stream().filter(r -> r.id().equals(a.getId())).findFirst().orElseThrow().experiencePoints());
        assertEquals(logBefore + 2, logRepository.count());
        assertTrue(logRepository.findAll().stream().anyMatch(l -> "XP_GRANTED".equals(l.getAction())
                && b.getId().equals(l.getTargetId()) && l.getSummary().contains("+450") && l.getSummary().contains("Сессия 13")));

        // A correction never goes below zero.
        console.grantXp(List.of(b.getId()), -1000, null);
        assertEquals(0, xp(b));

        assertThrows(ApiException.class, () -> console.grantXp(List.of(a.getId()), 0, null));
        assertThrows(ApiException.class, () -> console.grantXp(List.of(), 10, null));
        assertThrows(ApiException.class, () -> console.grantXp(List.of(a.getId()), GmConsoleService.MAX_XP + 1, null));
        assertThrows(ApiException.class, () -> console.grantXp(List.of(-1L), 10, null));
    }

    @Test
    void inspirationOnAndOff() {
        Character a = hero("Мирра", 0);
        console.setInspiration(List.of(a.getId()), true);
        assertTrue(characterRepository.findById(a.getId()).orElseThrow().getInspiration());
        console.setInspiration(List.of(a.getId()), false);
        assertFalse(characterRepository.findById(a.getId()).orElseThrow().getInspiration());
        assertEquals(2, logRepository.findAll().stream()
                .filter(l -> "INSPIRATION".equals(l.getAction()) && a.getId().equals(l.getTargetId())).count());
    }

    @Test
    void staffTableHasEveryone() {
        Character a = hero("Мирра", 120);
        StaffRow row = console.staff().stream().filter(r -> r.id().equals(a.getId())).findFirst().orElseThrow();
        assertEquals(120, row.experiencePoints());
        assertEquals(RuneTier.COMMON.getLevelCap(), row.levelCap());
        assertEquals("APPROVED", row.approvalStatus());
        assertNull(row.dreamNumber());
        assertNotNull(row.player());
    }

    @Test
    void theNoteIsStoredOnce() {
        console.saveNote("## Тестовая заметка\n\nНе настоящие правила.");
        console.saveNote("## Вторая версия");
        assertEquals("## Вторая версия", console.note().body());
        assertNotNull(console.note().updatedAt());
    }

    @Test
    void logPagesNewestFirst() {
        gmLog.record("TEST_ACTION", null, null, null, "первая");
        gmLog.record("TEST_ACTION", null, null, null, "вторая");
        var page = gmLog.page("TEST_ACTION", 0, 1);
        assertEquals("вторая", page.getContent().get(0).getSummary());
        assertTrue(page.getTotalPages() >= 2);
        assertEquals(GmLogService.MAX_PAGE_SIZE, gmLog.page(null, 0, 1000).getSize());
    }
}
