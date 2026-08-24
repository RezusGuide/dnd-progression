package com.backend.service;

import java.util.Set;

/**
 * Which 5e classes can cast spells at all, and normalization for the free-text
 * Character#characterClass field so "Wizard", " wizard ", "WIZARD" all match
 * the same catalog key used in Spell#classes.
 *
 * Deliberately simple: base-rules eligibility only (no Eldritch Knight /
 * Arcane Trickster subclass carve-outs for Fighter/Rogue, no multiclass
 * spell-slot math) - matches what the character sheet actually models today.
 * A class string that doesn't normalize to one of the twelve keys below
 * (typo, homebrew name, blank field) is treated as unknown and left
 * unrestricted rather than silently blocking a character over a string
 * mismatch - see ResearchServiceImpl's use of this class.
 */
public final class CasterClasses {

    private CasterClasses() {
    }

    public static final Set<String> CASTER_CLASSES = Set.of(
            "BARD", "CLERIC", "DRUID", "PALADIN", "RANGER", "SORCERER", "WARLOCK", "WIZARD"
    );

    // No spellcasting in the base rules - "logical connections" per the
    // spell-catalog class-gating request: these classes get an outright
    // "spells aren't for you" message instead of a spell list to check
    // against. A skills/maneuvers/fighting-style minigame for them is
    // planned separately, not part of this pass.
    public static final Set<String> NON_CASTER_CLASSES = Set.of(
            "FIGHTER", "BARBARIAN", "ROGUE", "MONK"
    );

    public static String normalize(String characterClass) {
        return characterClass == null ? "" : characterClass.trim().toUpperCase();
    }
}
