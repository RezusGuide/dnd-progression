package com.backend.controller;

import com.backend.service.DataRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public reference data: GET /api/data/races|classes|backgrounds|runes.
 * Only names on DataRegistry's whitelist are served.
 */
@RestController
@RequestMapping("/api/data")
@RequiredArgsConstructor
public class DataController {

    private final DataRegistry dataRegistry;

    @GetMapping("/{name}")
    public ResponseEntity<String> get(@PathVariable String name) {
        return dataRegistry.raw(name)
                .map(json -> ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(json))
                .orElse(ResponseEntity.notFound().build());
    }
}
