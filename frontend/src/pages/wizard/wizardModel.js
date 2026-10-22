import {
    ABILITY_KEYS, POINT_BUY_BUDGET, isStandardArray, isValidFlexibleBonuses, pointBuySpent, withBonuses,
} from '../../lib/dnd-rules'

// Draft state of the "Заведение личного дела" wizard, plus the pure
// helpers that derive everything else from it. Kept apart from the
// components so the payload sent to POST /api/characters is easy to read.

export const DRAFT_KEY = 'sunny:wizard-draft'

const blankScores = (value) => Object.fromEntries(ABILITY_KEYS.map((k) => [k, value]))

export function emptyDraft() {
    return {
        step: 0,
        raceKey: '',
        customRaceName: '',
        customRaceBonuses: blankScores(0),
        raceBonusChoice: [],
        raceSkills: [],
        // Flexible origin (+2/+1 or +1/+1/+1): always for races without SRD
        // mechanics, by choice ("Гибкие бонусы") for SRD races.
        flexible: false,
        flexibleBonuses: blankScores(0),
        // Races without SRD mechanics: copied from the book by the player.
        raceSpeed: 30,
        raceSize: 'Средний',
        raceTraits: '',
        classKey: '',
        // Classes without mechanics in the data: typed in from the book.
        customHitDie: null,
        customSaves: [],
        customSpellAbility: '',
        customProficiencies: '',
        backgroundKey: '',
        customBackgroundName: '',
        customBackgroundSkills: [],
        customBackgroundProficiencies: '',
        abilityMethod: 'STANDARD',
        standard: blankScores(null),
        pointBuy: blankScores(8),
        rolls: blankScores(null),
        classSkills: [],
        cantrips: [],
        equipmentOption: 0,
        equipmentExtra: '',
        name: '',
        playerName: '',
        alignment: '',
        portraitData: '',
        backstory: '',
        runeTier: 'COMMON',
        startLevel: 1,
        playerComment: '',
    }
}

// localStorage can throw (private mode, blocked storage) - the wizard
// still works, it just won't survive a reload then.
export function loadDraft() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY)
        return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : emptyDraft()
    } catch {
        return emptyDraft()
    }
}

export function saveDraft(draft) {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch { /* storage unavailable - keep going without a saved draft */ }
}

export function clearDraft() {
    try {
        localStorage.removeItem(DRAFT_KEY)
    } catch { /* nothing to clear */ }
}

export const CUSTOM = 'CUSTOM'

// "Другое" is a data row too (key CUSTOM), but it is not a race to read
// mechanics from: selectedRace() never returns it.
export function selectedRace(draft, races) {
    if (draft.raceKey === CUSTOM) return null
    return races?.find((r) => r.key === draft.raceKey) || null
}
export function customRaceRow(races) {
    return races?.find((r) => r.key === CUSTOM) || null
}
export function selectedClass(draft, classes) {
    return classes?.find((c) => c.key === draft.classKey) || null
}
export function selectedBackground(draft, backgrounds) {
    return backgrounds?.find((b) => b.key === draft.backgroundKey) || null
}

// Only "allowed" entries can be picked (the GM also gets "npc_only"
// classes); "unlockable" ones show as locked.
export const isPickable = (entry, gm = false) => !!entry
    && (!entry.status || entry.status === 'allowed' || (gm && entry.status === 'npc_only'))
export const isLocked = (entry) => entry?.status === 'unlockable'

// Races without SRD mechanics (srd: false) always use flexible bonuses.
export const isSrdRace = (race) => race?.srd !== false
export function usesFlexible(draft, race) {
    return !!race && (!isSrdRace(race) || draft.flexible)
}

// Classes without a hit die in the data: the player types the mechanics in.
export const isManualClass = (cls) => !!cls && cls.hitDie == null

export function classHitDie(draft, cls) {
    if (!cls) return null
    return isManualClass(cls) ? draft.customHitDie : cls.hitDie
}

// Racial bonuses as {STR: 2, ...}, including the half-elf's two picks.
export function raceBonuses(draft, races) {
    if (draft.raceKey === CUSTOM) return { ...draft.customRaceBonuses }
    const race = selectedRace(draft, races)
    if (!race) return {}
    if (usesFlexible(draft, race)) {
        return Object.fromEntries(Object.entries(draft.flexibleBonuses).filter(([, v]) => v))
    }
    const out = { ...race.bonuses }
    if (race.bonusChoice) {
        for (const key of draft.raceBonusChoice) out[key] = (out[key] || 0) + race.bonusChoice.amount
    }
    return out
}

