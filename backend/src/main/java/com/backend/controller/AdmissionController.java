package com.backend.controller;

import com.backend.dto.AdmissionRequestResponse;
import com.backend.entity.User;
import com.backend.service.AdmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admission requests: the player's own list, and the GM's queue with
 * approve / reject. /api/admin/** is OWNER-only in SecurityConfig.
 */
@RestController
@RequiredArgsConstructor
public class AdmissionController {

    private final AdmissionService admissionService;

    @GetMapping("/api/requests/mine")
    public ResponseEntity<List<AdmissionRequestResponse>> mine(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(admissionService.mine(user));
    }

    // ?status=PENDING for the open queue; anything else for recent decisions.
    @GetMapping("/api/admin/requests")
    public ResponseEntity<List<AdmissionRequestResponse>> list(@RequestParam(defaultValue = "PENDING") String status) {
        return ResponseEntity.ok(admissionService.list(status));
    }

    // Body: {"gmComment": "...", "confirmRune": true}.
    @PostMapping("/api/admin/requests/{id}/approve")
    public ResponseEntity<AdmissionRequestResponse> approve(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal User user) {
        String comment = body != null && body.get("gmComment") instanceof String s ? s : null;
        boolean confirmRune = body != null && Boolean.TRUE.equals(body.get("confirmRune"));
        return ResponseEntity.ok(admissionService.approve(id, comment, confirmRune, user));
    }

    @PostMapping("/api/admin/requests/{id}/reject")
    public ResponseEntity<AdmissionRequestResponse> reject(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal User user) {
        String comment = body != null && body.get("gmComment") instanceof String s ? s : null;
        return ResponseEntity.ok(admissionService.reject(id, comment, user));
    }
}
