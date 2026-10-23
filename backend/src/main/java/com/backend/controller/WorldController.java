package com.backend.controller;

import com.backend.dto.WorldDtos.ArticleInput;
import com.backend.dto.WorldDtos.GmArticle;
import com.backend.dto.WorldDtos.PlayerArticle;
import com.backend.entity.User;
import com.backend.service.WorldService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** «Мир»: /api/world for everyone signed in, /api/admin/world for the GM. */
@RestController
@RequiredArgsConstructor
public class WorldController {

    private final WorldService world;

    @GetMapping("/api/world")
    public ResponseEntity<List<PlayerArticle>> list() {
        return ResponseEntity.ok(world.list());
    }

    @GetMapping("/api/world/{slug}")
    public ResponseEntity<PlayerArticle> get(@PathVariable String slug) {
        return ResponseEntity.ok(world.get(slug));
    }

    @GetMapping("/api/admin/world")
    public ResponseEntity<List<GmArticle>> all() {
        return ResponseEntity.ok(world.all());
    }

    @GetMapping("/api/admin/world/{id}")
    public ResponseEntity<GmArticle> one(@PathVariable Long id) {
        return ResponseEntity.ok(world.one(id));
    }

    @PostMapping("/api/admin/world")
    public ResponseEntity<GmArticle> create(@RequestBody ArticleInput body, @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(world.create(body, user));
    }

    @PutMapping("/api/admin/world/{id}")
    public ResponseEntity<GmArticle> update(@PathVariable Long id, @RequestBody ArticleInput body, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(world.update(id, body, user));
    }

    // Body: {"status": "OPEN"}.
    @PutMapping("/api/admin/world/{id}/status")
    public ResponseEntity<GmArticle> status(@PathVariable Long id, @RequestBody Map<String, String> body, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(world.setStatus(id, body.get("status"), user));
    }

    @DeleteMapping("/api/admin/world/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        world.delete(id);
        return ResponseEntity.noContent().build();
    }
}
