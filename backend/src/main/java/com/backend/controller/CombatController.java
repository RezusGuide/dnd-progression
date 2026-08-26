package com.backend.controller;

import com.backend.dto.AddCombatantRequest;
import com.backend.dto.CombatEncounterResponse;
import com.backend.dto.UpdateCombatantRequest;
import com.backend.service.CombatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Initiative tracker for a campaign. Sits under /api/campaigns/** so
 * SecurityConfig's existing rule applies unchanged - GET is public,
 * everything else needs any signed-in account (same "no DM role, just a
 * login" model as the rest of the D&D area).
 */
@RestController
@RequestMapping("/api/campaigns/{campaignId}/combat")
@RequiredArgsConstructor
public class CombatController {

    private final CombatService combatService;

    @GetMapping
    public ResponseEntity<CombatEncounterResponse> getEncounter(@PathVariable Long campaignId) {
        return ResponseEntity.ok(combatService.getEncounter(campaignId));
    }

    @PostMapping("/combatants")
    public ResponseEntity<CombatEncounterResponse> addCombatant(
            @PathVariable Long campaignId,
            @RequestBody AddCombatantRequest request) {
        return ResponseEntity.ok(combatService.addCombatant(campaignId, request));
    }

    @PutMapping("/combatants/{combatantId}")
    public ResponseEntity<CombatEncounterResponse> updateCombatant(
            @PathVariable Long campaignId,
            @PathVariable String combatantId,
            @RequestBody UpdateCombatantRequest request) {
        return ResponseEntity.ok(combatService.updateCombatant(campaignId, combatantId, request));
    }

    @DeleteMapping("/combatants/{combatantId}")
    public ResponseEntity<CombatEncounterResponse> removeCombatant(
            @PathVariable Long campaignId,
            @PathVariable String combatantId) {
        return ResponseEntity.ok(combatService.removeCombatant(campaignId, combatantId));
    }

    @PostMapping("/start")
    public ResponseEntity<CombatEncounterResponse> startEncounter(@PathVariable Long campaignId) {
        return ResponseEntity.ok(combatService.startEncounter(campaignId));
    }

    @PostMapping("/next-turn")
    public ResponseEntity<CombatEncounterResponse> nextTurn(@PathVariable Long campaignId) {
        return ResponseEntity.ok(combatService.nextTurn(campaignId));
    }

    @PostMapping("/reset")
    public ResponseEntity<CombatEncounterResponse> resetEncounter(@PathVariable Long campaignId) {
        return ResponseEntity.ok(combatService.resetEncounter(campaignId));
    }
}
