package com.backend.calendar;

import com.backend.calendar.AvailabilityCalculator.Kind;
import com.backend.calendar.AvailabilityCalculator.Participant;
import com.backend.calendar.AvailabilityCalculator.Poll;
import com.backend.calendar.AvailabilityCalculator.Result;
import com.backend.calendar.AvailabilityCalculator.Window;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import static com.backend.calendar.AvailabilityCalculator.grid;
import static org.junit.jupiter.api.Assertions.*;

// Stage 8 core: free half-hours across time zones, DST, sleep, exceptions
// and the window search. Plain JUnit, no Spring.
class AvailabilityCalculatorTests {

    static final ZoneId TORONTO = ZoneId.of("America/Toronto");
    static final ZoneId MOSCOW = ZoneId.of("Europe/Moscow");
    static final ZoneId ALMATY = ZoneId.of("Asia/Almaty");
    static final LocalTime MIDNIGHT = LocalTime.MIDNIGHT;
    static final LocalTime EIGHT = LocalTime.of(8, 0);
    static final Set<Integer> WEEKEND = Set.of(6, 7);

    static Participant person(String id, ZoneId zone, String grid, AvailabilityCalculator.Exception... ex) {
        return new Participant(id, id, zone, MIDNIGHT, EIGHT, grid, List.of(ex));
    }

    // The three test players of the report: weekend afternoons in Toronto,
    // weekend evenings in Moscow and Almaty.
    static final Participant ANYA = person("Аня", TORONTO, grid(WEEKEND, LocalTime.of(10, 0), LocalTime.of(14, 0)));
    static final Participant IVAN = person("Иван", MOSCOW, grid(WEEKEND, LocalTime.of(16, 0), LocalTime.of(22, 0)));
    static final Participant BATYR = person("Батыр", ALMATY, grid(WEEKEND, LocalTime.of(18, 0), LocalTime.of(23, 30)));

    @Test
    void almatyIsUtcPlusFiveInOctober2026() {
        // Kazakhstan moved to a single zone (UTC+5) in 2024. If this fails,
        // the JDK's time-zone data is too old.
        assertEquals(ZoneOffset.ofHours(5), ALMATY.getRules().getOffset(Instant.parse("2026-10-15T12:00:00Z")));
        assertEquals(ZoneOffset.ofHours(5), ALMATY.getRules().getOffset(Instant.parse("2026-01-15T12:00:00Z")));
    }

    @Test
    void torontoMoscowAlmatyMeetOnSaturdayWithNobodyAsleep() {
        Poll poll = new Poll(LocalDate.of(2026, 10, 24), LocalDate.of(2026, 10, 25), ALMATY, 180, 3);
        Result r = AvailabilityCalculator.calculate(poll, List.of(ANYA, IVAN, BATYR));

        // Toronto 10-14 EDT = 14-18 UTC; Moscow 16-22 = 13-19 UTC; Almaty 18-23:30 = 13-18:30 UTC.
        // Common: 14:00-18:00 UTC, so the best 3 hours start at 14:00 UTC on Saturday.
        Window best = r.windows().get(0);
        assertEquals(Instant.parse("2026-10-24T14:00:00Z"), best.start());
        assertEquals(Instant.parse("2026-10-24T17:00:00Z"), best.end());
        assertEquals(List.of("Аня", "Иван", "Батыр"), best.available());
        for (AvailabilityCalculator.LocalSpan s : best.local()) {
            Participant p = List.of(ANYA, IVAN, BATYR).stream().filter(x -> x.id().equals(s.participantId())).findFirst().orElseThrow();
            for (LocalTime t = s.start().toLocalTime(); t.isBefore(s.end().toLocalTime()); t = t.plusMinutes(30)) {
                assertFalse(AvailabilityCalculator.asleep(t, p.sleepStart(), p.sleepEnd()), s.toString());
            }
        }
        assertEquals("2026-10-24T10:00", best.local().get(0).start().toString()); // Toronto
        assertEquals("2026-10-24T17:00", best.local().get(1).start().toString()); // Moscow
        assertEquals("2026-10-24T19:00", best.local().get(2).start().toString()); // Almaty
        // Windows never overlap.
        for (int i = 0; i < r.windows().size(); i++) {
            for (int j = i + 1; j < r.windows().size(); j++) {
                Window a = r.windows().get(i), b = r.windows().get(j);
                assertFalse(a.start().isBefore(b.end()) && b.start().isBefore(a.end()));
            }
        }
    }

    @Test
    void torontoFallBackShiftsUtcByAnHour() {
        // Fri-Sun 18:00-22:00 Toronto; clocks go back on Sunday 1 November 2026.
        Participant p = person("Аня", TORONTO, grid(Set.of(5, 6, 7), LocalTime.of(18, 0), LocalTime.of(22, 0)));
        Set<Instant> free = AvailabilityCalculator.freeSlots(p, Instant.parse("2026-10-30T00:00:00Z"), Instant.parse("2026-11-03T00:00:00Z"));
        assertTrue(free.contains(Instant.parse("2026-10-30T22:00:00Z"))); // Fri 18:00 EDT (UTC-4)
        assertTrue(free.contains(Instant.parse("2026-10-31T22:00:00Z"))); // Sat 18:00 EDT
        assertTrue(free.contains(Instant.parse("2026-11-01T23:00:00Z"))); // Sun 18:00 EST (UTC-5)
        assertFalse(free.contains(Instant.parse("2026-11-01T22:00:00Z")));
        assertEquals(3 * 8, free.size());
    }

