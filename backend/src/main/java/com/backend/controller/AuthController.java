package com.backend.controller;

import com.backend.dto.AuthResponse;
import com.backend.dto.LoginRequest;
import com.backend.entity.User;
import com.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// No public /register endpoint on purpose - every account is created by
// the owner from /admin (see AdminController.createUser), who hands the
// login to whoever it's for directly. Self-registration would let anyone
// grant themselves standard access.
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

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
}
