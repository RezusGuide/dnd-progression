package com.backend.service;

import com.backend.research.AspectGraph;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Aspects, recipes and schools from data/aspects.json and data/schools.json,
 * as the research core needs them.
 */
@Service
public class MagicData {

    private final AspectGraph graph;
    private final Map<String, List<String>> components = new LinkedHashMap<>();
    private final Map<String, List<String>> schools = new LinkedHashMap<>();
    private final Map<String, String> names = new LinkedHashMap<>();
    private final int starterKitPerPrimal;

    public MagicData(DataRegistry data) {
        JsonNode aspects = data.tree("aspects");
        starterKitPerPrimal = aspects.path("starterKitPerPrimal").asInt(3);
        for (JsonNode a : aspects.get("aspects")) {
            List<String> parts = new ArrayList<>();
            a.get("components").forEach(c -> parts.add(c.asText()));
            components.put(a.get("key").asText(), List.copyOf(parts));
            names.put(a.get("key").asText(), a.path("nameRu").asText(a.get("key").asText()));
        }
        graph = new AspectGraph(components);
        for (JsonNode s : data.tree("schools")) {
            List<String> keys = new ArrayList<>();
            s.get("aspects").forEach(a -> keys.add(a.asText()));
            schools.put(s.get("key").asText(), List.copyOf(keys));
        }
    }

    public AspectGraph graph() {
        return graph;
    }

    public Set<String> aspectKeys() {
        return components.keySet();
    }

    public String nameOf(String aspect) {
        return names.getOrDefault(aspect, aspect);
    }

    public List<String> primalKeys() {
        return components.entrySet().stream().filter(e -> e.getValue().isEmpty()).map(Map.Entry::getKey).toList();
    }

    public int starterKitPerPrimal() {
        return starterKitPerPrimal;
    }

    public List<String> schoolAspects(String school) {
        return schools.getOrDefault(school, List.of());
    }

    /** The compound aspect made of a and b (in either order), if any. */
    public Optional<String> recipe(String a, String b) {
        return components.entrySet().stream()
                .filter(e -> e.getValue().size() == 2
                        && ((e.getValue().get(0).equals(a) && e.getValue().get(1).equals(b))
                        || (e.getValue().get(0).equals(b) && e.getValue().get(1).equals(a))))
                .map(Map.Entry::getKey)
                .findFirst();
    }
}
