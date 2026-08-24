package com.backend.service.impl;

import com.backend.dto.*;
import com.backend.entity.Character;
import com.backend.entity.KnownSpell;
import com.backend.entity.ResearchDraft;
import com.backend.entity.SpellHintGrant;
import com.backend.exception.ResearchException;
import com.backend.model.GridAnchor;
import com.backend.model.Spell;
import com.backend.repository.CharacterRepository;
import com.backend.repository.KnownSpellRepository;
import com.backend.repository.ResearchDraftRepository;
import com.backend.repository.SpellHintGrantRepository;
import com.backend.service.ResearchService;
import com.backend.service.SpellRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Ground-up rebuild of the research minigame - the earlier attempt
 * (see git history) never actually scored anything because Spell#pattern
 * (then aspectShape) was never populated from spells.json, so every
 * attempt matched 0%. See the spell-research prompt for the two-mode
 * design this implements.
 */
@Service
@RequiredArgsConstructor
public class ResearchServiceImpl implements ResearchService {

    private final CharacterRepository characterRepository;
    private final KnownSpellRepository knownSpellRepository;
    private final ResearchDraftRepository draftRepository;
    private final SpellHintGrantRepository hintGrantRepository;
    private final SpellRegistry spellRegistry;

    @Override
    public List<KnownSpellResponse> getKnownSpells(Long characterId) {
        return knownSpellRepository.findAllByCharacterId(characterId).stream()
                .map(ks -> {
                    Spell spell = spellRegistry.getSpell(ks.getSpellId());
                    return KnownSpellResponse.builder()
                            .spellId(spell.getId())
                            .name(spell.getName())
                            .level(spell.getLevel())
                            .description(spell.getDescription())
                            .accuracyPercentage(ks.getAccuracyPercentage())
                            .build();
                })
                .toList();
    }

    @Override
    public List<SpellSummary> getHintedSpells(Long characterId) {
        return hintGrantRepository.findByCharacterId(characterId).stream()
                .map(grant -> spellRegistry.getSpell(grant.getSpellId()))
                .map(this::toSummary)
                .toList();
    }

    @Override
    public List<GridAnchor> getPattern(Long characterId, String spellId) {
        requireHintAccess(characterId, spellId);
        return spellRegistry.getSpell(spellId).getPattern();
    }

    @Override
    @Transactional
    public void unlockCantrip(Long characterId, String spellId) {
        Spell spell = spellRegistry.getSpell(spellId);
        if (spell.getLevel() != 0) {
            throw new ResearchException("Only cantrips can be unlocked without research.");
        }
        if (knownSpellRepository.existsByCharacterIdAndSpellId(characterId, spellId)) {
            throw new ResearchException("This character already knows that cantrip.");
        }
        Character character = requireCharacter(characterId);
        knownSpellRepository.save(KnownSpell.builder()
                .character(character)
                .spellId(spellId)
                .accuracyPercentage(100)
                .build());
    }

    @Override
    @Transactional
    public ResearchAttemptResponse attemptResearch(Long characterId, ResearchAttemptRequest request) {
        Character character = requireCharacter(characterId);
        List<GridAnchor> placements = request.getPlacements() == null ? List.of() : request.getPlacements();

        // Every attempt spends the aspects placed, successful or not -
        // validate the whole attempt is affordable before deducting
        // anything, so a failed attempt can't leave the pouch half-charged.
        Map<String, Integer> usage = new HashMap<>();
        for (GridAnchor a : placements) {
            usage.merge(a.getAspect(), 1, Integer::sum);
        }
        Map<String, Integer> pouch = character.getAspects();
        for (Map.Entry<String, Integer> entry : usage.entrySet()) {
            int have = pouch.getOrDefault(entry.getKey(), 0);
            if (have < entry.getValue()) {
                throw new ResearchException(
                        "Not enough " + entry.getKey() + " in the material pouch (have " + have + ", need " + entry.getValue() + ").");
            }
        }
        usage.forEach((aspect, used) -> pouch.merge(aspect, -used, Integer::sum));

        boolean hinted = request.getSpellId() != null && !request.getSpellId().isBlank();
        Spell targetSpell;
        int accuracy;

        if (hinted) {
            requireHintAccess(characterId, request.getSpellId());
            targetSpell = spellRegistry.getSpell(request.getSpellId());
            if (targetSpell.getLevel() < 1 || targetSpell.getLevel() > 2) {
                throw new ResearchException("Only level 1-2 spells can be researched.");
            }
            accuracy = matchPercentage(targetSpell.getPattern(), placements);
        } else {
            // Mode 1: no spell was picked ahead of time - score the attempt
            // against every researchable spell and see what it best
            // resembles, capped at 80% since this is invention, not replication.
            Spell best = null;
            int bestScore = -1;
            for (Spell candidate : spellRegistry.getResearchableSpells()) {
                int score = matchPercentage(candidate.getPattern(), placements);
                if (score > bestScore) {
                    bestScore = score;
                    best = candidate;
                }
            }
            if (best == null) {
                throw new ResearchException("No researchable spells exist in the catalog yet.");
            }
            targetSpell = best;
            accuracy = Math.min(bestScore, 80);
        }

        // Retries only improve the locked-in accuracy, never lower it -
        // otherwise there'd be no reason to ever retry a hinted spell.
        KnownSpell known = knownSpellRepository.findByCharacterIdAndSpellId(characterId, targetSpell.getId()).orElse(null);
        int recorded;
        if (known == null) {
            recorded = accuracy;
            knownSpellRepository.save(KnownSpell.builder()
                    .character(character)
                    .spellId(targetSpell.getId())
                    .accuracyPercentage(accuracy)
                    .build());
        } else {
            recorded = Math.max(known.getAccuracyPercentage(), accuracy);
            known.setAccuracyPercentage(recorded);
            knownSpellRepository.save(known);
        }

        characterRepository.save(character);
        draftRepository.findByCharacterIdAndSpellId(characterId, targetSpell.getId()).ifPresent(draftRepository::delete);

        return ResearchAttemptResponse.builder()
                .spellId(targetSpell.getId())
                .spellName(targetSpell.getName())
                .accuracyPercentage(accuracy)
                .recordedAccuracyPercentage(recorded)
                .mode2Hinted(hinted)
                .aspectsSpent(usage)
                .build();
    }

