package com.backend.controller;

import com.backend.entity.Announcement;
import com.backend.entity.User;
import com.backend.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementRepository repository;

    @GetMapping
    public ResponseEntity<List<Announcement>> list() {
        return ResponseEntity.ok(repository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping
    public ResponseEntity<Announcement> create(@RequestBody Announcement announcement,
                                                @AuthenticationPrincipal User user) {
        announcement.setId(null);
        announcement.setAuthor(user);
        announcement.setAuthorName(user.getUsername());
        return ResponseEntity.status(201).body(repository.save(announcement));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
