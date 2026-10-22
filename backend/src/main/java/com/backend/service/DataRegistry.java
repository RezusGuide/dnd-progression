package com.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Reference data (races, classes, backgrounds, runes, source books) from
 * resources/data/*.json - one source for the frontend (GET /api/data/{name})
 * and for server-side validation of new characters. Loaded once at startup.
 */
@Service
public class DataRegistry {

    public static final Set<String> NAMES = Set.of("races", "classes", "backgrounds", "runes", "sources");

    // Classic Jackson 2, as elsewhere in this codebase (the auto-configured
    // bean is Jackson 3).
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, String> raw = new LinkedHashMap<>();
    private final Map<String, Map<String, JsonNode>> byKey = new LinkedHashMap<>();

    public DataRegistry() {
        for (String name : NAMES) {
            try (InputStream in = new ClassPathResource("data/" + name + ".json").getInputStream()) {
                String json = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                raw.put(name, json);
                Map<String, JsonNode> index = new LinkedHashMap<>();
                for (JsonNode node : objectMapper.readTree(json)) {
                    index.put(node.get("key").asText(), node);
                }
                byKey.put(name, index);
            } catch (IOException e) {
                throw new IllegalStateException("Не удалось прочитать справочник " + name, e);
            }
        }
    }

    /** The file as-is, for GET /api/data/{name}; empty for unknown names. */
    public Optional<String> raw(String name) {
        return Optional.ofNullable(raw.get(name));
    }

    /** Every entry of a file, in file order (read-only - copy before changing). */
    public List<JsonNode> list(String name) {
        Map<String, JsonNode> index = byKey.get(name);
        return index == null ? List.of() : new ArrayList<>(index.values());
    }

    public Optional<JsonNode> find(String name, String key) {
        Map<String, JsonNode> index = byKey.get(name);
        return index == null || key == null ? Optional.empty() : Optional.ofNullable(index.get(key));
    }
}