    @Override
    public String getDraftState(Long characterId, String spellId) {
        return draftRepository.findByCharacterIdAndSpellId(characterId, spellId)
                .map(ResearchDraft::getCurrentGridState)
                .orElse(null);
    }

    @Override
    @Transactional
    public void saveDraftState(Long characterId, String spellId, String gridState) {
        Character character = requireCharacter(characterId);
        ResearchDraft draft = draftRepository.findByCharacterIdAndSpellId(characterId, spellId)
                .orElse(ResearchDraft.builder().character(character).spellId(spellId).build());
        draft.setCurrentGridState(gridState);
        draft.setLastUpdated(LocalDateTime.now());
        draftRepository.save(draft);
    }

    @Override
    @Transactional
    public void grantAspect(AspectGrantRequest request) {
        if (request.getAmount() <= 0) {
            throw new ResearchException("Amount must be positive.");
        }
        Character character = requireCharacter(request.getCharacterId());
        character.getAspects().merge(request.getAspect(), request.getAmount(), Integer::sum);
        characterRepository.save(character);
    }

    @Override
    @Transactional
    public void grantHint(HintGrantRequest request) {
        Spell spell = spellRegistry.getSpell(request.getSpellId());
        if (spell.getLevel() < 1 || spell.getLevel() > 2) {
            throw new ResearchException("Hint access only applies to level 1-2 spells.");
        }
        if (hintGrantRepository.existsByCharacterIdAndSpellId(request.getCharacterId(), request.getSpellId())) {
            return; // already granted - idempotent
        }
        Character character = requireCharacter(request.getCharacterId());
        hintGrantRepository.save(SpellHintGrant.builder().character(character).spellId(request.getSpellId()).build());
    }

    private void requireHintAccess(Long characterId, String spellId) {
        if (!hintGrantRepository.existsByCharacterIdAndSpellId(characterId, spellId)) {
            throw new ResearchException("This character doesn't have hint access for that spell.");
        }
    }

    private Character requireCharacter(Long characterId) {
        return characterRepository.findById(characterId)
                .orElseThrow(() -> new ResearchException("Character not found."));
    }

    private SpellSummary toSummary(Spell s) {
        return SpellSummary.builder()
                .id(s.getId()).name(s.getName()).level(s.getLevel()).description(s.getDescription())
                .castingTime(s.getCastingTime()).range(s.getRange()).components(s.getComponents()).duration(s.getDuration())
                .build();
    }

    // Straight set-intersection over (aspect, q, r) triples - a placement
    // either exactly matches a required one or it doesn't, no partial
    // credit for "close" hexes. required is empty -> 0 (nothing to match
    // against, e.g. a cantrip has no pattern and shouldn't be researchable
    // anyway).
    private int matchPercentage(List<GridAnchor> required, List<GridAnchor> submitted) {
        if (required == null || required.isEmpty()) return 0;
        Set<String> requiredKeys = required.stream().map(this::anchorKey).collect(Collectors.toSet());
        Set<String> submittedKeys = submitted == null ? Set.of()
                : submitted.stream().map(this::anchorKey).collect(Collectors.toSet());
        long matches = requiredKeys.stream().filter(submittedKeys::contains).count();
        return (int) Math.round((matches * 100.0) / requiredKeys.size());
    }

    private String anchorKey(GridAnchor a) {
        return a.getAspect() + ":" + a.getQ() + "," + a.getR();
    }
}
