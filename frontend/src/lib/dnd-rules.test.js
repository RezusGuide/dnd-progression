import { describe, expect, it } from 'vitest'
import {
    abilityMod, applyDamage, applyHealing, canLevelUp, casterType, coinsInGold, formatMod,
    levelForXp, longRest, nextLevelXp, passivePerception, proficiencyBonus, saveBonus,
    skillBonus, spellAttackBonus, spellSaveDC, spellSlotsFor, spellcastingAbility,
} from './dnd-rules'

describe('ability modifiers', () => {
    it('follows (score - 10) / 2 rounded down', () => {
        expect(abilityMod(1)).toBe(-5)
        expect(abilityMod(8)).toBe(-1)
        expect(abilityMod(9)).toBe(-1)
        expect(abilityMod(10)).toBe(0)
        expect(abilityMod(11)).toBe(0)
        expect(abilityMod(18)).toBe(4)
        expect(abilityMod(30)).toBe(10)
    })
    it('treats a missing score as 10', () => {
        expect(abilityMod(null)).toBe(0)
    })
    it('formats with a sign', () => {
        expect(formatMod(3)).toBe('+3')
        expect(formatMod(0)).toBe('+0')
        expect(formatMod(-1)).toBe('-1')
    })
})

describe('proficiency bonus by level', () => {
    it.each([
        [1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4],
        [13, 5], [16, 5], [17, 6], [20, 6],
    ])('level %i -> +%i', (level, bonus) => {
        expect(proficiencyBonus(level)).toBe(bonus)
    })
    it('clamps out-of-range levels', () => {
        expect(proficiencyBonus(0)).toBe(2)
        expect(proficiencyBonus(25)).toBe(6)
    })
})

describe('saves, skills, passive perception', () => {
    it('adds proficiency only when proficient', () => {
        expect(saveBonus({ score: 14, proficient: false, prof: 3 })).toBe(2)
        expect(saveBonus({ score: 14, proficient: true, prof: 3 })).toBe(5)
    })
    it('doubles proficiency for expertise', () => {
        expect(skillBonus({ score: 13, proficient: false, expertise: false, prof: 3 })).toBe(1)
        expect(skillBonus({ score: 13, proficient: true, expertise: false, prof: 3 })).toBe(4)
        expect(skillBonus({ score: 13, proficient: true, expertise: true, prof: 3 })).toBe(7)
    })
    it('passive perception is 10 + the Perception bonus', () => {
        expect(passivePerception(3)).toBe(13)
    })
})

describe('spellcasting', () => {
    it('picks the spellcasting ability by class', () => {
        expect(spellcastingAbility('Wizard')).toBe('INT')
        expect(spellcastingAbility('Cleric')).toBe('WIS')
        expect(spellcastingAbility('WARLOCK')).toBe('CHA')
        expect(spellcastingAbility('Fighter')).toBeNull()
    })
    it('computes DC and attack bonus', () => {
        expect(spellSaveDC(3, 4)).toBe(15)
        expect(spellAttackBonus(3, 4)).toBe(7)
    })
    it('classifies caster types', () => {
        expect(casterType('Bard')).toBe('full')
        expect(casterType('Ranger')).toBe('half')
        expect(casterType('Warlock')).toBe('pact')
        expect(casterType('Monk')).toBeNull()
    })
})

describe('spell slot tables (SRD 5.1)', () => {
    it('full caster', () => {
        expect(spellSlotsFor('Wizard', 1)).toEqual({ 1: 2 })
        expect(spellSlotsFor('Wizard', 3)).toEqual({ 1: 4, 2: 2 })
        expect(spellSlotsFor('Wizard', 5)).toEqual({ 1: 4, 2: 3, 3: 2 })
        expect(spellSlotsFor('Cleric', 9)).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 })
        expect(spellSlotsFor('Bard', 20)).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 })
    })
    it('half caster', () => {
        expect(spellSlotsFor('Paladin', 1)).toEqual({})
        expect(spellSlotsFor('Paladin', 2)).toEqual({ 1: 2 })
        expect(spellSlotsFor('Ranger', 5)).toEqual({ 1: 4, 2: 2 })
        expect(spellSlotsFor('Ranger', 9)).toEqual({ 1: 4, 2: 3, 3: 2 })
        expect(spellSlotsFor('Paladin', 20)).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 })
    })
    it('warlock pact magic', () => {
        expect(spellSlotsFor('Warlock', 1)).toEqual({ 1: 1 })
        expect(spellSlotsFor('Warlock', 2)).toEqual({ 1: 2 })
        expect(spellSlotsFor('Warlock', 5)).toEqual({ 3: 2 })
        expect(spellSlotsFor('Warlock', 11)).toEqual({ 5: 3 })
        expect(spellSlotsFor('Warlock', 17)).toEqual({ 5: 4 })
    })
    it('non-casters have no table', () => {
        expect(spellSlotsFor('Fighter', 5)).toBeNull()
    })
})

