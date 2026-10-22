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
    WIZARD: 'INT', ARTIFICER: 'INT',
}

const CASTER_TYPE = {
    BARD: 'full', CLERIC: 'full', DRUID: 'full', SORCERER: 'full', WIZARD: 'full',
    PALADIN: 'half', RANGER: 'half',
    WARLOCK: 'pact',
    ARTIFICER: 'artificer',
}

const norm = (classKey) => String(classKey || '').trim().toUpperCase()

// `stored` is the character's own spellcastingAbility, set at creation for
// classes typed in from the book; the class table wins when it knows the class.
export function spellcastingAbility(classKey, stored = null) {
    return SPELL_ABILITY[norm(classKey)] || stored || null
}

export function casterType(classKey) {
    return CASTER_TYPE[norm(classKey)] || null
}

// Preparing casters choose prepared spells from the ones they know; for
// everyone else every known spell counts as ready. The limit is only
// highlighted on the sheet, never enforced. Cantrips don't count.
const PREPARE = {
    CLERIC: (lvl) => lvl, DRUID: (lvl) => lvl, WIZARD: (lvl) => lvl,
    PALADIN: (lvl) => Math.floor(lvl / 2),
    ARTIFICER: (lvl) => Math.ceil(lvl / 2),
}

export function isPreparingCaster(classKey) {
    return !!PREPARE[norm(classKey)]
}

// Prepared-spell limit: ability mod + (level, half level, or half rounded
// up), at least 1; null for classes that don't prepare.
export function preparedLimit(classKey, level, mod) {
    const levels = PREPARE[norm(classKey)]
    if (!levels) return null
    return Math.max(1, (mod || 0) + levels(clampLevel(level)))
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
    // Artificer: a half caster that rounds up and starts at level 1, i.e. the
    // full-caster row for ceil(level / 2).
    const row = type === 'full' ? FULL_CASTER_SLOTS[lvl - 1]
        : type === 'half' ? HALF_CASTER_SLOTS[lvl - 1]
            : type === 'artificer' ? FULL_CASTER_SLOTS[Math.ceil(lvl / 2) - 1]
                : null
    if (!row) return null
    const out = {}
    row.forEach((n, i) => { if (n) out[i + 1] = n })
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
// and spell point back, death saving throws reset, and spent hit dice
// regained up to half the total (minimum 1). Returns only the changed
// fields so the caller can merge them into the sheet.
export function longRest(sheet) {
    const slots = {}
    for (const [lvl, slot] of Object.entries(sheet.spellSlots || {})) {
        slots[lvl] = { ...slot, current: slot.max ?? 0 }
    }
    const regained = Math.max(1, Math.floor(nonNeg(sheet.hitDiceTotal) / 2))
    return {
        hpCurrent: nonNeg(sheet.hpMax),
        hpTemp: 0,
        spellSlots: slots,
        spellPointsCurrent: sheet.spellPointsMax ?? sheet.spellPointsCurrent ?? null,
        deathSaveSuccesses: 0,
        deathSaveFailures: 0,
        hitDiceUsed: Math.max(0, nonNeg(sheet.hitDiceUsed) - regained),
    }
}

// Hit dice still available for a short rest.
export function hitDiceLeft({ hitDiceTotal, hitDiceUsed }) {
    return Math.max(0, nonNeg(hitDiceTotal) - nonNeg(hitDiceUsed))
}

// Short rest: the player spends some hit dice (never more than they have
// left) and enters what they rolled in total as healing.
export function shortRest(sheet, diceSpent, healed) {
    const dice = Math.min(nonNeg(diceSpent), hitDiceLeft(sheet))
    return {
        ...applyHealing(sheet, dice > 0 ? healed : 0),
        hitDiceUsed: nonNeg(sheet.hitDiceUsed) + dice,
    }
}

// Hit points at the starting level: max hit die + CON at level 1, then the
// die's rounded-up average + CON for every further level (at least 1 each).
// Hit points for one level gained: the die value (rolled, or the average
// half + 1) plus CON, at least 1.
export function averageHitDie(hitDie) {
    return Math.floor(hitDie / 2) + 1
}

export function levelUpHp(dieValue, conMod) {
    return Math.max(1, (Number(dieValue) || 0) + conMod)
}

export function startingHp(hitDie, conMod, level) {
    let hp = Math.max(1, hitDie + conMod)
    const average = Math.floor(hitDie / 2) + 1
    for (let l = 2; l <= clampLevel(level); l++) hp += Math.max(1, average + conMod)
    return hp
}

// ── Ability score generation (character creation) ──

export const ABILITY_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]
export const POINT_BUY_BUDGET = 27
// SRD 5.1 point-buy costs for scores 8..15.
const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }

export function pointBuyCost(score) {
    return POINT_COST[score] ?? null
}

// Points spent on a {STR: 8, ...} map, or null if any score is outside 8..15.
export function pointBuySpent(scores) {
    let total = 0
    for (const key of ABILITY_KEYS) {
        const cost = pointBuyCost(scores[key])
        if (cost === null) return null
        total += cost
    }
    return total
}

// Standard array: every value of 15, 14, 13, 12, 10, 8 used exactly once.
export function isStandardArray(scores) {
    const values = ABILITY_KEYS.map((k) => scores[k]).sort((a, b) => b - a)
    return values.every((v, i) => v === STANDARD_ARRAY[i])
}

// 4d6, drop the lowest. `rng` returns a float in [0, 1) - injectable for tests.
export function roll4d6(rng = Math.random) {
    const dice = Array.from({ length: 4 }, () => 1 + Math.floor(rng() * 6))
    const lowest = Math.min(...dice)
    const dropIndex = dice.indexOf(lowest)
    const total = dice.reduce((sum, d, i) => (i === dropIndex ? sum : sum + d), 0)
    return { dice, dropIndex, total }
}

// Base scores plus racial bonuses ({DEX: 2, ...}).
export function withBonuses(base, bonuses) {
    const out = {}
    for (const key of ABILITY_KEYS) out[key] = (base[key] ?? 0) + (bonuses?.[key] ?? 0)
    return out
}

// ── Money ──

// Value in gold pieces (SRD exchange rates: 1 pp = 10 gp, 1 ep = 0.5 gp,
// 1 sp = 0.1 gp, 1 cp = 0.01 gp), rounded to 2 decimals.
// Flexible origin: either +2 and +1, or +1 three times, each to a different
// ability. `bonuses` is { STR: 2, DEX: 1 }; zeros are ignored.
export function isValidFlexibleBonuses(bonuses) {
    const entries = Object.entries(bonuses || {}).filter(([, v]) => Number(v))
    if (!entries.every(([k]) => ABILITY_KEYS.includes(k))) return false
    const values = entries.map(([, v]) => Number(v)).sort((a, b) => b - a).join(',')
    return values === '2,1' || values === '1,1,1'
}

export function coinsInGold({ cp = 0, sp = 0, ep = 0, gp = 0, pp = 0 }) {
    const total = (cp || 0) / 100 + (sp || 0) / 10 + (ep || 0) / 2 + (gp || 0) + (pp || 0) * 10
    return Math.round(total * 100) / 100
}
