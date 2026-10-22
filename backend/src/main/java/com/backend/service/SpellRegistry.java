package com.backend.service;

import com.backend.exception.ApiException;
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
            throw ApiException.notFound("Заклинания «" + spellId + "» нет в картотеке.");
        }
        return spell;
    }

    public List<Spell> getAllSpells() {
        return List.copyOf(spellCache.values());
    }

    public boolean exists(String spellId) {
        return spellId != null && spellCache.containsKey(spellId);
    }
}
