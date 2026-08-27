package com.backend.controller;

import com.backend.dto.*;
import com.backend.entity.User;
import com.backend.model.GridAnchor;
import com.backend.service.ResearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
            @RequestBody SaveDraftRequest request,
            @AuthenticationPrincipal User user) {
        researchService.saveDraftState(characterId, spellId, request.getGridState(), user.getId(), isOwner(user));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/research/attempt")
    public ResponseEntity<ResearchAttemptResponse> attemptResearch(
            @PathVariable Long characterId,
            @RequestBody ResearchAttemptRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(researchService.attemptResearch(characterId, request, user.getId(), isOwner(user)));
    }

    @PostMapping("/cantrips/{spellId}")
    public ResponseEntity<Void> unlockCantrip(
            @PathVariable Long characterId,
            @PathVariable String spellId,
            @AuthenticationPrincipal User user) {
        researchService.unlockCantrip(characterId, spellId, user.getId(), isOwner(user));
        return ResponseEntity.ok().build();
    }

    // Aspect crafting - a separate minigame from research (combining two
    // held aspects per AspectRecipe), not gated by hint access or level.
    @PostMapping("/aspects/craft")
    public ResponseEntity<AspectCraftResponse> craftAspect(
            @PathVariable Long characterId,
            @RequestBody AspectCraftRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(researchService.craftAspect(characterId, request, user.getId(), isOwner(user)));
    }

    // The DM (OWNER role) can act on any character, not just their own -
    // same override CharacterController#updateSheet uses.
    private boolean isOwner(User user) {
        return user.getSectionKeys().contains("*");
    }
}
