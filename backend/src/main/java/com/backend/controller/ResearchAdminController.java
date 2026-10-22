package com.backend.controller;

import com.backend.dto.AspectGrantRequest;
import com.backend.dto.ResearchNoteResponse;
import com.backend.entity.User;
import com.backend.service.SpellResearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Панель ГМ: the research note queue and aspect grants. /api/admin/** is
 * OWNER-only in SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class ResearchAdminController {

    private final SpellResearchService research;

    // ?status=PENDING for the open queue; anything else for recent decisions.
    @GetMapping("/research-notes")
    public ResponseEntity<List<ResearchNoteResponse>> queue(@RequestParam(defaultValue = "PENDING") String status) {
        return ResponseEntity.ok(research.queue(status));
    }

    // Body: {"gmComment": "..."}.
    @PostMapping("/research-notes/{id}/approve")
    public ResponseEntity<ResearchNoteResponse> approve(@PathVariable Long id,
                                                        @RequestBody(required = false) Map<String, Object> body,
                                                        @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(research.approve(id, comment(body), user));
    }

    @PostMapping("/research-notes/{id}/reject")
    public ResponseEntity<ResearchNoteResponse> reject(@PathVariable Long id,
                                                       @RequestBody(required = false) Map<String, Object> body,
                                                       @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(research.reject(id, comment(body), user));
    }

    // Body: {"characterId": 7, "aspect": "dawn", "amount": 2} -> the bag.
    @PostMapping("/aspects/grant")
    public ResponseEntity<Map<String, Integer>> grant(@RequestBody AspectGrantRequest request) {
        return ResponseEntity.ok(research.grant(request.getCharacterId(), request.getAspect(), request.getAmount()));
    }

    private static String comment(Map<String, Object> body) {
        return body != null && body.get("gmComment") instanceof String s ? s : null;
    }
}
