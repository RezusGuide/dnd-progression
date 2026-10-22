package com.backend.research;

import java.util.Map;

/**
 * The highest spell level a caster can research at a character level - the
 * highest slot level of their table (magic-v2.md, section 7). Mirrors
 * spellSlotsFor() in the frontend's lib/dnd-rules.js; the tests check the
 * same levels on both sides.
 */
public final class SpellAccess {

    public enum CasterType { FULL, HALF, ARTIFICER, PACT }

    private static final Map<String, CasterType> TYPES = Map.of(
            "BARD", CasterType.FULL, "CLERIC", CasterType.FULL, "DRUID", CasterType.FULL,
            "SORCERER", CasterType.FULL, "WIZARD", CasterType.FULL,
            "PALADIN", CasterType.HALF, "RANGER", CasterType.HALF,
            "ARTIFICER", CasterType.ARTIFICER,
            "WARLOCK", CasterType.PACT);

    // Highest slot level for character levels 1..20.
    private static final int[] FULL = {1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9};
    private static final int[] HALF = {0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5};
    private static final int[] PACT = {1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5};

    private SpellAccess() {
    }

    /** The class's table, or null when the class is not a known caster. */
    public static CasterType casterType(String characterClass) {
        return characterClass == null ? null : TYPES.get(characterClass.strip().toUpperCase());
    }

    public static int maxSpellLevel(CasterType type, int characterLevel) {
        int i = Math.max(1, Math.min(20, characterLevel)) - 1;
        return switch (type) {
            case FULL -> FULL[i];
            case HALF -> HALF[i];
            // Half caster rounded up from level 1 = the full row for ceil(L / 2).
            case ARTIFICER -> FULL[(i + 2) / 2 - 1];
            case PACT -> PACT[i];
        };
    }

    /** The first character level that reaches this spell level, or -1 if none does. */
    public static int levelFor(CasterType type, int spellLevel) {
        for (int level = 1; level <= 20; level++) {
            if (maxSpellLevel(type, level) >= spellLevel) return level;
        }
        return -1;
    }
}
