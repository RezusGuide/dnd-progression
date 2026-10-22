package com.backend.entity;

/**
 * Rune level of a character: the highest level they may reach without a
 * clearance (допуск) from the GM. Details live in data/runes.json.
 */
public enum RuneTier {
    COMMON(10),
    ARISTOCRAT(15),
    ROYAL(20);

    private final int levelCap;

    RuneTier(int levelCap) {
        this.levelCap = levelCap;
    }

    public int getLevelCap() {
        return levelCap;
    }
}
