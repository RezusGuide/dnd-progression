package com.backend.controller;

import com.backend.dto.*;
import com.backend.model.GridAnchor;
import com.backend.service.ResearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Spell list, material pouch reads live on Character itself (GET
 * /api/characters/{id} already returns the aspects map) and CharacterController;
 * this controller covers everything else: known spells, hint-gated pattern
 * reveal, cantrip unlocking, research attempts, and draft autosave. All
 * paths sit under /api/characters/** so SecurityConfig's existing rules
 * apply unchanged - GET is public, everything else needs to be signed in.
 */
@RestController
@RequestMapping("/api/characters/{characterId}")
@RequiredArgsConstructor
public class ResearchController {

    private final ResearchService researchService;

    @GetMapping("/known-spells")
    public ResponseEntity<List<KnownSpellResponse>> getKnownSpells(@PathVariable Long characterId) {
        return ResponseEntity.ok(researchService.getKnownSpells(characterId));
    }

    @GetMapping("/hinted-spells")
    public ResponseEntity<List<SpellSummary>> getHintedSpells(@PathVariable Long characterId) {
        return ResponseEntity.ok(researchService.getHintedSpells(characterId));
    }

    @GetMapping("/research/{spellId}/pattern")
    public ResponseEntity<List<GridAnchor>> getPattern(@PathVariable Long characterId, @PathVariable String spellId) {
        return ResponseEntity.ok(researchService.getPattern(characterId, spellId));
    }

    @GetMapping("/research/{spellId}/draft")
    public ResponseEntity<String> getDraft(@PathVariable Long characterId, @PathVariable String spellId) {
        return ResponseEntity.ok(researchService.getDraftState(characterId, spellId));
    }

    @PutMapping("/research/{spellId}/draft")
    public ResponseEntity<Void> saveDraft(
            @PathVariable Long characterId,
            @PathVariable String spellId,
            @RequestBody SaveDraftRequest request) {
        researchService.saveDraftState(characterId, spellId, request.getGridState());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/research/attempt")
    public ResponseEntity<ResearchAttemptResponse> attemptResearch(
            @PathVariable Long characterId,
            @RequestBody ResearchAttemptRequest request) {
        return ResponseEntity.ok(researchService.attemptResearch(characterId, request));
    }

    @PostMapping("/cantrips/{spellId}")
    public ResponseEntity<Void> unlockCantrip(@PathVariable Long characterId, @PathVariable String spellId) {
        researchService.unlockCantrip(characterId, spellId);
        return ResponseEntity.ok().build();
    }
}
