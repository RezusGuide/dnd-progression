package com.backend.service;

import java.util.List;
import java.util.Map;

/**
 * The few 5e rules the server needs when creating and levelling a
 * character. Mirrors frontend/src/lib/dnd-rules.js (tested there with
 * Vitest); source is the SRD 5.1.
 */
public final class CharacterRules {

    public static final List<String> ABILITIES = List.of("STR", "DEX", "CON", "INT", "WIS", "CHA");
    public static final List<Integer> STANDARD_ARRAY = List.of(15, 14, 13, 12, 10, 8);
    public static final int POINT_BUY_BUDGET = 27;
    private static final Map<Integer, Integer> POINT_COST = Map.of(
            8, 0, 9, 1, 10, 2, 11, 3, 12, 4, 13, 5, 14, 7, 15, 9);
    private static final int[] XP_THRESHOLDS = {
            0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
            85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
    };

    private CharacterRules() {
    }

    public static int abilityMod(int score) {
        return Math.floorDiv(score - 10, 2);
    }

    public static int proficiencyBonus(int level) {
        return (Math.max(1, Math.min(20, level)) + 3) / 4 + 1;
    }

    /** Point-buy cost of one score, or -1 when the score is outside 8..15. */
    public static int pointBuyCost(int score) {
        return POINT_COST.getOrDefault(score, -1);
    }

    /**
     * Hit points at the starting level: max hit die + CON at level 1, then
     * the die's rounded-up average + CON for every further level (minimum
     * 1 per level).
     */
    public static int startingHp(int hitDie, int conMod, int level) {
        int hp = Math.max(1, hitDie + conMod);
        int average = hitDie / 2 + 1;
        for (int l = 2; l <= level; l++) {
            hp += Math.max(1, average + conMod);
        }
        return hp;
    }

    /** Fixed hit points per level instead of rolling: half the die + 1. */
    public static int averageHitDie(int hitDie) {
        return hitDie / 2 + 1;
    }

    /** Hit points for one new level: the die value + CON mod, at least 1. */
    public static int levelUpHp(int dieValue, int conMod) {
        return Math.max(1, dieValue + conMod);
    }

    /** "d8" -> 8; 8 when the field is empty or odd. */
    public static int hitDieOf(String hitDiceType) {
        try {
            return Integer.parseInt(hitDiceType.strip().substring(1));
        } catch (RuntimeException e) {
            return 8;
        }
    }

    public static int xpForLevel(int level) {
        return XP_THRESHOLDS[Math.max(1, Math.min(20, level)) - 1];
    }
}
