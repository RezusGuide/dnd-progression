// D&D 5e rules used by the character sheet. Pure functions only, no React,
// so every number the sheet shows can be unit-tested (dnd-rules.test.js).
//
// Source for every table here: System Reference Document 5.1 (2014 rules),
// Wizards of the Coast, CC-BY-4.0 - "Character Advancement" (XP, proficiency
// bonus) and the class tables (Bard/Cleric/Druid/Sorcerer/Wizard spell slots,
// Paladin/Ranger spell slots, Warlock Pact Magic).

// ── Abilities and proficiency ──

export const ABILITY_FIELDS = {
    STR: 'strength',
    DEX: 'dexterity',
    CON: 'constitution',
    INT: 'intelligence',
    WIS: 'wisdom',
    CHA: 'charisma',
}

export function abilityMod(score) {
    return Math.floor(((score ?? 10) - 10) / 2)
}

export function formatMod(n) {
    return n >= 0 ? `+${n}` : `${n}`
}

export function clampLevel(level) {
    const n = Math.round(Number(level) || 1)
    return Math.min(20, Math.max(1, n))
}

// SRD 5.1 "Character Advancement": +2 at 1-4, +3 at 5-8, ... +6 at 17-20.
export function proficiencyBonus(level) {
    return Math.ceil(clampLevel(level) / 4) + 1
}

export function saveBonus({ score, proficient, prof }) {
    return abilityMod(score) + (proficient ? prof : 0)
}

export function skillBonus({ score, proficient, expertise, prof }) {
    if (expertise) return abilityMod(score) + prof * 2
    return abilityMod(score) + (proficient ? prof : 0)
}

export function passivePerception(perceptionBonus) {
    return 10 + perceptionBonus
}

// ── Spellcasting ──

const SPELL_ABILITY = {
    BARD: 'CHA', PALADIN: 'CHA', SORCERER: 'CHA', WARLOCK: 'CHA',
    CLERIC: 'WIS', DRUID: 'WIS', RANGER: 'WIS',
    WIZARD: 'INT',
}

const CASTER_TYPE = {
    BARD: 'full', CLERIC: 'full', DRUID: 'full', SORCERER: 'full', WIZARD: 'full',
    PALADIN: 'half', RANGER: 'half',
    WARLOCK: 'pact',
}

const norm = (classKey) => String(classKey || '').trim().toUpperCase()

export function spellcastingAbility(classKey) {
    return SPELL_ABILITY[norm(classKey)] || null
}

export function casterType(classKey) {
    return CASTER_TYPE[norm(classKey)] || null
}

export function spellSaveDC(prof, mod) {
    return 8 + prof + mod
}

export function spellAttackBonus(prof, mod) {
    return prof + mod
}

// Slots per spell level (index 0 = 1st level) for character levels 1..20.
const FULL_CASTER_SLOTS = [
    [2],
    [3],
    [4, 2],
    [4, 3],
    [4, 3, 2],
    [4, 3, 3],
    [4, 3, 3, 1],
    [4, 3, 3, 2],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1, 1],
    [4, 3, 3, 3, 2, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

const HALF_CASTER_SLOTS = [
    [],
    [2],
    [3],
    [3],
    [4, 2],
    [4, 2],
    [4, 3],
    [4, 3],
    [4, 3, 2],
    [4, 3, 2],
    [4, 3, 3],
    [4, 3, 3],
    [4, 3, 3, 1],
    [4, 3, 3, 1],
    [4, 3, 3, 2],
    [4, 3, 3, 2],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2],
]

// Warlock Pact Magic: [number of slots, slot level].
const PACT_SLOTS = [
    [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
    [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
]

// Max slots by spell level as { "1": n, ... } (only levels with slots), or
// null for a class with no spellcasting table.
export function spellSlotsFor(classKey, level) {
    const lvl = clampLevel(level)
    const type = casterType(classKey)
    if (type === 'pact') {
        const [count, slotLevel] = PACT_SLOTS[lvl - 1]
        return { [slotLevel]: count }
    }
    const table = type === 'full' ? FULL_CASTER_SLOTS : type === 'half' ? HALF_CASTER_SLOTS : null
    if (!table) return null
    const out = {}
    table[lvl - 1].forEach((n, i) => { if (n) out[i + 1] = n })
    return out
}

// ── Experience ──

// Minimum XP for levels 1..20.
export const XP_THRESHOLDS = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
    85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
]

export function levelForXp(xp) {
    let level = 1
    XP_THRESHOLDS.forEach((min, i) => { if ((xp ?? 0) >= min) level = i + 1 })
    return level
}

// XP needed to reach the level after `level`, or null at 20.
export function nextLevelXp(level) {
    const lvl = clampLevel(level)
    return lvl >= 20 ? null : XP_THRESHOLDS[lvl]
}

export function canLevelUp(xp, level) {
    const next = nextLevelXp(level)
    return next !== null && (xp ?? 0) >= next
}

// ── Hit points ──

const nonNeg = (n) => Math.max(0, Math.round(Number(n) || 0))

// Damage burns temporary hit points first, then current; never below 0.
export function applyDamage({ hpCurrent, hpTemp }, amount) {
    let dmg = nonNeg(amount)
    let temp = nonNeg(hpTemp)
    const fromTemp = Math.min(temp, dmg)
    temp -= fromTemp
    dmg -= fromTemp
    return { hpCurrent: Math.max(0, nonNeg(hpCurrent) - dmg), hpTemp: temp }
}

// Healing never goes above the maximum. Healing from 0 also clears the
// death saving throws (the character is back on their feet).
export function applyHealing({ hpCurrent, hpMax, deathSaveSuccesses, deathSaveFailures }, amount) {
    const max = nonNeg(hpMax)
    const next = Math.min(max, nonNeg(hpCurrent) + nonNeg(amount))
    const revived = next > 0
    return {
        hpCurrent: next,
        deathSaveSuccesses: revived ? 0 : (deathSaveSuccesses ?? 0),
        deathSaveFailures: revived ? 0 : (deathSaveFailures ?? 0),
    }
}

// Long rest: full hit points, temporary hit points gone, every spell slot
// and spell point back, death saving throws reset. Returns only the
// changed fields so the caller can merge them into the sheet.
export function longRest(sheet) {
    const slots = {}
    for (const [lvl, slot] of Object.entries(sheet.spellSlots || {})) {
        slots[lvl] = { ...slot, current: slot.max ?? 0 }
    }
    return {
        hpCurrent: nonNeg(sheet.hpMax),
        hpTemp: 0,
        spellSlots: slots,
        spellPointsCurrent: sheet.spellPointsMax ?? sheet.spellPointsCurrent ?? null,
        deathSaveSuccesses: 0,
        deathSaveFailures: 0,
    }
}

// ── Money ──

// Value in gold pieces (SRD exchange rates: 1 pp = 10 gp, 1 ep = 0.5 gp,
// 1 sp = 0.1 gp, 1 cp = 0.01 gp), rounded to 2 decimals.
export function coinsInGold({ cp = 0, sp = 0, ep = 0, gp = 0, pp = 0 }) {
    const total = (cp || 0) / 100 + (sp || 0) / 10 + (ep || 0) / 2 + (gp || 0) + (pp || 0) * 10
    return Math.round(total * 100) / 100
}
