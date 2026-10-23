package com.backend;

import com.backend.calendar.AvailabilityCalculator;
import com.backend.dto.CalendarDtos.NewPoll;
import com.backend.dto.CalendarDtos.PollDto;
import com.backend.dto.CalendarDtos.Profile;
import com.backend.dto.CalendarDtos.SessionDto;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.repository.AnnouncementRepository;
import com.backend.service.CalendarService;
import com.backend.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Stage 8 on H2: only the GM creates and schedules polls, participants see
// their poll, others do not, schedules publish an announcement, .ics is valid.
@SpringBootTest
class CalendarApiTests {

    @Autowired private CalendarService calendar;
    @Autowired private RoleService roleService;
    @Autowired private AnnouncementRepository announcementRepository;
    @Autowired private ObjectMapper webMapper;

    private User newUser(String prefix) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return roleService.createAccount(prefix + "-" + tag, tag + "@example.test", "test-password-123");
    }

    // Full access like the GM, but not OWNER (SetupStatusTests needs that seat empty).
    private User newGm() {
        if (roleService.listRoles().stream().noneMatch(r -> "TEST_GM".equals(r.getKey()))) {
            roleService.createRole("TEST_GM", "Test GM", "Тестовая роль", List.of("*"));
        }
        return roleService.assignRole(newUser("gm").getId(), "TEST_GM");
    }

    private void weekendEvenings(User u, String zone, LocalTime from, LocalTime to) {
        calendar.saveProfile(u, new Profile(true, zone, "00:00", "08:00",
                AvailabilityCalculator.grid(Set.of(6, 7), from, to), null));
    }

    private PollDto poll(User gm, List<User> people) {
        return calendar.create(new NewPoll("Сессия 13", null, people.stream().map(User::getId).toList(),
                LocalDate.of(2026, 10, 24), LocalDate.of(2026, 10, 25), "Asia/Almaty", 180, null), gm);
    }

    @Test
    void onlyTheGmCreatesAndSchedules() {
        User gm = newGm();
        User anya = newUser("anya");
        assertThrows(ApiException.class, () -> poll(anya, List.of(anya)));
        PollDto p = poll(gm, List.of(anya));
        assertThrows(ApiException.class, () -> calendar.schedule(p.id(), Instant.parse("2026-10-24T14:00:00Z"), anya));
        assertThrows(ApiException.class, () -> calendar.cancel(p.id(), anya));
    }

    @Test
    void participantsSeeTheirPollAndOthersDoNot() throws Exception {
        User gm = newGm();
        User anya = newUser("anya");
        User ivan = newUser("ivan");
        User stranger = newUser("stranger");
        weekendEvenings(anya, "America/Toronto", LocalTime.of(10, 0), LocalTime.of(14, 0));
        weekendEvenings(ivan, "Europe/Moscow", LocalTime.of(16, 0), LocalTime.of(22, 0));
        PollDto p = poll(gm, List.of(anya, ivan));

        assertTrue(calendar.polls(anya).stream().anyMatch(x -> x.id().equals(p.id())));
        assertTrue(calendar.polls(stranger).stream().noneMatch(x -> x.id().equals(p.id())));
        assertThrows(ApiException.class, () -> calendar.poll(p.id(), stranger));

        PollDto seen = calendar.poll(p.id(), anya);
        assertEquals(Instant.parse("2026-10-24T14:00:00Z"), seen.windows().get(0).startUtc());
        assertEquals(2, seen.windows().get(0).available().size());
        // Others are a name and a zone only - never their grid.
        String json = webMapper.writeValueAsString(seen);
        assertFalse(json.contains("weeklyGrid"));
        assertFalse(json.contains("0000000000"));
        assertTrue(seen.participants().stream().anyMatch(x -> "America/Toronto".equals(x.timezone())));
    }

    @Test
    void schedulingCreatesASessionAnAnnouncementAndAnIcs() {
        User gm = newGm();
        User anya = newUser("anya");
        PollDto p = poll(gm, List.of(anya));
        long announcements = announcementRepository.count();

        SessionDto s = calendar.schedule(p.id(), Instant.parse("2026-10-24T14:00:00Z"), gm);
        assertEquals("SCHEDULED", calendar.poll(p.id(), gm).status());
        assertEquals(announcements + 1, announcementRepository.count());
        assertTrue(announcementRepository.findAll().stream().anyMatch(a -> a.getTitle().equals("Сессия назначена: Сессия 13")
                && a.getBody().contains("суббота, 24 октября 2026, 19:00")
                && a.getBody().contains("В Приёмной время показано по вашему поясу.")));
        assertThrows(ApiException.class, () -> calendar.schedule(p.id(), Instant.parse("2026-10-25T14:00:00Z"), gm));

        assertTrue(calendar.sessions(anya, false).stream().anyMatch(x -> x.id().equals(s.id())));
        assertTrue(calendar.sessions(newUser("other"), false).stream().noneMatch(x -> x.id().equals(s.id())));

        String ics = calendar.ics(s.id(), anya);
        assertTrue(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
        assertTrue(ics.contains("\r\nBEGIN:VEVENT\r\n"));
        assertTrue(ics.contains("\r\nUID:session-" + s.id() + "@sunny-inc\r\n"));
        assertTrue(ics.contains("\r\nDTSTART:20261024T140000Z\r\n"));
        assertTrue(ics.contains("\r\nDTEND:20261024T170000Z\r\n"));
        assertTrue(ics.contains("\r\nSUMMARY:Сессия 13\r\n"));
        assertTrue(ics.contains("DESCRIPTION:"));
        assertTrue(ics.contains("\r\nBEGIN:VALARM\r\nTRIGGER:-PT24H\r\nACTION:DISPLAY\r\n"));
        assertTrue(ics.contains("\r\nBEGIN:VALARM\r\nTRIGGER:-PT1H\r\nACTION:DISPLAY\r\n"));
        assertTrue(ics.endsWith("END:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"));
        for (String line : ics.split("\r\n")) {
            assertTrue(line.getBytes(StandardCharsets.UTF_8).length <= 75, line);
        }
        assertThrows(ApiException.class, () -> calendar.ics(s.id(), newUser("nosy")));
    }

    @Test
    void ownProfileAndExceptionsAreValidated() {
        User u = newUser("me");
        assertFalse(calendar.myProfile(u, "Asia/Almaty").exists());
        assertThrows(ApiException.class, () -> calendar.saveProfile(u, new Profile(true, "Mars/Olympus", "00:00", "08:00", "0".repeat(336), null)));
        assertThrows(ApiException.class, () -> calendar.saveProfile(u, new Profile(true, "Asia/Almaty", "00:00", "08:00", "01", null)));
        Profile saved = calendar.saveProfile(u, new Profile(true, "Asia/Almaty", "23:00", "07:00", "1".repeat(336), null));
        assertTrue(saved.exists());
        assertEquals("23:00", saved.sleepStart());

        var e = calendar.saveException(u, null, new com.backend.dto.CalendarDtos.ExceptionDto(null, LocalDate.of(2026, 10, 24), "BUSY", null, null));
        assertEquals(1, calendar.myExceptions(u).size());
        assertThrows(ApiException.class, () -> calendar.saveException(u, null,
                new com.backend.dto.CalendarDtos.ExceptionDto(null, LocalDate.of(2026, 10, 24), "FREE", 600, 615)));
        assertThrows(ApiException.class, () -> calendar.deleteException(newUser("x"), e.id()));
        calendar.deleteException(u, e.id());
        assertTrue(calendar.myExceptions(u).isEmpty());
    }
}
