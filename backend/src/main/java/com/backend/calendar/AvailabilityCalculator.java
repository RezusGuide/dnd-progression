package com.backend.calendar;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * «Подбор сессии» (prompts/08-calendar.md, section 2). Everyone marks free
 * time once, in their own local time; this finds windows when enough people
 * are free and nobody is asleep. No Spring, no database: plain inputs in,
 * windows and a heat map out.
 *
 * Time is cut into half-hours. A participant's local half-hour becomes a
 * UTC instant through the zone rules: a time skipped by a daylight-saving
 * jump is dropped, a time that happens twice gives both instants.
 */
public final class AvailabilityCalculator {

    public static final int SLOTS_PER_DAY = 48;
    public static final int GRID_LENGTH = 7 * SLOTS_PER_DAY;
    public static final Duration HALF_HOUR = Duration.ofMinutes(30);
    public static final int MAX_WINDOWS = 10;

    // Score: +100 per available participant, -5 per inconvenient half-hour
    // (local time before 09:00 or from 23:00) per participant, -1 per day
    // from the start of the range.
    static final int PER_PARTICIPANT = 100;
    static final int PER_INCONVENIENT = 5;
    static final int PER_DAY = 1;
    static final LocalTime EARLY = LocalTime.of(9, 0);
    static final LocalTime LATE = LocalTime.of(23, 0);

    public enum Kind { BUSY, FREE }

    /** A day off the weekly grid; null minutes = the whole local day. */
    public record Exception(LocalDate date, Kind kind, Integer startMinute, Integer endMinute) {
    }

    /**
     * grid: 336 characters '0'/'1', Monday 00:00 local first, half-hour
     * steps; null when the person has not filled in the schedule.
     */
    public record Participant(String id, String name, ZoneId zone, LocalTime sleepStart, LocalTime sleepEnd,
                              String grid, List<Exception> exceptions) {
        public boolean hasProfile() {
            return grid != null && grid.length() == GRID_LENGTH;
        }
    }

    /** The poll: local dates in the GM's zone, both ends included. */
    public record Poll(LocalDate dateFrom, LocalDate dateTo, ZoneId gmZone, int durationMinutes, int minParticipants) {
    }

    public record LocalSpan(String participantId, String name, ZoneId zone, LocalDateTime start, LocalDateTime end,
                            boolean inconvenient) {
    }

    public record Window(Instant start, Instant end, int score, List<String> available, List<String> unavailable,
                         List<LocalSpan> local) {
    }

    public record HeatCell(Instant start, List<String> free) {
    }

    public record Result(List<Window> windows, List<HeatCell> heatMap, List<String> withoutProfile) {
    }

    private AvailabilityCalculator() {
    }

    // ── Range ──

    public static Instant rangeStart(Poll poll) {
        return poll.dateFrom().atStartOfDay(poll.gmZone()).toInstant();
    }

    public static Instant rangeEnd(Poll poll) {
        return poll.dateTo().plusDays(1).atStartOfDay(poll.gmZone()).toInstant();
    }

    // ── One participant ──

    static boolean asleep(LocalTime t, LocalTime sleepStart, LocalTime sleepEnd) {
        if (sleepStart == null || sleepEnd == null || sleepStart.equals(sleepEnd)) return false;
        return sleepStart.isBefore(sleepEnd)
                ? !t.isBefore(sleepStart) && t.isBefore(sleepEnd)
                : !t.isBefore(sleepStart) || t.isBefore(sleepEnd); // across midnight
    }

    /** Every UTC instant this local time happens at: none in a DST gap, two in an overlap. */
    static List<Instant> instantsOf(LocalDateTime local, ZoneId zone) {
        List<Instant> out = new ArrayList<>();
        for (ZoneOffset offset : zone.getRules().getValidOffsets(local)) {
            out.add(ZonedDateTime.ofLocal(local, zone, offset).toInstant());
        }
        return out;
    }

    private static boolean inSpan(Exception e, int minute) {
        if (e.startMinute() == null || e.endMinute() == null) return true;
        return minute >= e.startMinute() && minute < e.endMinute();
    }

