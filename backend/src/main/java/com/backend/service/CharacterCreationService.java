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
import java.util.Comparator;
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
    private static final Set<String> SIZES = Set.of("Маленький", "Средний");
    private static final Set<Integer> HIT_DICE = Set.of(6, 8, 10, 12);
    // Classes typed in from the book: sanity limits only, the GM checks the rest.
    private static final int MANUAL_SKILL_LIMIT = 4;
    private static final int MANUAL_CANTRIP_LIMIT = 4;

    private final DataRegistry data;
    private final SpellRegistry spellRegistry;
    private final UserRepository userRepository;
    private final CharacterRepository characterRepository;
    private final KnownSpellRepository knownSpellRepository;
    private final AdmissionRequestRepository requestRepository;
    private final OptionsService options;

    @Transactional
    public Character create(CharacterCreateRequest req, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Пропуск не найден."));

        boolean gm = AdmissionService.isGm(user);
        String name = req.getName() == null ? "" : req.getName().strip();
        if (name.isEmpty()) throw ApiException.badRequest("Укажите имя.");

        JsonNode cls = data.find("classes", req.getClassKey())
                .orElseThrow(() -> ApiException.badRequest("Выберите класс."));
        if (!options.isAllowed(OptionsService.CLASS, cls.get("key").asText(), gm)) {
            throw ApiException.badRequest("Этот класс пока закрыт для оформления.");
        }
        // No hit die in the data = mechanics the player typed in from the book.
        boolean manualClass = !cls.hasNonNull("hitDie");

        // ── Race and its bonuses ──
        Map<String, Integer> bonuses = new HashMap<>();
        Set<String> raceSkills = new LinkedHashSet<>();
        String raceName;
        int speed = 30;
        String raceLanguages = "";
        String raceTraits = "";
        if (CUSTOM.equals(req.getRaceKey())) {
            if (!options.isAllowed(OptionsService.RACE, OptionsService.CUSTOM_RACE, gm)) {
                throw ApiException.badRequest("Эта раса пока закрыта для оформления.");
            }
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
            if (!options.isAllowed(OptionsService.RACE, race.get("key").asText(), gm)) {
                throw ApiException.badRequest("Эта раса пока закрыта для оформления.");
            }
            raceName = race.get("key").asText();
            boolean srd = race.path("srd").asBoolean(true);
            boolean flexible = !srd || !req.getFlexibleBonuses().isEmpty();
            if (flexible) {
                // Flexible origin replaces the fixed bonuses (and the half-elf choice).
                bonuses.putAll(flexibleBonuses(req.getFlexibleBonuses()));
            } else {
                race.get("bonuses").fields().forEachRemaining(e -> bonuses.merge(e.getKey(), e.getValue().asInt(), Integer::sum));
            }
            JsonNode choice = flexible ? null : race.get("bonusChoice");
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
            if (srd) {
                speed = race.get("speed").asInt();
                raceLanguages = String.join(", ", asList(race.get("languages")));
                raceTraits = String.join("\n", asList(race.get("traits")));
            } else {
                speed = req.getRaceSpeed() != null ? req.getRaceSpeed() : race.path("speed").asInt(30);
                if (speed < 5 || speed > 60) throw ApiException.badRequest("Скорость расы — от 5 до 60 футов.");
                String size = SIZES.contains(req.getRaceSize()) ? req.getRaceSize() : race.path("size").asText("Средний");
                List<String> lines = new ArrayList<>();
                lines.add("Размер: " + size + ".");
                if (blankToNull(req.getRaceTraits()) != null) lines.add(req.getRaceTraits().strip());
                raceTraits = String.join("\n", lines);
            }
        }

        // ── Background ──
        String backgroundName;
        Set<String> backgroundSkills;
        String backgroundProfs;
        String backgroundEquipment = null;
        if (CUSTOM.equals(req.getBackgroundKey())) {
            if (!options.isAllowed(OptionsService.BACKGROUND, CUSTOM, gm)) {
                throw ApiException.badRequest("Своя предыстория пока закрыта для оформления.");
            }
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
            if (!options.isAllowed(OptionsService.BACKGROUND, bg.get("key").asText(), gm)) {
                throw ApiException.badRequest("Эта предыстория пока закрыта для оформления.");
            }
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

        // ── Class mechanics: from the data, or typed in by the player ──
        int hitDie;
        Set<String> saves;
        String spellAbility;
        String classProfs;
        if (manualClass) {
            hitDie = req.getCustomHitDie() == null ? 0 : req.getCustomHitDie();
            if (!HIT_DICE.contains(hitDie)) throw ApiException.badRequest("Кость хитов класса — к6, к8, к10 или к12.");
            saves = new LinkedHashSet<>(req.getCustomSaves());
            if (saves.size() != 2 || !CharacterRules.ABILITIES.containsAll(saves)) {
                throw ApiException.badRequest("Спасброски класса: две разные характеристики.");
            }
            spellAbility = blankToNull(req.getCustomSpellAbility());
            if (spellAbility != null && !CharacterRules.ABILITIES.contains(spellAbility)) {
                throw ApiException.badRequest("Неизвестная базовая характеристика заклинаний.");
            }
            classProfs = blankToNull(req.getCustomProficiencies());
        } else {
            hitDie = cls.get("hitDie").asInt();
            saves = asSet(cls.get("saves"));
            spellAbility = cls.hasNonNull("spellAbility") ? cls.get("spellAbility").asText() : null;
            classProfs = cls.get("proficiencies").asText();
        }

        // ── Class skills ──
        JsonNode skillChoice = cls.get("skillChoice");
        int classSkillCount = manualClass ? MANUAL_SKILL_LIMIT : skillChoice.get("count").asInt();
        Set<String> allowed = manualClass || skillChoice.get("from").isTextual() ? SKILLS : asSet(skillChoice.get("from"));
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
        int cantripLimit = manualClass ? MANUAL_CANTRIP_LIMIT : cls.get("cantrips").asInt();
        // Classes with no list in spells.json pick from every cantrip.
        boolean classHasList = spellRegistry.getAllSpells().stream()
                .anyMatch(sp -> sp.getClasses() != null && sp.getClasses().contains(classUpper));
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
            if (spell.getLevel() != 0
                    || (classHasList && (spell.getClasses() == null || !spell.getClasses().contains(classUpper)))) {
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
        List<String> equipmentOptions = asList(cls.get("equipment"));
        List<String> equipment = new ArrayList<>();
        if (!equipmentOptions.isEmpty()) {
            int option = Math.max(0, Math.min(equipmentOptions.size() - 1, req.getEquipmentOption()));
            equipment.add(equipmentOptions.get(option));
        }
        if (backgroundEquipment != null) equipment.add(backgroundEquipment);
        if (blankToNull(req.getEquipmentExtra()) != null) equipment.add(req.getEquipmentExtra().strip());

        List<String> profs = new ArrayList<>();
        if (classProfs != null) profs.add(classProfs);
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
                .proficientSaves(saves)
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
                .spellcastingAbility(spellAbility)
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

    // +2/+1 or +1/+1/+1, each to a different ability.
    private static Map<String, Integer> flexibleBonuses(Map<String, Integer> raw) {
        Map<String, Integer> out = new HashMap<>();
        raw.forEach((a, v) -> {
            if (v != null && v != 0) out.put(a, v);
        });
        List<Integer> values = out.values().stream().sorted(Comparator.reverseOrder()).toList();
        if (!CharacterRules.ABILITIES.containsAll(out.keySet())
                || !(values.equals(List.of(2, 1)) || values.equals(List.of(1, 1, 1)))) {
            throw ApiException.badRequest("Гибкие бонусы: +2 и +1 или +1, +1 и +1 к разным характеристикам.");
        }
        return out;
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
