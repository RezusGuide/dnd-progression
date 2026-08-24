package com.backend.controller;

import com.backend.dto.CompleteResearchRequest;
import com.backend.dto.ResearchOutcomeResponse;
import com.backend.dto.SaveDraftRequest;
import com.backend.service.SpellResearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/characters/{characterId}/research/{spellId}")
@RequiredArgsConstructor
public class SpellResearchController {

    private final SpellResearchService researchService;

    @GetMapping("/draft")
    public ResponseEntity<String> getDraft(
            @PathVariable Long characterId,
            @PathVariable String spellId) {
        return ResponseEntity.ok(researchService.getDraftState(characterId, spellId));
    }

    @PutMapping("/draft")
    public ResponseEntity<Void> saveDraft(
            @PathVariable Long characterId,
            @PathVariable String spellId,
            @RequestBody SaveDraftRequest request) {
        researchService.saveDraftState(characterId, spellId, request.getGridState());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/complete")
    public ResponseEntity<ResearchOutcomeResponse> completeResearch(
            @PathVariable Long characterId,
            @PathVariable String spellId,
            @RequestBody CompleteResearchRequest request) {
        ResearchOutcomeResponse outcome = researchService.evaluateAndComplete(
                characterId, spellId, request.getFinalGridState()
        );
        return ResponseEntity.ok(outcome);
    }

    @PostMapping("/cantrips")
    public ResponseEntity<Void> unlockCantrip(
            @PathVariable Long characterId,
            @PathVariable String spellId) {
        researchService.unlockCantrip(characterId, spellId);
        return ResponseEntity.ok().build();
    }
}