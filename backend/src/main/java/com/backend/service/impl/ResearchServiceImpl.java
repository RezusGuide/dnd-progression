package com.backend.service.impl;

import com.backend.dto.*;
import com.backend.entity.AspectRecipe;
import com.backend.entity.Character;
import com.backend.entity.KnownSpell;
import com.backend.entity.ResearchDraft;
import com.backend.entity.SpellHintGrant;
import com.backend.exception.ResearchException;
import com.backend.model.GridAnchor;
import com.backend.model.Spell;
import com.backend.repository.AspectRecipeRepository;
import com.backend.repository.CharacterRepository;
import com.backend.repository.KnownSpellRepository;
import com.backend.repository.ResearchDraftRepository;
import com.backend.repository.SpellHintGrantRepository;
import com.backend.service.CasterClasses;
import com.backend.service.ResearchService;
import com.backend.service.SpellRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Ground-up rebuild of the research minigame - the earlier attempt
 * (see git history) never actually scored anything because Spell#pattern
 * (then aspectShape) was never populated from spells.json, so every
 * attempt matched 0%. See the spell-research prompts for the two-mode
 * design and the level-gated aspect tree this implements.
 */
@Service
@RequiredArgsConstructor
public class ResearchServiceImpl implements ResearchService {

    // Aspect count required to attempt a research of a given spell level -
    // inclusive on both ends. Declared for from-scratch attempts up front
    // (targetLevel); derived from the spell's own level for hinted ones.
    // Deliberately small - the original 4-43 range (see git history) was
    // pure busywork with no real puzzle to it, since it was satisfied by
    // stacking however many of one or two aspects the player had on hand.
    private static final Map<Integer, int[]> LEVEL_ASPECT_RANGE = Map.ofEntries(
            Map.entry(1, new int[]{3, 4}),
            Map.entry(2, new int[]{4, 5}),
            Map.entry(3, new int[]{5, 7}),
            Map.entry(4, new int[]{6, 8}),
            Map.entry(5, new int[]{7, 9}),
            Map.entry(6, new int[]{8, 10}),
            Map.entry(7, new int[]{9, 11}),
            Map.entry(8, new int[]{10, 12})
    );

    // Minimum number of *distinct* aspect keys among the placements - blocks
    // "place N of the one aspect I have a pile of" outright, before scoring
    // even runs.
    private static final Map<Integer, Integer> MIN_DISTINCT_ASPECTS = Map.ofEntries(
            Map.entry(1, 2), Map.entry(2, 2), Map.entry(3, 3), Map.entry(4, 3),
            Map.entry(5, 4), Map.entry(6, 4), Map.entry(7, 5), Map.entry(8, 5)
    );

    // Minimum number of placed aspects that must be compound ("exotic" -
    // anything not one of the six primal aspects), scaling with level. This
    // is the real anti-spam gate: the six primal aspects are the easiest to
    // stockpile (granted freely, combine into everything else), so a wall
    // built entirely out of Aer/Ignis/Aqua/Terra/Ordo/Perditio - however
    // varied - still can't clear it past level 1. Forces actually crafting
    // up the tree instead of dumping primals into the grid.
    private static final Map<Integer, Integer> MIN_EXOTIC_ASPECTS = Map.ofEntries(
            Map.entry(1, 0), Map.entry(2, 1), Map.entry(3, 1), Map.entry(4, 2),
            Map.entry(5, 2), Map.entry(6, 3), Map.entry(7, 3), Map.entry(8, 4)
    );

    private static final Set<String> PRIMAL_ASPECTS = Set.of("AER", "IGNIS", "AQUA", "TERRA", "ORDO", "PERDITIO");

    // Axial hex neighbor offsets (q, r) - standard six-direction adjacency.
    private static final int[][] HEX_NEIGHBORS = {
            {1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, -1}, {-1, 1}
    };

    private final CharacterRepository characterRepository;
    private final KnownSpellRepository knownSpellRepository;
    private final ResearchDraftRepository draftRepository;
    private final SpellHintGrantRepository hintGrantRepository;
    private final AspectRecipeRepository aspectRecipeRepository;
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
                            .nameRu(spell.getNameRu())
                            .descriptionRu(spell.getDescriptionRu())
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
    public void unlockCantrip(Long characterId, String spellId, Long actingUserId, boolean actingUserIsOwner) {
        Spell spell = spellRegistry.getSpell(spellId);
        if (spell.getLevel() != 0) {
            throw new ResearchException("Без исследования открываются только заговоры.");
        }
        if (knownSpellRepository.existsByCharacterIdAndSpellId(characterId, spellId)) {
            throw new ResearchException("Этот заговор уже есть в личном деле.");
        }
        Character character = requireOwnedCharacter(characterId, actingUserId, actingUserIsOwner);
        requireCasterClass(character);
        requireSpellClassMatch(character, spell);
        knownSpellRepository.save(KnownSpell.builder()
                .character(character)
                .spellId(spellId)
                .accuracyPercentage(100)
                .build());
    }

