package com.backend.controller;

import com.backend.dto.ChestContents;
import com.backend.dto.ChestRewardRequest;
import com.backend.dto.ChestRewardResponse;
import com.backend.dto.InventoryItemResponse;
import com.backend.entity.ItemTemplate;
import com.backend.entity.User;
import com.backend.service.ChestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Панель ГМ → «Сундучок»: sending rewards, the sent list, the item library
 * and direct inventory edits. /api/admin/** is OWNER-only in SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class ChestAdminController {

    private final ChestService chest;

    @PostMapping("/chest")
    public ResponseEntity<List<ChestRewardResponse>> send(@RequestBody ChestRewardRequest request, @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201).body(chest.send(request, user));
    }

    // ?status=SEALED | OPENED, anything else for all.
    @GetMapping("/chest")
    public ResponseEntity<List<ChestRewardResponse>> sent(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(chest.sent(status));
    }

    @DeleteMapping("/chest/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        chest.deleteReward(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/item-templates")
    public ResponseEntity<List<ItemTemplate>> templates() {
        return ResponseEntity.ok(chest.templates());
    }

    @PostMapping("/item-templates")
    public ResponseEntity<ItemTemplate> createTemplate(@RequestBody ItemTemplate body) {
        return ResponseEntity.status(201).body(chest.saveTemplate(null, body));
    }

    @PutMapping("/item-templates/{id}")
    public ResponseEntity<ItemTemplate> updateTemplate(@PathVariable Long id, @RequestBody ItemTemplate body) {
        return ResponseEntity.ok(chest.saveTemplate(id, body));
    }

    @DeleteMapping("/item-templates/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        chest.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    // Body: {name, description, rarity, origin, quantity}.
    @PostMapping("/characters/{characterId}/inventory")
    public ResponseEntity<InventoryItemResponse> addItem(@PathVariable Long characterId, @RequestBody ChestContents.Item body) {
        return ResponseEntity.status(201).body(chest.gmAddItem(characterId, body));
    }

    @PutMapping("/inventory/{itemId}")
    public ResponseEntity<InventoryItemResponse> updateItem(@PathVariable Long itemId, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(chest.gmUpdateItem(itemId, body));
    }

    @DeleteMapping("/inventory/{itemId}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long itemId) {
        chest.gmDeleteItem(itemId);
        return ResponseEntity.noContent().build();
    }
}
