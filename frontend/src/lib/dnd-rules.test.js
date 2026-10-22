import { describe, expect, it } from 'vitest'
import {
    abilityMod, applyDamage, applyHealing, canLevelUp, casterType, coinsInGold, formatMod,
    levelForXp, longRest, nextLevelXp, passivePerception, proficiencyBonus, saveBonus,
    skillBonus, spellAttackBonus, spellSaveDC, spellSlotsFor, spellcastingAbility,
    hitDiceLeft, shortRest, startingHp, pointBuyCost, pointBuySpent, isStandardArray,
    roll4d6, withBonuses, averageHitDie, levelUpHp, isValidFlexibleBonuses,
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
            hpMax: 27, hpCurrent: 4, hpTemp: 3, hitDiceTotal: 5, hitDiceUsed: 4,
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
            hitDiceUsed: 2, // regained floor(5 / 2) = 2
        })
    })
    it('gives back at least one hit die, never below zero spent', () => {
        expect(longRest({ hpMax: 1, hitDiceTotal: 1, hitDiceUsed: 1 }).hitDiceUsed).toBe(0)
        expect(longRest({ hpMax: 1, hitDiceTotal: 10, hitDiceUsed: 3 }).hitDiceUsed).toBe(0)
        expect(longRest({ hpMax: 1, hitDiceTotal: 10, hitDiceUsed: 8 }).hitDiceUsed).toBe(3)
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

describe('short rest and hit dice', () => {
    it('counts the dice left', () => {
        expect(hitDiceLeft({ hitDiceTotal: 5, hitDiceUsed: 2 })).toBe(3)
        expect(hitDiceLeft({ hitDiceTotal: 5, hitDiceUsed: null })).toBe(5)
    })
    it('spends dice and heals up to the maximum', () => {
        expect(shortRest({ hpCurrent: 10, hpMax: 27, hitDiceTotal: 5, hitDiceUsed: 1 }, 2, 9))
            .toMatchObject({ hpCurrent: 19, hitDiceUsed: 3 })
        expect(shortRest({ hpCurrent: 25, hpMax: 27, hitDiceTotal: 5, hitDiceUsed: 0 }, 1, 9).hpCurrent).toBe(27)
    })
    it('never spends more dice than are left, and heals nothing without dice', () => {
        expect(shortRest({ hpCurrent: 10, hpMax: 27, hitDiceTotal: 5, hitDiceUsed: 4 }, 3, 12).hitDiceUsed).toBe(5)
        expect(shortRest({ hpCurrent: 10, hpMax: 27, hitDiceTotal: 5, hitDiceUsed: 5 }, 2, 12))
            .toMatchObject({ hpCurrent: 10, hitDiceUsed: 5 })
    })
})

describe('starting hit points', () => {
    it('max die + CON at level 1', () => {
        expect(startingHp(6, 1, 1)).toBe(7)
        expect(startingHp(12, 3, 1)).toBe(15)
    })
    it('rounded-up average + CON per further level', () => {
        expect(startingHp(8, 2, 3)).toBe(10 + 7 + 7) // d8 average 5
        expect(startingHp(10, 0, 5)).toBe(10 + 6 * 4)
    })
    it('never adds less than 1 per level', () => {
        expect(startingHp(6, -5, 3)).toBe(1 + 1 + 1)
    })
})

describe('ability score methods', () => {
    it('point-buy costs follow the SRD table', () => {
        expect(pointBuyCost(8)).toBe(0)
        expect(pointBuyCost(13)).toBe(5)
        expect(pointBuyCost(14)).toBe(7)
        expect(pointBuyCost(15)).toBe(9)
        expect(pointBuyCost(16)).toBeNull()
        expect(pointBuyCost(7)).toBeNull()
    })
    it('adds up the points spent', () => {
        expect(pointBuySpent({ STR: 8, DEX: 14, CON: 13, INT: 15, WIS: 12, CHA: 10 })).toBe(0 + 7 + 5 + 9 + 4 + 2)
        expect(pointBuySpent({ STR: 15, DEX: 15, CON: 15, INT: 8, WIS: 8, CHA: 8 })).toBe(27)
        expect(pointBuySpent({ STR: 16, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 })).toBeNull()
    })
    it('checks the standard array', () => {
        expect(isStandardArray({ STR: 8, DEX: 14, CON: 13, INT: 15, WIS: 12, CHA: 10 })).toBe(true)
        expect(isStandardArray({ STR: 15, DEX: 15, CON: 13, INT: 12, WIS: 10, CHA: 8 })).toBe(false)
    })
    it('rolls 4d6 and drops the lowest die', () => {
        const seq = [0.0, 0.99, 0.5, 0.2] // 1, 6, 4, 2
        let i = 0
        const out = roll4d6(() => seq[i++])
        expect(out.dice).toEqual([1, 6, 4, 2])
        expect(out.dropIndex).toBe(0)
        expect(out.total).toBe(12)
    })
    it('applies racial bonuses', () => {
        expect(withBonuses({ STR: 8, DEX: 14, CON: 13, INT: 15, WIS: 12, CHA: 10 }, { DEX: 2, INT: 1 }))
            .toEqual({ STR: 8, DEX: 16, CON: 13, INT: 16, WIS: 12, CHA: 10 })
    })
})

describe('artificer (half caster, rounded up, from level 1)', () => {
    it('has slots from level 1', () => {
        expect(casterType('Artificer')).toBe('artificer')
        expect(spellcastingAbility('Artificer')).toBe('INT')
        expect(spellSlotsFor('Artificer', 1)).toEqual({ 1: 2 })
        expect(spellSlotsFor('Artificer', 2)).toEqual({ 1: 2 })
        expect(spellSlotsFor('Artificer', 3)).toEqual({ 1: 3 })
    })
    it('matches the full-caster row for ceil(level / 2)', () => {
        expect(spellSlotsFor('Artificer', 5)).toEqual({ 1: 4, 2: 2 })
        expect(spellSlotsFor('Artificer', 9)).toEqual({ 1: 4, 2: 3, 3: 2 })
        expect(spellSlotsFor('Artificer', 20)).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 })
    })
    it('falls back to the stored ability for classes not in the table', () => {
        expect(spellcastingAbility('Alchemist', 'INT')).toBe('INT')
        expect(spellcastingAbility('Wizard', 'CHA')).toBe('INT')
    })
})

describe('hit points on level-up', () => {
    it('average is half the die + 1', () => {
        expect(averageHitDie(6)).toBe(4)
        expect(averageHitDie(8)).toBe(5)
        expect(averageHitDie(12)).toBe(7)
    })
    it('adds CON and never less than 1', () => {
        expect(levelUpHp(5, 2)).toBe(7)
        expect(levelUpHp(1, -4)).toBe(1)
    })
})

describe('flexible origin bonuses', () => {
    it('accepts +2/+1 and +1/+1/+1', () => {
        expect(isValidFlexibleBonuses({ DEX: 2, WIS: 1 })).toBe(true)
        expect(isValidFlexibleBonuses({ STR: 1, CON: 1, CHA: 1, INT: 0 })).toBe(true)
    })
    it('rejects anything else', () => {
        expect(isValidFlexibleBonuses({ DEX: 2, WIS: 2 })).toBe(false)
        expect(isValidFlexibleBonuses({ DEX: 2 })).toBe(false)
        expect(isValidFlexibleBonuses({ DEX: 1, WIS: 1 })).toBe(false)
        expect(isValidFlexibleBonuses({ LUCK: 2, WIS: 1 })).toBe(false)
    })
})
