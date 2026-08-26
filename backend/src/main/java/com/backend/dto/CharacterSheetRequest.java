package com.backend.dto;

import com.backend.entity.Attack;
import lombok.Data;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Full-sheet save payload for PUT /api/characters/{id}/sheet - the
 * frontend sends the whole form state on every autosave rather than one
 * field at a time, so this mirrors every editable field on
 * CharacterSheet.jsx. Campaign assignment, materials (spell research), and
 * timestamps aren't here - those aren't edited from the sheet page.
 */
@Data
public class CharacterSheetRequest {

    // Header
    private String name;
    private String characterClass;
    private int level;
    private String race;
    private String background;
    private String playerName;
    private String alignment;
    private Integer experiencePoints;
    private String portraitData;

    // Ability scores
    private Integer strength;
    private Integer dexterity;
    private Integer constitution;
    private Integer intelligence;
    private Integer wisdom;
    private Integer charisma;
    private Integer proficiencyBonus;

    // Proficiencies
    private Set<String> proficientSaves;
    private Set<String> proficientSkills;
    private Set<String> expertiseSkills;

    // Combat
    private Integer armorClass;
    private Integer initiativeOverride;
    private Integer speed;
    private Integer hpMax;
    private Integer hpCurrent;
    private Integer hpTemp;
    private Integer hitDiceTotal;
    private String hitDiceType;
    private Integer deathSaveSuccesses;
    private Integer deathSaveFailures;
    private boolean inspiration;

    // Attacks & spellcasting
    private List<Attack> attacks;
    private String spellNotes;

    // Spell slots (key: level as a string, "1".."9") and the optional
    // spell-points variant - see Character#spellSlotsJson.
    private Map<String, SpellSlotLevel> spellSlots;
    private Integer spellPointsMax;
    private Integer spellPointsCurrent;

    // Equipment & currency
    private String equipment;
    private Integer cp;
    private Integer sp;
    private Integer ep;
    private Integer gp;
    private Integer pp;
    private String otherProficiencies;

    // Personality
    private String personalityTraits;
    private String ideals;
    private String bonds;
    private String flaws;
    private String featuresAndTraits;

    // Character details (back of sheet)
    private String age;
    private String height;
    private String weight;
    private String eyes;
    private String skin;
    private String hair;
    private String appearance;
    private String alliesOrganizations;
    private String organizationName;
    private String backstory;
    private String additionalFeatures;
    private String treasure;
}
