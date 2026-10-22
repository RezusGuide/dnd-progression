package com.backend.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Everything the "Заведение личного дела" wizard sends. Base ability scores
 * come without racial bonuses; the server applies those itself.
 */
@Data
public class CharacterCreateRequest {
    // Step 1: race. raceKey is a key from data/races.json or "CUSTOM".
    private String raceKey;
    private String customRaceName;
    private Map<String, Integer> customRaceBonuses = new HashMap<>();
    // Half-elf: the two abilities that get +1.
    private List<String> raceBonusChoice = new ArrayList<>();
    // Half-elf: two skills of any kind.
    private List<String> raceSkills = new ArrayList<>();

    // Step 2: class key from data/classes.json.
    private String classKey;

    // Step 3: background key from data/backgrounds.json or "CUSTOM".
    private String backgroundKey;
    private String customBackgroundName;
    private List<String> customBackgroundSkills = new ArrayList<>();
    private String customBackgroundProficiencies;

    // Step 4: STANDARD | POINT_BUY | ROLL, and STR..CHA before racial bonuses.
    private String abilityMethod;
    private Map<String, Integer> baseScores = new HashMap<>();

    // Step 5: skills chosen from the class list.
    private List<String> classSkills = new ArrayList<>();

    // Step 6: cantrip ids from spells.json.
    private List<String> cantrips = new ArrayList<>();

    // Step 7: 0 = option A, 1 = option B, plus free text.
    private int equipmentOption;
    private String equipmentExtra;

    // Step 8.
    private String name;
    private String playerName;
    private String alignment;
    private String portraitData;
    private String backstory;

    // Step 9: the admission request.
    private String runeTier;
    private Integer startLevel;
    private String playerComment;
}
