package com.backend.controller;

import com.backend.dto.ItemGrantRequest;
import com.backend.dto.MaterialGrantRequest;
import com.backend.entity.Character;
import com.backend.entity.Role;
import com.backend.entity.User;
import com.backend.service.CharacterService;
import com.backend.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Owner-only role & user management. Locked down entirely in
 * SecurityConfig (requires the OWNER role) except /bootstrap-owner, which
 * only needs to be authenticated - and only works once, before any owner
 * exists.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final RoleService roleService;
    private final CharacterService characterService;

    @PostMapping("/bootstrap-owner")
    public ResponseEntity<User> bootstrapOwner(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(roleService.bootstrapOwner(user.getId()));
    }

    @GetMapping("/roles")
    public ResponseEntity<List<Role>> listRoles() {
        return ResponseEntity.ok(roleService.listRoles());
    }

    @PostMapping("/roles")
    public ResponseEntity<Role> createRole(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> sections = (List<String>) body.getOrDefault("sections", List.of());
        Role role = roleService.createRole(
                (String) body.get("key"),
                (String) body.get("label"),
                (String) body.get("description"),
                sections
        );
        return ResponseEntity.status(201).body(role);
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> listUsers() {
        return ResponseEntity.ok(roleService.listUsers());
    }

    @PostMapping("/users/{userId}/roles/{roleKey}")
    public ResponseEntity<User> assignRole(@PathVariable Long userId, @PathVariable String roleKey) {
        return ResponseEntity.ok(roleService.assignRole(userId, roleKey));
    }

    @DeleteMapping("/users/{userId}/roles/{roleKey}")
    public ResponseEntity<User> revokeRole(@PathVariable Long userId, @PathVariable String roleKey) {
        return ResponseEntity.ok(roleService.revokeRole(userId, roleKey));
    }

    /**
     * Owner hands a friend a login directly instead of them registering
     * themselves. Gets the standard MEMBER access (dnd) like
     * any other account.
     */
    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody Map<String, String> body) {
        User user = roleService.createAccount(body.get("username"), body.get("email"), body.get("password"));
        return ResponseEntity.status(201).body(user);
    }

    @PutMapping("/users/{userId}/password")
    public ResponseEntity<User> resetPassword(@PathVariable Long userId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(roleService.resetPassword(userId, body.get("password")));
    }

    // ── DM-only grants: items and materials. Additive only - no player-facing
    // endpoint can add equipment on the DM's behalf. Aspect grants live in
    // ResearchAdminController. ──

    @PostMapping("/items/grant")
    public ResponseEntity<Character> grantItem(@RequestBody ItemGrantRequest request) {
        return ResponseEntity.ok(characterService.grantItem(request.getCharacterId(), request.getItem()));
    }

    @PostMapping("/materials/grant")
    public ResponseEntity<Character> grantMaterial(@RequestBody MaterialGrantRequest request) {
        return ResponseEntity.ok(characterService.grantMaterial(request.getCharacterId(), request.getMaterial()));
    }
}