    /** Free half-hours (their UTC starts) inside [from, to). */
    public static Set<Instant> freeSlots(Participant p, Instant from, Instant to) {
        Set<Instant> out = new TreeSet<>();
        if (!p.hasProfile()) return out;
        LocalDate first = from.atZone(p.zone()).toLocalDate().minusDays(1);
        LocalDate last = to.atZone(p.zone()).toLocalDate().plusDays(1);
        List<Exception> exceptions = p.exceptions() == null ? List.of() : p.exceptions();
        for (LocalDate date = first; !date.isAfter(last); date = date.plusDays(1)) {
            int day = date.getDayOfWeek().getValue() - DayOfWeek.MONDAY.getValue();
            for (int slot = 0; slot < SLOTS_PER_DAY; slot++) {
                LocalTime time = LocalTime.of(slot / 2, (slot % 2) * 30);
                if (asleep(time, p.sleepStart(), p.sleepEnd())) continue;
                int minute = slot * 30;
                boolean free = p.grid().charAt(day * SLOTS_PER_DAY + slot) == '1';
                for (Exception e : exceptions) {
                    if (e.date().equals(date) && e.kind() == Kind.FREE && inSpan(e, minute)) free = true;
                }
                for (Exception e : exceptions) {
                    if (e.date().equals(date) && e.kind() == Kind.BUSY && inSpan(e, minute)) free = false;
                }
                if (!free) continue;
                for (Instant instant : instantsOf(LocalDateTime.of(date, time), p.zone())) {
                    if (!instant.isBefore(from) && instant.isBefore(to)) out.add(instant);
                }
            }
        }
        return out;
    }

    // ── The poll ──

    public static Result calculate(Poll poll, List<Participant> participants) {
        Instant from = rangeStart(poll);
        Instant to = rangeEnd(poll);
        int slots = Math.max(1, poll.durationMinutes() / 30);
        int needed = Math.max(1, Math.min(poll.minParticipants() <= 0 ? participants.size() : poll.minParticipants(),
                participants.size()));

        Map<String, Set<Instant>> free = new LinkedHashMap<>();
        List<String> withoutProfile = new ArrayList<>();
        for (Participant p : participants) {
            free.put(p.id(), freeSlots(p, from, to));
            if (!p.hasProfile()) withoutProfile.add(p.id());
        }

        // Heat map: who is free in every half-hour of the range.
        List<HeatCell> heat = new ArrayList<>();
        for (Instant t = from; t.isBefore(to); t = t.plus(HALF_HOUR)) {
            List<String> ids = new ArrayList<>();
            for (Participant p : participants) if (free.get(p.id()).contains(t)) ids.add(p.id());
            heat.add(new HeatCell(t, List.copyOf(ids)));
        }

        // Candidates: every 30-minute start whose whole length fits.
        List<Window> candidates = new ArrayList<>();
        for (Instant t = from; !t.plus(HALF_HOUR.multipliedBy(slots)).isAfter(to); t = t.plus(HALF_HOUR)) {
            List<String> available = new ArrayList<>();
            List<String> unavailable = new ArrayList<>();
            for (Participant p : participants) {
                boolean all = true;
                for (int k = 0; k < slots && all; k++) all = free.get(p.id()).contains(t.plus(HALF_HOUR.multipliedBy(k)));
                (all ? available : unavailable).add(p.id());
            }
            if (available.size() < needed) continue;

            Instant end = t.plus(HALF_HOUR.multipliedBy(slots));
            int score = PER_PARTICIPANT * available.size();
            List<LocalSpan> local = new ArrayList<>();
            for (Participant p : participants) {
                int inconvenient = 0;
                for (int k = 0; k < slots; k++) {
                    LocalTime lt = t.plus(HALF_HOUR.multipliedBy(k)).atZone(p.zone()).toLocalTime();
                    if (lt.isBefore(EARLY) || !lt.isBefore(LATE)) inconvenient++;
                }
                if (available.contains(p.id())) score -= PER_INCONVENIENT * inconvenient;
                local.add(new LocalSpan(p.id(), p.name(), p.zone(),
                        LocalDateTime.ofInstant(t, p.zone()), LocalDateTime.ofInstant(end, p.zone()), inconvenient > 0));
            }
            score -= PER_DAY * (int) Duration.between(from, t).toDays();
            candidates.add(new Window(t, end, score, List.copyOf(available), List.copyOf(unavailable), List.copyOf(local)));
        }

        // Greedy: best first, drop everything overlapping it, repeat.
        candidates.sort(Comparator.comparingInt(Window::score).reversed().thenComparing(Window::start));
        List<Window> picked = new ArrayList<>();
        for (Window w : candidates) {
            if (picked.size() == MAX_WINDOWS) break;
            boolean overlaps = picked.stream().anyMatch(x -> w.start().isBefore(x.end()) && x.start().isBefore(w.end()));
            if (!overlaps) picked.add(w);
        }
        return new Result(List.copyOf(picked), List.copyOf(heat), List.copyOf(withoutProfile));
    }

    // ── Grid helpers ──

    /** A grid with the given local hours free on the given days (1 = Monday). */
    public static String grid(Set<Integer> days, LocalTime from, LocalTime to) {
        StringBuilder sb = new StringBuilder("0".repeat(GRID_LENGTH));
        for (int day : days) {
            for (int slot = 0; slot < SLOTS_PER_DAY; slot++) {
                LocalTime t = LocalTime.of(slot / 2, (slot % 2) * 30);
                if (!t.isBefore(from) && t.isBefore(to)) sb.setCharAt((day - 1) * SLOTS_PER_DAY + slot, '1');
            }
        }
        return sb.toString();
    }
}
