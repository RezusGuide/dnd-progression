package com.backend.controller;

import com.backend.dto.AuthResponse;
import com.backend.dto.LoginRequest;
import com.backend.dto.ResetPasswordRequest;
import com.backend.entity.User;
import com.backend.service.AuthService;
import com.backend.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// No public /register endpoint on purpose - every account is created by
// the owner from /admin (see AdminController.createUser), who hands the
// login to whoever it's for directly. Self-registration would let anyone
// grant themselves standard access.
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RoleService roleService;

    // Public: tells the frontend whether first-time GM setup is still open
    // (/admin?setup=1). Exposes nothing but this one flag.
    @GetMapping("/setup-status")
    public ResponseEntity<Map<String, Boolean>> setupStatus() {
        return ResponseEntity.ok(Map.of("ownerExists", roleService.ownerExists()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    // Lets the frontend re-fetch a fresh token + current roles/sections on
    // app load, instead of trusting whatever was cached in localStorage
    // (roles can change server-side after the user last logged in).
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.me(user.getId()));
    }

    // Requires being logged in already (see SecurityConfig - this specific
    // path is carved out of the otherwise-permitAll /api/auth/** prefix).
    // Generating a new code invalidates any old one - only ever one live
    // code per account.
    @PostMapping("/recovery-code")
    public ResponseEntity<Map<String, String>> generateRecoveryCode(@AuthenticationPrincipal User user) {
        String code = authService.generateRecoveryCode(user.getId());
        return ResponseEntity.ok(Map.of("recoveryCode", code));
    }

    // Public on purpose - this IS the "I'm locked out" path, so it can't
    // require being logged in. Safety comes from the recovery code itself
    // (single-use, bcrypt-hashed, generated ahead of time by the account
    // holder), not from an auth check here.
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@RequestBody ResetPasswordRequest request) {
        authService.resetPasswordWithRecoveryCode(request.getEmail(), request.getRecoveryCode(), request.getNewPassword());
        return ResponseEntity.ok().build();
    }
}
