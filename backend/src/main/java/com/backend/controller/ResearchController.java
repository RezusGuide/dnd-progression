package com.backend.controller;

import com.backend.dto.KnownSpellResponse;
import com.backend.dto.ResearchGridRequest;
import com.backend.dto.ResearchNoteResponse;
import com.backend.dto.ResearchTopicSummary;
import com.backend.dto.ResearchTopicView;
import com.backend.entity.User;
import com.backend.service.SpellResearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * "Исследования Санни" for one character: known spells, the topic catalog,
 * the research table with its draft, research notes and combining aspects.
 * Everything except known-spells is for the character's owner or the GM
 * (SpellResearchService checks; user is null for guests on GET).
 */
@RestController
@RequestMapping("/api/characters/{characterId}")
@RequiredArgsConstructor
public class ResearchController {

    private final SpellResearchService research;

    @GetMapping("/known-spells")
    public ResponseEntity<List<KnownSpellResponse>> knownSpells(@PathVariable Long characterId) {
        return ResponseEntity.ok(research.knownSpells(characterId));
    }

    // Body: {"prepared": true}.
    @PatchMapping("/known-spells/{spellId}")
    public ResponseEntity<Void> setPrepared(@PathVariable Long characterId, @PathVariable String spellId,
                                            @RequestBody Map<String, Object> body, @AuthenticationPrincipal User user) {
        research.setPrepared(characterId, spellId, Boolean.TRUE.equals(body.get("prepared")), user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/cantrips/{spellId}")
    public ResponseEntity<Void> addCantrip(@PathVariable Long characterId, @PathVariable String spellId,
                                           @AuthenticationPrincipal User user) {
        research.addCantrip(characterId, spellId, user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/research/topics")
    public ResponseEntity<List<ResearchTopicSummary>> topics(@PathVariable Long characterId,
                                                             @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(research.topics(characterId, user));
    }

    @GetMapping("/research/topics/{spellId}")
    public ResponseEntity<ResearchTopicView> topic(@PathVariable Long characterId, @PathVariable String spellId,
                                                   @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(research.topic(characterId, spellId, user));
    }

    @PutMapping("/research/topics/{spellId}/draft")
    public ResponseEntity<Void> saveDraft(@PathVariable Long characterId, @PathVariable String spellId,
                                          @RequestBody ResearchGridRequest body, @AuthenticationPrincipal User user) {
        research.saveDraft(characterId, spellId, body.getPlaced(), user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/research/topics/{spellId}/notes")
    public ResponseEntity<ResearchNoteResponse> submit(@PathVariable Long characterId, @PathVariable String spellId,
                                                       @RequestBody ResearchGridRequest body, @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201).body(research.submit(characterId, spellId, body.getPlaced(), user));
    }

    @GetMapping("/research/notes")
    public ResponseEntity<List<ResearchNoteResponse>> notes(@PathVariable Long characterId,
                                                            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(research.notes(characterId, user));
    }

    // Body: {"a": "order", "b": "steam"} -> the bag after combining.
    @PostMapping("/aspects/combine")
    public ResponseEntity<Map<String, Integer>> combine(@PathVariable Long characterId,
                                                        @RequestBody Map<String, String> body,
                                                        @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(research.combine(characterId, body.get("a"), body.get("b"), user));
    }
}
