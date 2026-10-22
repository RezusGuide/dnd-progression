package com.backend.controller;

import com.backend.service.OptionsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * The GM's "Справочник": race / class statuses and unlock conditions.
 * /api/admin/** is OWNER-only in SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class OptionsController {

    private final OptionsService optionsService;

    @GetMapping("/options")
    public ResponseEntity<Map<String, Object>> options() {
        return ResponseEntity.ok(optionsService.adminView());
    }

    // Body: {"status": "allowed"}.
    @PutMapping("/options/{kind}/{key}")
    public ResponseEntity<Map<String, Object>> setStatus(
            @PathVariable String kind,
            @PathVariable String key,
            @RequestBody Map<String, Object> body) {
        String status = body.get("status") instanceof String s ? s : null;
        return ResponseEntity.ok(optionsService.setStatus(kind, key, status));
    }

    // Body: {"unlocked": true, "gmLabel": "..."} - either field may be left out.
    @PutMapping("/unlock-flags/{key}")
    public ResponseEntity<Map<String, Object>> setFlag(
            @PathVariable String key,
            @RequestBody Map<String, Object> body) {
        Boolean unlocked = body.get("unlocked") instanceof Boolean b ? b : null;
        String gmLabel = body.get("gmLabel") instanceof String s ? s : null;
        return ResponseEntity.ok(optionsService.setFlag(key, unlocked, gmLabel));
    }
}
