package com.backend.controller;

import com.backend.dto.CharacterRequest;
import com.backend.dto.CharacterSheetRequest;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.service.CharacterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    // Browse/list is scoped to the caller now (own characters only, or
    // everything for the DM) - see CharacterService#getCharacters. user is
    // nullable here: this path is still permitAll, an anonymous request
    // just arrives with no principal.
    @GetMapping
    public ResponseEntity<List<Character>> getCharacters(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(characterService.getCharacters(user));
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
    // Full-sheet autosave. Owner-only (creator, or an OWNER-role/DM
    // account) - see CharacterService#updateSheet.
    @PutMapping("/{id}/sheet")
    public ResponseEntity<Character> updateSheet(
            @PathVariable Long id,
            @RequestBody CharacterSheetRequest request,
            @AuthenticationPrincipal User user) {
        boolean isOwner = user.getSectionKeys().contains("*");
        return ResponseEntity.ok(characterService.updateSheet(id, request, user.getId(), isOwner));
    }
}