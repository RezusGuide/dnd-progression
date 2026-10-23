package com.backend.controller;

import com.backend.dto.ChestRewardResponse;
import com.backend.dto.InventoryItemResponse;
import com.backend.entity.User;
import com.backend.service.ChestService;
import com.backend.service.ChestService.OpenOutcome;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Сундучок for the character's owner (or the GM): rewards, opening, the
 * inventory. ChestService checks ownership; user is null for guests on GET.
 */
@RestController
@RequiredArgsConstructor
public class ChestController {

    private final ChestService chest;

    @GetMapping("/api/characters/{characterId}/chest")
    public ResponseEntity<List<ChestRewardResponse>> chest(@PathVariable Long characterId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chest.chest(characterId, user));
    }

    // Sealed rewards per own character, for badges: {"7": 2}.
    @GetMapping("/api/chest/mine")
    public ResponseEntity<Map<Long, Long>> mine(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chest.sealedCounts(user));
    }

    // Body (optional): {"answer": "..."}. 200 with the opened reward; 409
    // {bitten: true, penalty, lockedUntil, lockSeconds, hpCurrent} on a wrong
    // answer; 423 {locked: true, lockedUntil, lockSeconds} while locked.
    @PostMapping("/api/characters/{characterId}/chest/{rewardId}/open")
    public ResponseEntity<?> open(@PathVariable Long characterId, @PathVariable Long rewardId,
                                  @RequestBody(required = false) Map<String, Object> body,
                                  @AuthenticationPrincipal User user) {
        String answer = body != null && body.get("answer") instanceof String s ? s : null;
        OpenOutcome outcome = chest.open(characterId, rewardId, answer, user);
        return switch (outcome.kind()) {
            case OPENED -> ResponseEntity.ok(outcome.reward());
            case BITTEN -> {
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("bitten", true);
                out.put("message", "Сундучок укусил: ответ неверный.");
                out.put("penalty", outcome.penalty());
                out.put("lockedUntil", outcome.lockedUntil());
                out.put("lockSeconds", outcome.lockSeconds());
                out.put("hpCurrent", outcome.hpCurrent());
                out.put("spared", outcome.spared());
                yield ResponseEntity.status(HttpStatus.CONFLICT).body(out);
            }
            case LOCKED -> {
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("locked", true);
                out.put("message", "Сундучок обиделся. Попробуйте позже.");
                out.put("lockedUntil", outcome.lockedUntil());
                out.put("lockSeconds", outcome.lockSeconds());
                yield ResponseEntity.status(HttpStatus.LOCKED).body(out);
            }
        };
    }

    @GetMapping("/api/characters/{characterId}/inventory")
    public ResponseEntity<List<InventoryItemResponse>> inventory(@PathVariable Long characterId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chest.inventory(characterId, user));
    }

    // Body: {"notes": "...", "quantity": 2} - quantity only goes down; 0 removes the item (204).
    @PatchMapping("/api/characters/{characterId}/inventory/{itemId}")
    public ResponseEntity<InventoryItemResponse> patchItem(@PathVariable Long characterId, @PathVariable Long itemId,
                                                           @RequestBody Map<String, Object> body,
                                                           @AuthenticationPrincipal User user) {
        String notes = body.get("notes") instanceof String s ? s : null;
        Integer quantity = body.get("quantity") instanceof Number n ? n.intValue() : null;
        InventoryItemResponse item = chest.patchItem(characterId, itemId, notes, quantity, user);
        return item == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(item);
    }

    // «Разобрать на аспекты»: {"aspects": {...}, "item": the rest or null}.
    @PostMapping("/api/characters/{characterId}/inventory/{itemId}/disassemble")
    public ResponseEntity<ChestService.Disassembled> disassemble(@PathVariable Long characterId, @PathVariable Long itemId,
                                                                 @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chest.disassemble(characterId, itemId, user));
    }

    @DeleteMapping("/api/characters/{characterId}/inventory/{itemId}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long characterId, @PathVariable Long itemId,
                                           @AuthenticationPrincipal User user) {
        chest.deleteItem(characterId, itemId, user);
        return ResponseEntity.noContent().build();
    }
}