    @Test
    void ambiguousHourGivesBothInstantsAndSkippedHourGivesNone() {
        Participant all = new Participant("x", "x", TORONTO, null, null, "1".repeat(336), List.of());
        Set<Instant> fallBack = AvailabilityCalculator.freeSlots(all, Instant.parse("2026-11-01T04:00:00Z"), Instant.parse("2026-11-01T08:00:00Z"));
        // 01:00 local happens at 05:00Z (EDT) and 06:00Z (EST).
        assertTrue(fallBack.contains(Instant.parse("2026-11-01T05:00:00Z")));
        assertTrue(fallBack.contains(Instant.parse("2026-11-01T06:00:00Z")));
        // Spring forward 8 March 2026: 02:00-02:59 does not exist; 4 hours of UTC still hold 8 slots.
        Set<Instant> spring = AvailabilityCalculator.freeSlots(all, Instant.parse("2026-03-08T05:00:00Z"), Instant.parse("2026-03-08T09:00:00Z"));
        assertEquals(8, spring.size());
    }

    @Test
    void sleepAcrossMidnightIsNeverFree() {
        Participant owl = new Participant("Сова", "Сова", MOSCOW, LocalTime.of(23, 0), LocalTime.of(7, 0), "1".repeat(336), List.of());
        Set<Instant> free = AvailabilityCalculator.freeSlots(owl, Instant.parse("2026-10-20T00:00:00Z"), Instant.parse("2026-10-21T00:00:00Z"));
        for (Instant t : free) {
            LocalTime local = t.atZone(MOSCOW).toLocalTime();
            assertFalse(!local.isBefore(LocalTime.of(23, 0)) || local.isBefore(LocalTime.of(7, 0)), local.toString());
        }
        assertTrue(free.contains(Instant.parse("2026-10-20T04:00:00Z")));  // 07:00 Moscow
        assertTrue(free.contains(Instant.parse("2026-10-20T19:30:00Z")));  // 22:30 Moscow
        assertFalse(free.contains(Instant.parse("2026-10-20T20:00:00Z"))); // 23:00 Moscow
    }

    @Test
    void busyRemovesAWindowAndFreeDoesNotPierceSleep() {
        LocalDate saturday = LocalDate.of(2026, 10, 24);
        Participant busyAnya = person("Аня", TORONTO, ANYA.grid(),
                new AvailabilityCalculator.Exception(saturday, Kind.BUSY, null, null));
        Poll poll = new Poll(saturday, saturday, ALMATY, 180, 3);
        Result r = AvailabilityCalculator.calculate(poll, List.of(busyAnya, IVAN, BATYR));
        assertTrue(r.windows().isEmpty());

        Participant night = person("Иван", MOSCOW, "0".repeat(336),
                new AvailabilityCalculator.Exception(saturday, Kind.FREE, 0, 24 * 60));
        Set<Instant> free = AvailabilityCalculator.freeSlots(night, Instant.parse("2026-10-23T21:00:00Z"), Instant.parse("2026-10-24T21:00:00Z"));
        assertEquals(32, free.size()); // 08:00-24:00 Moscow, not the 00:00-08:00 sleep
        assertFalse(free.contains(Instant.parse("2026-10-24T02:00:00Z"))); // 05:00 Moscow
    }

    @Test
    void minParticipantsBelowEveryoneFindsPartialWindows() {
        Participant late = person("Поздний", TORONTO, grid(WEEKEND, LocalTime.of(20, 0), LocalTime.of(23, 0)));
        Poll poll = new Poll(LocalDate.of(2026, 10, 24), LocalDate.of(2026, 10, 25), ALMATY, 120, 2);
        Result r = AvailabilityCalculator.calculate(poll, List.of(late, IVAN, BATYR));
        assertFalse(r.windows().isEmpty());
        Window best = r.windows().get(0);
        assertEquals(List.of("Иван", "Батыр"), best.available());
        assertEquals(List.of("Поздний"), best.unavailable());

        Result all = AvailabilityCalculator.calculate(new Poll(poll.dateFrom(), poll.dateTo(), ALMATY, 120, 3), List.of(late, IVAN, BATYR));
        assertTrue(all.windows().isEmpty());
    }

    @Test
    void participantWithoutProfileIsFlaggedAndUnavailable() {
        Participant nobody = new Participant("Новичок", "Новичок", MOSCOW, MIDNIGHT, EIGHT, null, List.of());
        Poll poll = new Poll(LocalDate.of(2026, 10, 24), LocalDate.of(2026, 10, 25), ALMATY, 180, 3);
        Result r = AvailabilityCalculator.calculate(poll, List.of(ANYA, IVAN, BATYR, nobody));
        assertEquals(List.of("Новичок"), r.withoutProfile());
        Result two = AvailabilityCalculator.calculate(new Poll(poll.dateFrom(), poll.dateTo(), ALMATY, 180, 3), List.of(ANYA, nobody));
        assertTrue(two.windows().isEmpty());
        assertEquals(96, r.heatMap().size()); // two Almaty days of half-hours
    }
}
