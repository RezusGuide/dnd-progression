package com.backend.controller;

import com.backend.entity.MediaLink;
import com.backend.entity.MediaProfile;
import com.backend.repository.MediaLinkRepository;
import com.backend.repository.MediaProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// GET is public (SecurityConfig permits /api/media/** GETs); writes require
// SECTION_ALL (owner).
@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaProfileRepository profileRepository;
    private final MediaLinkRepository linkRepository;

    @GetMapping("/profile")
    public ResponseEntity<MediaProfile> getProfile() {
        return ResponseEntity.ok(
                profileRepository.findById("media").orElseGet(() -> MediaProfile.builder().build())
        );
    }

    @PutMapping("/profile")
    public ResponseEntity<MediaProfile> updateProfile(@RequestBody MediaProfile profile) {
        profile.setId("media");
        return ResponseEntity.ok(profileRepository.save(profile));
    }

    @GetMapping("/links")
    public ResponseEntity<List<MediaLink>> listLinks() {
        return ResponseEntity.ok(linkRepository.findAllOrdered());
    }

    @PostMapping("/links")
    public ResponseEntity<MediaLink> createLink(@RequestBody MediaLink link) {
        link.setId(null);
        return ResponseEntity.status(201).body(linkRepository.save(link));
    }

    @PutMapping("/links/{id}")
    public ResponseEntity<MediaLink> updateLink(@PathVariable Long id, @RequestBody MediaLink link) {
        link.setId(id);
        return ResponseEntity.ok(linkRepository.save(link));
    }

    @DeleteMapping("/links/{id}")
    public ResponseEntity<Void> deleteLink(@PathVariable Long id) {
        linkRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
