package com.backend.controller;

import com.backend.entity.MinecraftServer;
import com.backend.model.MinecraftStatus;
import com.backend.repository.MinecraftServerRepository;
import com.backend.service.MinecraftPingService;
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
    private final MinecraftPingService pingService;

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

    // Live status via an actual Server List Ping, not the DM-editable
    // static `status` text field above - see MinecraftPingService. A
    // couple-second round trip in the worst case (timeout), so this is its
    // own endpoint rather than bundled into GET /.
    @GetMapping("/status")
    public ResponseEntity<MinecraftStatus> liveStatus() {
        MinecraftServer server = repository.findById("minecraft").orElseGet(() -> MinecraftServer.builder().build());
        return ResponseEntity.ok(pingService.ping(server.getIp(), server.getPort()));
    }
}
