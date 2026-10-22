import { ABILITY_KEYS, POINT_BUY_BUDGET, isStandardArray, pointBuySpent, withBonuses } from '../../lib/dnd-rules'

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
        classKey: '',
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

export function selectedRace(draft, races) {
    return races?.find((r) => r.key === draft.raceKey) || null
}
export function selectedClass(draft, classes) {
    return classes?.find((c) => c.key === draft.classKey) || null
}
export function selectedBackground(draft, backgrounds) {
    return backgrounds?.find((b) => b.key === draft.backgroundKey) || null
}

// Racial bonuses as {STR: 2, ...}, including the half-elf's two picks.
export function raceBonuses(draft, races) {
    if (draft.raceKey === CUSTOM) return { ...draft.customRaceBonuses }
    const race = selectedRace(draft, races)
    if (!race) return {}
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

export function cantripLimit(draft, classes) {
    return selectedClass(draft, classes)?.cantrips ?? 0
}

// The JSON body for POST /api/characters.
export function toPayload(draft) {
    return {
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
