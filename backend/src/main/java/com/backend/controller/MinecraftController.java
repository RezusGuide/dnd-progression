package com.backend.controller;

import com.backend.entity.MinecraftServer;
import com.backend.repository.MinecraftServerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Requires SECTION_MINECRAFT or SECTION_ALL to even hit this controller -
// enforced in SecurityConfig, so no in-method check needed.
@RestController
@RequestMapping("/api/minecraft")
@RequiredArgsConstructor
public class MinecraftController {

    private final MinecraftServerRepository repository;

    @GetMapping
    public ResponseEntity<MinecraftServer> get() {
        return ResponseEntity.ok(
                repository.findById("minecraft").orElseGet(() -> MinecraftServer.builder().build())
        );
    }

    @PutMapping
    public ResponseEntity<MinecraftServer> update(@RequestBody MinecraftServer server) {
        server.setId("minecraft");
        return ResponseEntity.ok(repository.save(server));
    }
}
