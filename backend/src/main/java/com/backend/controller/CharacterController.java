package com.backend.controller;

import com.backend.dto.CharacterRequest;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.service.CharacterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/characters")
@RequiredArgsConstructor
public class CharacterController {

    private final CharacterService characterService;

    @PostMapping
    public ResponseEntity<Character> createCharacter(
            @RequestBody CharacterRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201).body(
                characterService.createCharacter(request, user.getId())
        );
    }

    @GetMapping
    public ResponseEntity<List<Character>> getCharacters() {
        return ResponseEntity.ok(characterService.getCharacters());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Character> getCharacter(@PathVariable Long id) {
        return ResponseEntity.ok(characterService.getCharacter(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCharacter(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        characterService.deleteCharacter(id, user.getId());
        return ResponseEntity.noContent().build();
    }
    @PatchMapping("/{id}/materials")
    public ResponseEntity<Character> updateMaterials(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(characterService.updateMaterials(id, body.get("materials"), user.getId()));
    }
}