    @Override
    @Transactional
    public ResearchAttemptResponse attemptResearch(Long characterId, ResearchAttemptRequest request, Long actingUserId, boolean actingUserIsOwner) {
        Character character = requireOwnedCharacter(characterId, actingUserId, actingUserIsOwner);
        requireCasterClass(character);
        List<GridAnchor> placements = request.getPlacements() == null ? List.of() : request.getPlacements();

        boolean hinted = request.getSpellId() != null && !request.getSpellId().isBlank();
        Spell hintedSpell = null;
        int targetLevel;

        if (hinted) {
            requireHintAccess(characterId, request.getSpellId());
            hintedSpell = spellRegistry.getSpell(request.getSpellId());
            if (hintedSpell.getLevel() < SpellRegistry.MIN_RESEARCHABLE_LEVEL || hintedSpell.getLevel() > SpellRegistry.MAX_RESEARCHABLE_LEVEL) {
                throw new ResearchException("Исследовать можно только заклинания " + SpellRegistry.MIN_RESEARCHABLE_LEVEL
                        + "–" + SpellRegistry.MAX_RESEARCHABLE_LEVEL + " уровня.");
            }
            requireSpellClassMatch(character, hintedSpell);
            targetLevel = hintedSpell.getLevel();
        } else {
            if (request.getTargetLevel() == null) {
                throw new ResearchException("Сначала выберите уровень исследования.");
            }
            targetLevel = request.getTargetLevel();
        }

        requireValidAspectCount(targetLevel, placements.size());
        requireVariety(targetLevel, placements);
        requireConnected(placements, hinted ? hintedSpell.getPattern() : null);

        // Every attempt spends the aspects placed, successful or not -
        // validate the whole attempt is affordable before deducting
        // anything, so a failed/rejected attempt can't leave the pouch
        // half-charged.
        Map<String, Integer> usage = new HashMap<>();
        for (GridAnchor a : placements) {
            usage.merge(a.getAspect(), 1, Integer::sum);
        }
        Map<String, Integer> pouch = character.getAspects();
        for (Map.Entry<String, Integer> entry : usage.entrySet()) {
            int have = pouch.getOrDefault(entry.getKey(), 0);
            if (have < entry.getValue()) {
                throw new ResearchException(
                        "Не хватает аспекта " + entry.getKey() + " в сумке: есть " + have + ", нужно " + entry.getValue() + ".");
            }
        }
        usage.forEach((aspect, used) -> pouch.merge(aspect, -used, Integer::sum));

        Spell targetSpell;
        int accuracy;

        if (hinted) {
            targetSpell = hintedSpell;
            accuracy = matchPercentage(targetSpell.getPattern(), placements);
        } else {
            // Mode 1: no spell was picked ahead of time - score the attempt
            // against every catalog spell AT the declared target level (the
            // level the player committed aspects toward) and see what it
            // best resembles, capped at 80% since this is invention, not
            // replication.
            Spell best = null;
            int bestScore = -1;
            for (Spell candidate : spellRegistry.getSpellsByLevel(targetLevel)) {
                if (!isClassEligible(character, candidate)) {
                    continue;
                }
                int score = matchPercentage(candidate.getPattern(), placements);
                if (score > bestScore) {
                    bestScore = score;
                    best = candidate;
                }
            }
            if (best == null) {
                throw new ResearchException("В картотеке пока нет заклинаний " + targetLevel + " уровня для этого класса.");
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
                .spellNameRu(ruName(targetSpell))
                .accuracyPercentage(accuracy)
                .recordedAccuracyPercentage(recorded)
                .mode2Hinted(hinted)
                .aspectsSpent(usage)
                .build();
    }

    @Override
    @Transactional
    public AspectCraftResponse craftAspect(Long characterId, AspectCraftRequest request, Long actingUserId, boolean actingUserIsOwner) {
        String a = request.getAspectA();
        String b = request.getAspectB();
        if (a == null || a.isBlank() || b == null || b.isBlank()) {
            throw new ResearchException("Выберите два аспекта для соединения.");
        }

        Character character = requireOwnedCharacter(characterId, actingUserId, actingUserIsOwner);
        Map<String, Integer> pouch = character.getAspects();

        Map<String, Integer> required = new HashMap<>();
        required.merge(a, 1, Integer::sum);
        required.merge(b, 1, Integer::sum);
        for (Map.Entry<String, Integer> entry : required.entrySet()) {
            int have = pouch.getOrDefault(entry.getKey(), 0);
            if (have < entry.getValue()) {
                throw new ResearchException("Не хватает аспекта " + entry.getKey() + " для этого соединения.");
            }
        }

        Optional<AspectRecipe> recipe = aspectRecipeRepository.findByComponentAAndComponentB(a, b)
                .or(() -> aspectRecipeRepository.findByComponentAAndComponentB(b, a));

        if (recipe.isEmpty()) {
            // No match - nothing consumed, per the aspect-crafting prompt.
            return AspectCraftResponse.builder()
                    .success(false)
                    .message("That combination doesn't produce anything.")
                    .build();
        }

        required.forEach((aspect, used) -> pouch.merge(aspect, -used, Integer::sum));
        pouch.merge(recipe.get().getResultAspect(), 1, Integer::sum);
        characterRepository.save(character);

        return AspectCraftResponse.builder()
                .success(true)
                .resultAspect(recipe.get().getResultAspect())
                .message("Combined into " + recipe.get().getResultAspect() + "!")
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
    public void saveDraftState(Long characterId, String spellId, String gridState, Long actingUserId, boolean actingUserIsOwner) {
        Character character = requireOwnedCharacter(characterId, actingUserId, actingUserIsOwner);
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
            throw new ResearchException("Количество должно быть больше нуля.");
        }
        Character character = requireCharacter(request.getCharacterId());
        character.getAspects().merge(request.getAspect(), request.getAmount(), Integer::sum);
        characterRepository.save(character);
    }

    @Override
    @Transactional
    public void grantHint(HintGrantRequest request) {
        Spell spell = spellRegistry.getSpell(request.getSpellId());
        if (spell.getLevel() < SpellRegistry.MIN_RESEARCHABLE_LEVEL || spell.getLevel() > SpellRegistry.MAX_RESEARCHABLE_LEVEL) {
            throw new ResearchException("Наводки выдаются только на заклинания " + SpellRegistry.MIN_RESEARCHABLE_LEVEL
                    + "–" + SpellRegistry.MAX_RESEARCHABLE_LEVEL + " уровня.");
        }
        if (hintGrantRepository.existsByCharacterIdAndSpellId(request.getCharacterId(), request.getSpellId())) {
            return; // already granted - idempotent
        }
        Character character = requireCharacter(request.getCharacterId());
        hintGrantRepository.save(SpellHintGrant.builder().character(character).spellId(request.getSpellId()).build());
    }

    // "Logical connections" gate #1: classes with no spellcasting in the
    // base rules (Fighter, Barbarian, Rogue, Monk) can't touch the research
    // system at all. An unrecognized class string (typo, homebrew name,
    // blank field) is left unrestricted rather than blocked, since we can't
    // tell a mismatch from an intentional non-standard class name.
    private void requireCasterClass(Character character) {
        String cls = CasterClasses.normalize(character.getCharacterClass());
        if (CasterClasses.NON_CASTER_CLASSES.contains(cls)) {
            throw new ResearchException("У этого класса нет заклинаний по базовым правилам, исследовать нечего. "
                    + "Для воинских классов будет отдельное испытание.");
        }
    }

    // "Logical connections" gate #2: a recognized caster class can only
    // research/unlock spells that are actually on its class list. Same
    // fail-open behavior for an unrecognized class or a spell with no
    // classes tagged yet (older cantrip rows predate this field).
    private void requireSpellClassMatch(Character character, Spell spell) {
        if (!isClassEligible(character, spell)) {
            throw new ResearchException("Заклинание «" + ruName(spell) + "» не входит в список этого класса.");
        }
    }

    private boolean isClassEligible(Character character, Spell spell) {
        String cls = CasterClasses.normalize(character.getCharacterClass());
        if (!CasterClasses.CASTER_CLASSES.contains(cls)) {
            return true; // unrecognized class string - don't block on a guess
        }
        List<String> eligible = spell.getClasses();
        return eligible == null || eligible.isEmpty() || eligible.contains(cls);
    }

    private void requireHintAccess(Long characterId, String spellId) {
        if (!hintGrantRepository.existsByCharacterIdAndSpellId(characterId, spellId)) {
            throw new ResearchException("На это заклинание наводки не выдано.");
        }
    }

    private Character requireCharacter(Long characterId) {
        return characterRepository.findById(characterId)
                .orElseThrow(() -> new ResearchException("Личное дело не найдено."));
    }

    // Used only by the player-facing mutating actions (cantrips, research
    // attempts, aspect crafting, draft autosave) - grantAspect/grantHint
    // deliberately keep using the unrestricted requireCharacter above,
    // since those are DM-only actions (see AdminController, already gated
    // by SecurityConfig's OWNER-role requirement on /api/admin/**) that by
    // design target a *player's* character, not the DM's own.
    private Character requireOwnedCharacter(Long characterId, Long actingUserId, boolean actingUserIsOwner) {
        Character character = requireCharacter(characterId);
        if (!actingUserIsOwner && !character.getUser().getId().equals(actingUserId)) {
            throw new ResearchException("Личное дело не найдено.");
        }
        return character;
    }

    private SpellSummary toSummary(Spell s) {
        return SpellSummary.builder()
                .id(s.getId()).name(s.getName()).level(s.getLevel()).description(s.getDescription())
                .castingTime(s.getCastingTime()).range(s.getRange()).components(s.getComponents()).duration(s.getDuration())
                .nameRu(s.getNameRu()).descriptionRu(s.getDescriptionRu())
                .classes(s.getClasses())
                .build();
    }

    private void requireValidAspectCount(int level, int count) {
        int[] range = LEVEL_ASPECT_RANGE.get(level);
        if (range == null) {
            throw new ResearchException("Заклинания " + level + " уровня не исследуются.");
        }
        if (count < range[0]) {
            throw new ResearchException("Мало аспектов для " + level
                    + " уровня: нужно " + range[0] + "–" + range[1] + ", размещено " + count + ".");
        }
        if (count > range[1]) {
            throw new ResearchException("Слишком много аспектов для " + level
                    + " уровня: нужно " + range[0] + "–" + range[1] + ", размещено " + count + ".");
        }
    }

    // Blocks the "spam two aspects" exploit directly, ahead of scoring:
    // requires both a minimum spread of distinct aspect keys and a minimum
    // count of non-primal ("exotic") placements, both scaling with level.
    private void requireVariety(int level, List<GridAnchor> placements) {
        int minDistinct = MIN_DISTINCT_ASPECTS.getOrDefault(level, 0);
        int minExotic = MIN_EXOTIC_ASPECTS.getOrDefault(level, 0);

        Set<String> distinct = new HashSet<>();
        int exotic = 0;
        for (GridAnchor a : placements) {
            distinct.add(a.getAspect());
            if (!PRIMAL_ASPECTS.contains(a.getAspect())) {
                exotic++;
            }
        }

        if (distinct.size() < minDistinct) {
            throw new ResearchException("Для " + level + " уровня нужно не меньше " + minDistinct
                    + " разных аспектов, размещено " + distinct.size() + ".");
        }
        if (exotic < minExotic) {
            throw new ResearchException("Для " + level + " уровня нужно не меньше " + minExotic
                    + " составных аспектов, одних базовых мало (размещено " + exotic + ").");
        }
    }

    // Every placed aspect must be adjacent to at least one other placed
    // aspect - a flood-fill from any one cell must reach all the others.
    // In hinted mode, the guide pattern's cells are folded into the same
    // connectivity graph (per the spell-research prompt: "the player's
    // placements need to stay connected to the shown guide pattern too"),
    // so a technically-self-connected blob placed nowhere near the guide
    // still gets rejected here instead of just silently scoring 0%.
    private void requireConnected(List<GridAnchor> placements, List<GridAnchor> guide) {
        Map<String, int[]> cells = new HashMap<>();
        for (GridAnchor a : placements) {
            cells.put(a.getQ() + "," + a.getR(), new int[]{a.getQ(), a.getR()});
        }
        if (guide != null) {
            for (GridAnchor a : guide) {
                cells.put(a.getQ() + "," + a.getR(), new int[]{a.getQ(), a.getR()});
            }
        }
        if (cells.size() <= 1) return;

        Set<String> visited = new HashSet<>();
        Deque<String> stack = new ArrayDeque<>();
        String start = cells.keySet().iterator().next();
        stack.push(start);
        visited.add(start);
        while (!stack.isEmpty()) {
            int[] c = cells.get(stack.pop());
            for (int[] offset : HEX_NEIGHBORS) {
                String neighborKey = (c[0] + offset[0]) + "," + (c[1] + offset[1]);
                if (cells.containsKey(neighborKey) && visited.add(neighborKey)) {
                    stack.push(neighborKey);
                }
            }
        }

        if (visited.size() != cells.size()) {
            throw new ResearchException(guide != null
                    ? "Аспекты должны соединяться друг с другом и с образцом."
                    : "Все аспекты должны образовать одну связную фигуру.");
        }
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

    // Russian display name, falling back to the English one while spells.json
    // translations are still being filled in.
    private static String ruName(Spell spell) {
        return spell.getNameRu() != null && !spell.getNameRu().isBlank() ? spell.getNameRu() : spell.getName();
    }
}
