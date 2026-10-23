package com.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Public liveness checks for the home-hosted backend (prompts/11-home-hosting.md):
 * /api/health answers without touching the database, /api/health/db tries
 * a connection for at most two seconds.
 */
@RestController
@RequiredArgsConstructor
public class HealthController {

    static final long DB_TIMEOUT_MS = 2000;

    private final DataSource dataSource;
    private final ObjectProvider<BuildProperties> build;

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> out = new LinkedHashMap<>();
        out.put("status", "ok");
        out.put("version", version());
        return ResponseEntity.ok(out);
    }

    @GetMapping("/api/health/db")
    public ResponseEntity<Map<String, String>> database() {
        boolean ok;
        try {
            ok = CompletableFuture.supplyAsync(this::connectionValid).get(DB_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            ok = false;
        }
        Map<String, String> out = new LinkedHashMap<>();
        out.put("status", ok ? "ok" : "degraded");
        out.put("version", version());
        return ResponseEntity.ok(out);
    }

    private boolean connectionValid() {
        try (Connection c = dataSource.getConnection()) {
            return c.isValid((int) (DB_TIMEOUT_MS / 1000));
        } catch (Exception e) {
            return false;
        }
    }

    /** Build time from META-INF/build-info.properties (bootJar), "dev" when run from the IDE. */
    private String version() {
        BuildProperties b = build.getIfAvailable();
        return b != null && b.getTime() != null ? b.getTime().toString() : "dev";
    }
}
