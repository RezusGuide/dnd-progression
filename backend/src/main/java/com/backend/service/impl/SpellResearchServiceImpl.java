package com.backend.service.impl;

import com.backend.dto.ResearchOutcomeResponse;
import com.backend.entity.Character;
import com.backend.entity.KnownSpell;
import com.backend.entity.ResearchDraft;
import com.backend.model.Spell;
import com.backend.exception.ResearchException;
import com.backend.repository.CharacterRepository;
import com.backend.repository.KnownSpellRepository;
import com.backend.repository.ResearchDraftRepository;
import com.backend.service.SpellRegistry;
import com.backend.service.SpellResearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SpellResearchServiceImpl implements SpellResearchService {

    private final ResearchDraftRepository draftRepository;
    private final KnownSpellRepository knownSpellRepository;
    private final CharacterRepository characterRepository;
    private final SpellRegistry spellRegistry;

    @Override
    public String getDraftState(Long characterId, String spellId) {
        return draftRepository.findByCharacterIdAndSpellId(characterId, spellId)
                .map(ResearchDraft::getCurrentGridState)
                .orElseThrow(() -> new ResearchException("No active research draft found for this spell."));
    }

    @Override
    @Transactional
    public void saveDraftState(Long characterId, String spellId, String gridState) {
        Character character = characterRepository.findById(characterId)
                .orElseThrow(() -> new ResearchException("Character not found."));
        Spell spell = spellRegistry.getSpell(spellId);

        ResearchDraft draft = draftRepository.findByCharacterIdAndSpellId(characterId, spellId)
                .orElse(ResearchDraft.builder()
                        .character(character)
                        .spellId(spellId)
                        .build());

        draft.setCurrentGridState(gridState);
        draft.setLastUpdated(LocalDateTime.now());
        draftRepository.save(draft);
    }

    @Override
    @Transactional
    public ResearchOutcomeResponse evaluateAndComplete(Long characterId, String spellId, String finalGridState) {
        Character character = characterRepository.findById(characterId)
                .orElseThrow(() -> new ResearchException("Character not found."));
        Spell spell = spellRegistry.getSpell(spellId);

        // 1. Calculate Accuracy based on grid node connections (e.g. "1-2, 2-5")
        int accuracy = calculateGridAccuracy(spell.getAspectShape(), finalGridState);

        // 2. Deduct Materials (Appends to free-text inventory)
        String currentMaterials = character.getMaterials() == null ? "" : character.getMaterials() + "\n";
        character.setMaterials(currentMaterials + "[System] Consumed materials for researching: " + spell.getName());
        characterRepository.save(character);

        // 3. Evaluate Success (Requires at least 50% match)
        boolean success = accuracy >= 50;
        if (success) {
            KnownSpell knownSpell = KnownSpell.builder()
                    .character(character)
                    .spellId(spellId)
                    .accuracyPercentage(accuracy)
                    .build();
            knownSpellRepository.save(knownSpell);
        }

        // 4. Clear the active draft
        draftRepository.findByCharacterIdAndSpellId(characterId, spellId)
                .ifPresent(draftRepository::delete);

        return ResearchOutcomeResponse.builder()
                .success(success)
                .accuracyPercentage(accuracy)
                .spellName(spell.getName())
                .message(success ? "Research successful!" : "Research failed. Materials consumed.")
                .build();
    }

    @Override
    @Transactional
    public void unlockCantrip(Long characterId, String spellId) {
        Spell spell = spellRegistry.getSpell(spellId);
        if (spell.getLevel() != 0) {
            throw new ResearchException("Only cantrips can be instantly unlocked.");
        }
        
        Character character = characterRepository.findById(characterId)
                .orElseThrow(() -> new ResearchException("Character not found."));
                
        if (knownSpellRepository.existsByCharacterIdAndSpellId(characterId, spellId)) {
            throw new ResearchException("Cantrip already known.");
        }
        
        KnownSpell knownSpell = KnownSpell.builder()
                .character(character)
                .spellId(spellId)
                .accuracyPercentage(100)
                .build();
        knownSpellRepository.save(knownSpell);
    }

    private int calculateGridAccuracy(String requiredShape, String playerShape) {
        if (requiredShape == null || playerShape == null) return 0;

        Set<String> requiredEdges = new HashSet<>(Arrays.asList(requiredShape.split(",")));
        Set<String> playerEdges = new HashSet<>(Arrays.asList(playerShape.split(",")));

        if (requiredEdges.isEmpty()) return 0;

        long matches = playerEdges.stream()
                .map(String::trim)
                .filter(requiredEdges::contains)
                .count();

        return (int) (((double) matches / requiredEdges.size()) * 100);
    }
}