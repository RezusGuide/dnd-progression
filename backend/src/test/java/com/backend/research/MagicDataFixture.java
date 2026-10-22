package com.backend.research;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// The real data files, read straight from the classpath (no Spring).
final class MagicDataFixture {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private MagicDataFixture() {
    }

    static JsonNode read(String path) {
        try (InputStream in = MagicDataFixture.class.getResourceAsStream(path)) {
            return MAPPER.readTree(in);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    static AspectGraph graph() {
        Map<String, List<String>> components = new LinkedHashMap<>();
        for (JsonNode a : read("/data/aspects.json").get("aspects")) {
            List<String> parts = new ArrayList<>();
            a.get("components").forEach(c -> parts.add(c.asText()));
            components.put(a.get("key").asText(), parts);
        }
        return new AspectGraph(components);
    }

    static Map<String, List<String>> schools() {
        Map<String, List<String>> out = new LinkedHashMap<>();
        for (JsonNode s : read("/data/schools.json")) {
            List<String> aspects = new ArrayList<>();
            s.get("aspects").forEach(a -> aspects.add(a.asText()));
            out.put(s.get("key").asText(), aspects);
        }
        return out;
    }

    static JsonNode spells() {
        return read("/spells.json");
    }
}
