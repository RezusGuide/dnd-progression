package com.backend.controller;

import com.backend.entity.User;
import com.backend.service.AdmissionService;
import com.backend.service.DataRegistry;
import com.backend.service.OptionsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public reference data: GET /api/data/races|classes|backgrounds|runes.
 * Only names on DataRegistry's whitelist are served. Races and classes go
 * through OptionsService, which hides what the campaign doesn't allow
 * (unless the caller is the GM). user is null for guests.
 */
@RestController
@RequestMapping("/api/data")
@RequiredArgsConstructor
public class DataController {

    private final DataRegistry dataRegistry;
    private final OptionsService optionsService;

    @GetMapping("/{name}")
    public ResponseEntity<String> get(@PathVariable String name, @AuthenticationPrincipal User user) {
        if ("races".equals(name) || "classes".equals(name)) {
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
                    .body(optionsService.dataJson(name, AdmissionService.isGm(user)));
        }
        return dataRegistry.raw(name)
                .map(json -> ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(json))
                .orElse(ResponseEntity.notFound().build());
    }
}
