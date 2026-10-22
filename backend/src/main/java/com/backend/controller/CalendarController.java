package com.backend.controller;

import com.backend.dto.CalendarDtos.ExceptionDto;
import com.backend.dto.CalendarDtos.NewPoll;
import com.backend.dto.CalendarDtos.PollDto;
import com.backend.dto.CalendarDtos.Profile;
import com.backend.dto.CalendarDtos.SessionDto;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.service.CalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

/**
 * Календарь: own free time (/api/me/availability), session polls
 * (/api/polls) and scheduled sessions (/api/sessions). Signed-in users only
 * (SecurityConfig); CalendarService checks GM rights and participation.
 */
@RestController
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendar;

    // ?zone= the browser's zone, used as the default before a first save.
    @GetMapping("/api/me/availability")
    public ResponseEntity<Profile> myProfile(@AuthenticationPrincipal User user,
                                             @RequestParam(defaultValue = "UTC") String zone) {
        return ResponseEntity.ok(calendar.myProfile(user, zone));
    }

    @PutMapping("/api/me/availability")
    public ResponseEntity<Profile> saveProfile(@AuthenticationPrincipal User user, @RequestBody Profile body) {
        return ResponseEntity.ok(calendar.saveProfile(user, body));
    }

    @GetMapping("/api/me/availability/exceptions")
    public ResponseEntity<List<ExceptionDto>> exceptions(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(calendar.myExceptions(user));
    }

    @PostMapping("/api/me/availability/exceptions")
    public ResponseEntity<ExceptionDto> addException(@AuthenticationPrincipal User user, @RequestBody ExceptionDto body) {
        return ResponseEntity.status(201).body(calendar.saveException(user, null, body));
    }

    @PutMapping("/api/me/availability/exceptions/{id}")
    public ResponseEntity<ExceptionDto> updateException(@AuthenticationPrincipal User user, @PathVariable Long id,
                                                        @RequestBody ExceptionDto body) {
        return ResponseEntity.ok(calendar.saveException(user, id, body));
    }

    @DeleteMapping("/api/me/availability/exceptions/{id}")
    public ResponseEntity<Void> deleteException(@AuthenticationPrincipal User user, @PathVariable Long id) {
        calendar.deleteException(user, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/polls")
    public ResponseEntity<List<PollDto>> polls(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(calendar.polls(user));
    }

    @GetMapping("/api/polls/{id}")
    public ResponseEntity<PollDto> poll(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(calendar.poll(id, user));
    }

    @PostMapping("/api/polls")
    public ResponseEntity<PollDto> create(@RequestBody NewPoll body, @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201).body(calendar.create(body, user));
    }

    // Body: {"startUtc": "2026-10-24T14:00:00Z"}.
    @PostMapping("/api/polls/{id}/schedule")
    public ResponseEntity<SessionDto> schedule(@PathVariable Long id, @RequestBody Map<String, String> body,
                                               @AuthenticationPrincipal User user) {
        Instant start;
        try {
            start = Instant.parse(body.get("startUtc"));
        } catch (DateTimeParseException | NullPointerException e) {
            throw ApiException.badRequest("Время начала — в формате UTC, например 2026-10-24T14:00:00Z.");
        }
        return ResponseEntity.status(201).body(calendar.schedule(id, start, user));
    }

    @PostMapping("/api/polls/{id}/cancel")
    public ResponseEntity<PollDto> cancel(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(calendar.cancel(id, user));
    }

    @GetMapping("/api/sessions")
    public ResponseEntity<List<SessionDto>> sessions(@AuthenticationPrincipal User user,
                                                     @RequestParam(defaultValue = "false") boolean upcoming) {
        return ResponseEntity.ok(calendar.sessions(user, upcoming));
    }

    @GetMapping("/api/sessions/{id}/ics")
    public ResponseEntity<byte[]> ics(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "calendar", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"session-" + id + ".ics\"")
                .body(calendar.ics(id, user).getBytes(StandardCharsets.UTF_8));
    }
}
