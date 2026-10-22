package com.backend.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * What the calendar API sends and takes. Other people's weekly grids are
 * never here: participants carry only a name and a time zone.
 */
public final class CalendarDtos {

    private CalendarDtos() {
    }

    /** /api/me/availability. exists=false (with defaults) until saved once. */
    public record Profile(boolean exists, String timezone, String sleepStart, String sleepEnd, String weeklyGrid,
                          LocalDateTime updatedAt) {
    }

    /** startMinute/endMinute null = the whole local day. */
    public record ExceptionDto(Long id, LocalDate date, String kind, Integer startMinute, Integer endMinute) {
    }

    public record Person(Long userId, String username, String timezone, boolean hasProfile) {
    }

    public record LocalTimeSpan(Long userId, String username, String timezone, LocalDateTime start, LocalDateTime end,
                                boolean inconvenient) {
    }

    public record WindowDto(Instant startUtc, Instant endUtc, int score, List<Long> available, List<Long> unavailable,
                            List<LocalTimeSpan> local) {
    }

    public record HeatCellDto(Instant startUtc, List<Long> free) {
    }

    public record PollDto(Long id, String title, Long campaignId, String campaignName, LocalDate dateFrom, LocalDate dateTo,
                          String gmTimezone, int durationMinutes, int minParticipants, String status, String createdBy,
                          LocalDateTime createdAt, List<Person> participants, Long sessionId,
                          // Only in GET /api/polls/{id}:
                          List<WindowDto> windows, List<HeatCellDto> heatMap, List<Long> withoutProfile) {
    }

    public record NewPoll(String title, Long campaignId, List<Long> participantIds, LocalDate dateFrom, LocalDate dateTo,
                          String gmTimezone, Integer durationMinutes, Integer minParticipants) {
    }

    public record SessionDto(Long id, String title, Instant startUtc, int durationMinutes, Long pollId, Long campaignId,
                             String campaignName, String note, String createdBy) {
    }
}
