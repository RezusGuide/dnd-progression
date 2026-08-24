package com.backend.controller;

import com.backend.entity.PortfolioProject;
import com.backend.repository.PortfolioProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// GET is public (SecurityConfig permits it); writes require the SECTION_ALL
// authority (owner), also enforced in SecurityConfig.
@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioProjectRepository repository;

    @GetMapping
    public ResponseEntity<List<PortfolioProject>> list() {
        return ResponseEntity.ok(repository.findAllOrdered());
    }

    @PostMapping
    public ResponseEntity<PortfolioProject> create(@RequestBody PortfolioProject project) {
        project.setId(null);
        return ResponseEntity.status(201).body(repository.save(project));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PortfolioProject> update(@PathVariable Long id, @RequestBody PortfolioProject project) {
        project.setId(id);
        return ResponseEntity.ok(repository.save(project));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
