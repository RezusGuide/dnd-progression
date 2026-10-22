package com.backend.service;

import com.backend.dto.CharacterCreateRequest;
import com.backend.entity.AdmissionRequest;
import com.backend.entity.AdmissionType;
import com.backend.entity.ApprovalStatus;
import com.backend.entity.Character;
import com.backend.entity.KnownSpell;
import com.backend.entity.RuneTier;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.exception.ResearchException;
import com.backend.model.Spell;
import com.backend.repository.AdmissionRequestRepository;
import com.backend.repository.CharacterRepository;
import com.backend.repository.KnownSpellRepository;
import com.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Creates a character from the wizard: checks every choice against the
 * reference data and the SRD rules, builds the sheet, and files a CREATION
 * request for the GM. The new character starts as PENDING. Errors are
 * Russian ApiExceptions (400).
 */
@Service
@RequiredArgsConstructor
public class CharacterCreationService {

    private static final Set<String> SKILLS = Set.of(
            "ACROBATICS", "ANIMAL_HANDLING", "ARCANA", "ATHLETICS", "DECEPTION", "HISTORY",
            "INSIGHT", "INTIMIDATION", "INVESTIGATION", "MEDICINE", "NATURE", "PERCEPTION",
            "PERFORMANCE", "PERSUASION", "RELIGION", "SLEIGHT_OF_HAND", "STEALTH", "SURVIVAL");
    private static final String CUSTOM = "CUSTOM";

    private final DataRegistry data;
    private final SpellRegistry spellRegistry;
    private final UserRepository userRepository;
    private final CharacterRepository characterRepository;
    private final KnownSpellRepository knownSpellRepository;
    private final AdmissionRequestRepository requestRepository;

