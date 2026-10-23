package com.backend.controller;

import com.backend.dto.ChestRewardRequest;
import com.backend.dto.ChestRewardResponse;
import com.backend.dto.DreamDtos.CharacterDream;
import com.backend.dto.DreamDtos.DreamInput;
import com.backend.dto.DreamDtos.GmDream;
import com.backend.dto.DreamDtos.ParticipantInput;
import com.backend.dto.DreamDtos.PlayerDream;
import com.backend.entity.User;
import com.backend.service.DreamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** «Сны»: /api/dreams for players, /api/admin/dreams for the GM. */
@RestController
@RequiredArgsConstructor
public class DreamController {

    private final DreamService dreams;

    @GetMapping("/api/dreams")
    public ResponseEntity<List<PlayerDream>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dreams.list(user));
    }

    @GetMapping("/api/dreams/{id}")
    public ResponseEntity<PlayerDream> get(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dreams.get(id, user));
    }

    // The open dream a character is in now; 204 when none.
    @GetMapping("/api/dreams/by-character/{characterId}")
    public ResponseEntity<CharacterDream> current(@PathVariable Long characterId, @AuthenticationPrincipal User user) {
        return dreams.current(characterId, user).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/api/admin/dreams")
    public ResponseEntity<List<GmDream>> all() {
        return ResponseEntity.ok(dreams.all());
    }

    @GetMapping("/api/admin/dreams/{id}")
    public ResponseEntity<GmDream> one(@PathVariable Long id) {
        return ResponseEntity.ok(dreams.one(id));
    }

    @PostMapping("/api/admin/dreams")
    public ResponseEntity<GmDream> create(@RequestBody DreamInput body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dreams.create(body));
    }

    @PutMapping("/api/admin/dreams/{id}")
    public ResponseEntity<GmDream> update(@PathVariable Long id, @RequestBody DreamInput body) {
        return ResponseEntity.ok(dreams.update(id, body));
    }

    @DeleteMapping("/api/admin/dreams/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        dreams.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Body: {"outcome": "CLEARED", "rewardSummary": "..."}.
    @PostMapping("/api/admin/dreams/{id}/close")
    public ResponseEntity<GmDream> close(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(dreams.close(id, body.get("outcome"), body.get("rewardSummary")));
    }

    // Body: {"characterId": 7}.
    @PostMapping("/api/admin/dreams/{id}/participants")
    public ResponseEntity<GmDream> addParticipant(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        return ResponseEntity.ok(dreams.addParticipant(id, body.get("characterId")));
    }

    @PutMapping("/api/admin/dreams/{id}/participants/{participationId}")
    public ResponseEntity<GmDream> updateParticipant(@PathVariable Long id, @PathVariable Long participationId,
                                                     @RequestBody ParticipantInput body) {
        return ResponseEntity.ok(dreams.updateParticipant(id, participationId, body));
    }

    @DeleteMapping("/api/admin/dreams/{id}/participants/{participationId}")
    public ResponseEntity<GmDream> removeParticipant(@PathVariable Long id, @PathVariable Long participationId) {
        return ResponseEntity.ok(dreams.removeParticipant(id, participationId));
    }

    @PostMapping("/api/admin/dreams/{id}/trophy")
    public ResponseEntity<List<ChestRewardResponse>> trophy(@PathVariable Long id, @RequestBody ChestRewardRequest body,
                                                            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dreams.trophy(id, body, user));
    }
}
