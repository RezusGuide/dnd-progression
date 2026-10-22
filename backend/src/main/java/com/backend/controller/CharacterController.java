package com.backend.controller;

import com.backend.dto.AdmissionRequestResponse;
import com.backend.dto.CharacterCreateRequest;
import com.backend.dto.CharacterSheetRequest;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.service.AdmissionService;
import com.backend.service.CharacterCreationService;
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
    private final CharacterCreationService creationService;
    private final AdmissionService admissionService;

    // The wizard: creates a PENDING character plus a CREATION request.
    @PostMapping
    public ResponseEntity<Character> createCharacter(
            @RequestBody CharacterCreateRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(201).body(creationService.create(request, user.getId()));
    }

    // Browse/list is scoped to the caller (own characters only, or
    // everything for the GM) - see CharacterService#getCharacters. user is
    // nullable here: this path is still permitAll.
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

    // Full-sheet autosave. Owner-only (creator, or the GM) - see
    // CharacterService#updateSheet, which also ignores GM-only fields.
    @PutMapping("/{id}/sheet")
    public ResponseEntity<Character> updateSheet(
            @PathVariable Long id,
            @RequestBody CharacterSheetRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(characterService.updateSheet(id, request, user.getId(), AdmissionService.isGm(user)));
    }

    // Requests for this character - owner or GM only, otherwise an empty list.
    @GetMapping("/{id}/requests")
    public ResponseEntity<List<AdmissionRequestResponse>> requests(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(admissionService.forCharacter(id, user));
    }

    // Body (optional): {"requestedLevel": 6, "playerComment": "..."}.
    @PostMapping("/{id}/level-up-request")
    public ResponseEntity<AdmissionRequestResponse> requestLevelUp(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal User user) {
        Integer level = body != null && body.get("requestedLevel") instanceof Number n ? n.intValue() : null;
        String comment = body != null && body.get("playerComment") instanceof String s ? s : null;
        return ResponseEntity.status(201).body(admissionService.requestLevelUp(id, level, comment, user));
    }
}