// Base scores (before racial bonuses) for the chosen method; null where
// a value is still missing.
export function baseScores(draft) {
    if (draft.abilityMethod === 'POINT_BUY') return { ...draft.pointBuy }
    if (draft.abilityMethod === 'ROLL') {
        return Object.fromEntries(ABILITY_KEYS.map((k) => [k, draft.rolls[k]?.total ?? null]))
    }
    return { ...draft.standard }
}

export function finalScores(draft, races) {
    const base = baseScores(draft)
    if (ABILITY_KEYS.some((k) => base[k] == null)) return null
    return withBonuses(base, raceBonuses(draft, races))
}

export function abilitiesValid(draft) {
    const base = baseScores(draft)
    if (ABILITY_KEYS.some((k) => base[k] == null)) return false
    if (draft.abilityMethod === 'STANDARD') return isStandardArray(base)
    if (draft.abilityMethod === 'POINT_BUY') {
        const spent = pointBuySpent(base)
        return spent !== null && spent <= POINT_BUY_BUDGET
    }
    return true
}

// Skills that come for free (background + race) and can't be unticked.
export function lockedSkills(draft, races, backgrounds) {
    const out = new Set()
    if (draft.backgroundKey === CUSTOM) draft.customBackgroundSkills.forEach((s) => out.add(s))
    else selectedBackground(draft, backgrounds)?.skills.forEach((s) => out.add(s))
    if (draft.raceKey !== CUSTOM) selectedRace(draft, races)?.skills.forEach((s) => out.add(s))
    return out
}

export function raceReady(draft, races) {
    const race = selectedRace(draft, races)
    if (!race || !isPickable(race)) return false
    if (usesFlexible(draft, race)) return isValidFlexibleBonuses(draft.flexibleBonuses)
    return !race.bonusChoice || draft.raceBonusChoice.length === race.bonusChoice.count
}

export function classReady(draft, classes, gm = false) {
    const cls = selectedClass(draft, classes)
    if (!cls || !isPickable(cls, gm)) return false
    if (!isManualClass(cls)) return true
    return [6, 8, 10, 12].includes(draft.customHitDie) && draft.customSaves.length === 2
}

// Typed-in classes: up to 4 cantrips when the player marked them as a
// caster (the server allows the same), none otherwise.
export const MANUAL_CANTRIP_LIMIT = 4
export const MANUAL_SKILL_LIMIT = 4

export function cantripLimit(draft, classes) {
    const cls = selectedClass(draft, classes)
    if (isManualClass(cls)) return draft.customSpellAbility ? MANUAL_CANTRIP_LIMIT : 0
    return cls?.cantrips ?? 0
}

// The JSON body for POST /api/characters.
export function toPayload(draft, races, classes) {
    const race = selectedRace(draft, races)
    const manual = isManualClass(selectedClass(draft, classes))
    const typedRace = draft.raceKey !== CUSTOM && race && !isSrdRace(race)
    return {
        flexibleBonuses: draft.raceKey !== CUSTOM && usesFlexible(draft, race) ? raceBonuses(draft, races) : {},
        raceSpeed: typedRace ? draft.raceSpeed : null,
        raceSize: typedRace ? draft.raceSize : null,
        raceTraits: typedRace ? draft.raceTraits : null,
        customHitDie: manual ? draft.customHitDie : null,
        customSaves: manual ? draft.customSaves : [],
        customSpellAbility: manual ? draft.customSpellAbility : null,
        customProficiencies: manual ? draft.customProficiencies : null,
        raceKey: draft.raceKey,
        customRaceName: draft.customRaceName,
        customRaceBonuses: draft.customRaceBonuses,
        raceBonusChoice: draft.raceBonusChoice,
        raceSkills: draft.raceSkills,
        classKey: draft.classKey,
        backgroundKey: draft.backgroundKey,
        customBackgroundName: draft.customBackgroundName,
        customBackgroundSkills: draft.customBackgroundSkills,
        customBackgroundProficiencies: draft.customBackgroundProficiencies,
        abilityMethod: draft.abilityMethod,
        baseScores: baseScores(draft),
        classSkills: draft.classSkills,
        cantrips: draft.cantrips,
        equipmentOption: draft.equipmentOption,
        equipmentExtra: draft.equipmentExtra,
        name: draft.name.trim(),
        playerName: draft.playerName,
        alignment: draft.alignment,
        portraitData: draft.portraitData,
        backstory: draft.backstory,
        runeTier: draft.runeTier,
        startLevel: draft.startLevel,
        playerComment: draft.playerComment,
    }
}
