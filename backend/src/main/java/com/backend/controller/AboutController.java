package com.backend.controller;

import com.backend.entity.AboutProfile;
import com.backend.repository.AboutProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Nested under /api/portfolio so it reuses the existing SecurityConfig rules:
// GET is public, writes require SECTION_ALL (owner).
@RestController
@RequestMapping("/api/portfolio/profile")
@RequiredArgsConstructor
public class AboutController {

    private final AboutProfileRepository repository;

    @GetMapping
    public ResponseEntity<AboutProfile> get() {
        return ResponseEntity.ok(
                repository.findById("about").orElseGet(() -> AboutProfile.builder().build())
        );
    }

    @PutMapping
    public ResponseEntity<AboutProfile> update(@RequestBody AboutProfile profile) {
        profile.setId("about");
        return ResponseEntity.ok(repository.save(profile));
    }
}