describe('experience thresholds', () => {
    it('maps XP to level at the boundaries', () => {
        expect(levelForXp(0)).toBe(1)
        expect(levelForXp(299)).toBe(1)
        expect(levelForXp(300)).toBe(2)
        expect(levelForXp(6500)).toBe(5)
        expect(levelForXp(13999)).toBe(5)
        expect(levelForXp(355000)).toBe(20)
    })
    it('gives the XP for the next level', () => {
        expect(nextLevelXp(1)).toBe(300)
        expect(nextLevelXp(5)).toBe(14000)
        expect(nextLevelXp(19)).toBe(355000)
        expect(nextLevelXp(20)).toBeNull()
    })
    it('knows when a level-up is due', () => {
        expect(canLevelUp(13999, 5)).toBe(false)
        expect(canLevelUp(14000, 5)).toBe(true)
        expect(canLevelUp(999999, 20)).toBe(false)
    })
})

describe('damage and healing', () => {
    it('damage burns temporary hit points first', () => {
        expect(applyDamage({ hpCurrent: 21, hpTemp: 3 }, 5)).toEqual({ hpCurrent: 19, hpTemp: 0 })
        expect(applyDamage({ hpCurrent: 21, hpTemp: 8 }, 5)).toEqual({ hpCurrent: 21, hpTemp: 3 })
    })
    it('damage never goes below 0', () => {
        expect(applyDamage({ hpCurrent: 4, hpTemp: 0 }, 50)).toEqual({ hpCurrent: 0, hpTemp: 0 })
    })
    it('healing stops at the maximum', () => {
        expect(applyHealing({ hpCurrent: 19, hpMax: 27 }, 20).hpCurrent).toBe(27)
        expect(applyHealing({ hpCurrent: 10, hpMax: 27 }, 5).hpCurrent).toBe(15)
    })
    it('healing from 0 clears death saving throws', () => {
        const out = applyHealing({ hpCurrent: 0, hpMax: 27, deathSaveSuccesses: 2, deathSaveFailures: 1 }, 3)
        expect(out).toEqual({ hpCurrent: 3, deathSaveSuccesses: 0, deathSaveFailures: 0 })
    })
    it('ignores negative or junk amounts', () => {
        expect(applyDamage({ hpCurrent: 10, hpTemp: 0 }, -5).hpCurrent).toBe(10)
        expect(applyHealing({ hpCurrent: 10, hpMax: 20 }, 'abc').hpCurrent).toBe(10)
    })
})

describe('long rest', () => {
    it('restores hit points and slots, clears temp HP and death saves', () => {
        const out = longRest({
            hpMax: 27, hpCurrent: 4, hpTemp: 3,
            spellSlots: { 1: { max: 4, current: 2 }, 3: { max: 2, current: 0 } },
            spellPointsMax: null, spellPointsCurrent: null,
            deathSaveSuccesses: 1, deathSaveFailures: 2,
        })
        expect(out).toEqual({
            hpCurrent: 27,
            hpTemp: 0,
            spellSlots: { 1: { max: 4, current: 4 }, 3: { max: 2, current: 2 } },
            spellPointsCurrent: null,
            deathSaveSuccesses: 0,
            deathSaveFailures: 0,
        })
    })
    it('restores spell points when the variant is in use', () => {
        expect(longRest({ hpMax: 1, spellPointsMax: 27, spellPointsCurrent: 3 }).spellPointsCurrent).toBe(27)
    })
})

describe('coins', () => {
    it('converts to gold', () => {
        expect(coinsInGold({ cp: 150, sp: 12, ep: 3, gp: 40, pp: 2 })).toBe(64.2)
    })
})