    @Transactional
    public Character create(CharacterCreateRequest req, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Пропуск не найден."));

        String name = req.getName() == null ? "" : req.getName().strip();
        if (name.isEmpty()) throw ApiException.badRequest("Укажите имя.");

        JsonNode cls = data.find("classes", req.getClassKey())
                .orElseThrow(() -> ApiException.badRequest("Выберите класс."));

        // ── Race and its bonuses ──
        Map<String, Integer> bonuses = new HashMap<>();
        Set<String> raceSkills = new LinkedHashSet<>();
        String raceName;
        int speed = 30;
        String raceLanguages = "";
        String raceTraits = "";
        if (CUSTOM.equals(req.getRaceKey())) {
            raceName = blankToNull(req.getCustomRaceName());
            if (raceName == null) throw ApiException.badRequest("Укажите название расы.");
            int total = 0;
            for (Map.Entry<String, Integer> e : req.getCustomRaceBonuses().entrySet()) {
                int v = e.getValue() == null ? 0 : e.getValue();
                if (!CharacterRules.ABILITIES.contains(e.getKey()) || v < 0 || v > 2) {
                    throw ApiException.badRequest("Бонус расы может быть от 0 до +2 к характеристике.");
                }
                total += v;
                if (v > 0) bonuses.put(e.getKey(), v);
            }
            if (total > 3) throw ApiException.badRequest("Сумма бонусов своей расы — не больше +3.");
        } else {
            JsonNode race = data.find("races", req.getRaceKey())
                    .orElseThrow(() -> ApiException.badRequest("Выберите расу."));
            raceName = race.get("key").asText();
            race.get("bonuses").fields().forEachRemaining(e -> bonuses.merge(e.getKey(), e.getValue().asInt(), Integer::sum));
            JsonNode choice = race.get("bonusChoice");
            if (choice != null) {
                List<String> picked = req.getRaceBonusChoice();
                Set<String> excluded = asSet(choice.get("exclude"));
                if (picked.size() != choice.get("count").asInt() || new LinkedHashSet<>(picked).size() != picked.size()
                        || picked.stream().anyMatch(a -> !CharacterRules.ABILITIES.contains(a) || excluded.contains(a))) {
                    throw ApiException.badRequest("Выберите две разные характеристики для бонуса +1.");
                }
                picked.forEach(a -> bonuses.merge(a, choice.get("amount").asInt(), Integer::sum));
            }
            raceSkills.addAll(asSet(race.get("skills")));
            JsonNode skillChoice = race.get("skillChoice");
            if (skillChoice != null) {
                List<String> picked = req.getRaceSkills();
                if (picked.size() > skillChoice.get("count").asInt() || picked.stream().anyMatch(s -> !SKILLS.contains(s))) {
                    throw ApiException.badRequest("Навыки расы выбраны неверно.");
                }
                raceSkills.addAll(picked);
            }
            speed = race.get("speed").asInt();
            raceLanguages = String.join(", ", asList(race.get("languages")));
            raceTraits = String.join("\n", asList(race.get("traits")));
        }

        // ── Background ──
        String backgroundName;
        Set<String> backgroundSkills;
        String backgroundProfs;
        String backgroundEquipment = null;
        if (CUSTOM.equals(req.getBackgroundKey())) {
            backgroundName = blankToNull(req.getCustomBackgroundName());
            if (backgroundName == null) throw ApiException.badRequest("Укажите название предыстории.");
            backgroundSkills = new LinkedHashSet<>(req.getCustomBackgroundSkills());
            if (backgroundSkills.size() != 2 || backgroundSkills.stream().anyMatch(s -> !SKILLS.contains(s))) {
                throw ApiException.badRequest("У своей предыстории два разных навыка.");
            }
            backgroundProfs = blankToNull(req.getCustomBackgroundProficiencies());
        } else {
            JsonNode bg = data.find("backgrounds", req.getBackgroundKey())
                    .orElseThrow(() -> ApiException.badRequest("Выберите предысторию."));
            backgroundName = bg.get("nameRu").asText();
            backgroundSkills = asSet(bg.get("skills"));
            backgroundProfs = bg.get("proficiencies").asText();
            backgroundEquipment = bg.get("equipment").asText();
        }

        // ── Ability scores ──
        Map<String, Integer> base = req.getBaseScores();
        for (String a : CharacterRules.ABILITIES) {
            if (base.get(a) == null) throw ApiException.badRequest("Заполните все характеристики.");
        }
        String method = req.getAbilityMethod() == null ? "" : req.getAbilityMethod();
        switch (method) {
            case "STANDARD" -> {
                List<Integer> values = new ArrayList<>(CharacterRules.ABILITIES.stream().map(base::get).toList());
                values.sort((x, y) -> y - x);
                if (!values.equals(CharacterRules.STANDARD_ARRAY)) {
                    throw ApiException.badRequest("Стандартный набор: каждое из 15, 14, 13, 12, 10, 8 — ровно один раз.");
                }
            }
            case "POINT_BUY" -> {
                int spent = 0;
                for (String a : CharacterRules.ABILITIES) {
                    int cost = CharacterRules.pointBuyCost(base.get(a));
                    if (cost < 0) throw ApiException.badRequest("Покупка очков: значения от 8 до 15.");
                    spent += cost;
                }
                if (spent > CharacterRules.POINT_BUY_BUDGET) {
                    throw ApiException.badRequest("Покупка очков: потрачено " + spent + " из 27.");
                }
            }
            case "ROLL" -> {
                for (String a : CharacterRules.ABILITIES) {
                    int v = base.get(a);
                    if (v < 3 || v > 18) throw ApiException.badRequest("Броски 4к6 дают от 3 до 18.");
                }
            }
            default -> throw ApiException.badRequest("Выберите способ распределения характеристик.");
        }
        Map<String, Integer> scores = new HashMap<>();
        for (String a : CharacterRules.ABILITIES) {
            scores.put(a, base.get(a) + bonuses.getOrDefault(a, 0));
        }

        // ── Class skills ──
        JsonNode skillChoice = cls.get("skillChoice");
        int classSkillCount = skillChoice.get("count").asInt();
        Set<String> allowed = skillChoice.get("from").isTextual() ? SKILLS : asSet(skillChoice.get("from"));
        List<String> classSkills = req.getClassSkills();
        if (classSkills.size() > classSkillCount || new LinkedHashSet<>(classSkills).size() != classSkills.size()
                || classSkills.stream().anyMatch(s -> !allowed.contains(s))) {
            throw ApiException.badRequest("Навыки класса: не больше " + classSkillCount + " из списка класса.");
        }
        Set<String> skills = new LinkedHashSet<>(backgroundSkills);
        skills.addAll(raceSkills);
        skills.addAll(classSkills);

        // ── Cantrips ──
        String classUpper = cls.get("key").asText().toUpperCase();
        int cantripLimit = cls.get("cantrips").asInt();
        List<String> cantripIds = new ArrayList<>(new LinkedHashSet<>(req.getCantrips()));
        if (cantripIds.size() > cantripLimit) {
            throw ApiException.badRequest(cantripLimit == 0
                    ? "Этому классу заговоры при создании не положены."
                    : "Заговоров можно выбрать не больше " + cantripLimit + ".");
        }
        for (String id : cantripIds) {
            Spell spell;
            try {
                spell = spellRegistry.getSpell(id);
            } catch (ResearchException e) {
                throw ApiException.badRequest("Заговора «" + id + "» нет в картотеке.");
            }
            if (spell.getLevel() != 0 || spell.getClasses() == null || !spell.getClasses().contains(classUpper)) {
                throw ApiException.badRequest("«" + (spell.getNameRu() != null ? spell.getNameRu() : spell.getName())
                        + "» не заговор этого класса.");
            }
        }

        // ── Rune and starting level ──
        RuneTier rune;
        try {
            rune = req.getRuneTier() == null ? RuneTier.COMMON : RuneTier.valueOf(req.getRuneTier());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Неизвестная руна.");
        }
        int level = req.getStartLevel() == null ? 1 : req.getStartLevel();
        if (level < 1 || level > rune.getLevelCap()) {
            throw ApiException.badRequest("Стартовый уровень — от 1 до " + rune.getLevelCap() + " для этой руны.");
        }

        // ── Build the sheet ──
        int hitDie = cls.get("hitDie").asInt();
        List<String> equipmentOptions = asList(cls.get("equipment"));
        int option = Math.max(0, Math.min(equipmentOptions.size() - 1, req.getEquipmentOption()));
        List<String> equipment = new ArrayList<>();
        equipment.add(equipmentOptions.get(option));
        if (backgroundEquipment != null) equipment.add(backgroundEquipment);
        if (blankToNull(req.getEquipmentExtra()) != null) equipment.add(req.getEquipmentExtra().strip());

        List<String> profs = new ArrayList<>();
        profs.add(cls.get("proficiencies").asText());
        if (backgroundProfs != null) profs.add(backgroundProfs);
        if (!raceLanguages.isEmpty()) profs.add("Языки: " + raceLanguages + ".");

        int hpMax = CharacterRules.startingHp(hitDie, CharacterRules.abilityMod(scores.get("CON")), level);

        Character character = Character.builder()
                .user(user)
                .name(name)
                .characterClass(cls.get("key").asText())
                .race(raceName)
                .background(backgroundName)
                .alignment(blankToNull(req.getAlignment()))
                .playerName(blankToNull(req.getPlayerName()))
                .portraitData(blankToNull(req.getPortraitData()))
                .backstory(blankToNull(req.getBackstory()))
                .level(level)
                .experiencePoints(CharacterRules.xpForLevel(level))
                .strength(scores.get("STR"))
                .dexterity(scores.get("DEX"))
                .constitution(scores.get("CON"))
                .intelligence(scores.get("INT"))
                .wisdom(scores.get("WIS"))
                .charisma(scores.get("CHA"))
                .proficiencyBonus(CharacterRules.proficiencyBonus(level))
                .proficientSaves(asSet(cls.get("saves")))
                .proficientSkills(skills)
                .armorClass(10 + CharacterRules.abilityMod(scores.get("DEX")))
                .speed(speed)
                .hpMax(hpMax)
                .hpCurrent(hpMax)
                .hpTemp(0)
                .hitDiceTotal(level)
                .hitDiceType("d" + hitDie)
                .hitDiceUsed(0)
                .equipment(String.join("\n", equipment))
                .otherProficiencies(String.join("\n", profs))
                .featuresAndTraits(raceTraits.isEmpty() ? null : raceTraits)
                .runeTier(RuneTier.COMMON)
                .approvalStatus(ApprovalStatus.PENDING)
                .build();
        character = characterRepository.save(character);

        for (String id : cantripIds) {
            knownSpellRepository.save(KnownSpell.builder()
                    .character(character)
                    .spellId(id)
                    .accuracyPercentage(100)
                    .build());
        }

        requestRepository.save(AdmissionRequest.builder()
                .character(character)
                .type(AdmissionType.CREATION)
                .requestedLevel(level)
                .requestedRuneTier(rune)
                .aboveCap(false)
                .playerComment(blankToNull(req.getPlayerComment()))
                .build());

        return character;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    private static List<String> asList(JsonNode array) {
        List<String> out = new ArrayList<>();
        if (array != null) array.forEach(n -> out.add(n.asText()));
        return out;
    }

    private static Set<String> asSet(JsonNode array) {
        return new LinkedHashSet<>(asList(array));
    }
}
