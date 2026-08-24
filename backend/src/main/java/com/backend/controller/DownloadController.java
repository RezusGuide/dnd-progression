package com.backend.controller;

import com.backend.entity.DownloadLink;
import com.backend.entity.User;
import com.backend.repository.DownloadLinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/downloads")
@RequiredArgsConstructor
public class DownloadController {

    private final DownloadLinkRepository repository;

    // Anonymous visitors: public entries only.
    @GetMapping("/public")
    public ResponseEntity<List<DownloadLink>> listPublic() {
        return ResponseEntity.ok(repository.findBySectionIsNull());
    }

    // Logged-in visitors: public entries plus anything their sections unlock.
    @GetMapping
    public ResponseEntity<List<DownloadLink>> list(@AuthenticationPrincipal User user) {
        var sections = user.getSectionKeys();
        boolean all = sections.contains("*");
        List<DownloadLink> visible = repository.findAll().stream()
                .filter(d -> d.getSection() == null || all || sections.contains(d.getSection()))
                .toList();
        return ResponseEntity.ok(visible);
    }

    @PostMapping
    public ResponseEntity<DownloadLink> create(@RequestBody DownloadLink link) {
        link.setId(null);
        return ResponseEntity.status(201).body(repository.save(link));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
