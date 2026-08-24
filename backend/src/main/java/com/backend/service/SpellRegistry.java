package com.backend.service;

import com.backend.exception.ResearchException;
import com.backend.model.Spell;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SpellRegistry {

    private Map<String, Spell> spellCache;

    @PostConstruct
    public void loadSpells() {
        // Instantiate directly instead of relying on Spring Autowiring
        ObjectMapper objectMapper = new ObjectMapper();

        try (InputStream inputStream = new ClassPathResource("spells.json").getInputStream()) {
            // Using the empty diamond operator <> to clear the warning
            List<Spell> spellList = objectMapper.readValue(inputStream, new TypeReference<>() {});

            spellCache = spellList.stream()
                    .collect(Collectors.toMap(Spell::getId, Function.identity()));
            System.out.println("Loaded " + spellCache.size() + " spells into Arcane Memory.");
        } catch (Exception e) {
            throw new RuntimeException("Failed to load spell dictionary on startup", e);
        }
    }

    public Spell getSpell(String spellId) {
        Spell spell = spellCache.get(spellId);
        if (spell == null) {
            throw new ResearchException("Spell ID '" + spellId + "' does not exist in the arcane registry.");
        }
        return spell;
    }

    public List<Spell> getAllSpells() {
        return List.copyOf(spellCache.values());
    }

    // The research minigame this pass only covers levels 1-2 - cantrips
    // (level 0) are picked freely with no minigame, and nothing above 2 is
    // in the catalog yet (see the spell-research prompt's Non-goals).
    public List<Spell> getResearchableSpells() {
        return spellCache.values().stream()
                .filter(s -> s.getLevel() >= 1 && s.getLevel() <= 2)
                .toList();
    }
}
