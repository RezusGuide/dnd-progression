// Same caster list as the backend's SpellAccess (com.backend.research) - which of the twelve modeled 5e
// classes can cast spells at all, and normalization for the free-text
// Character.characterClass field so "Wizard"/"wizard "/"WIZARD" all match
// the class keys used in Spell.classes. Base-rules eligibility only, same
// simplification the backend makes (no Eldritch Knight/Arcane Trickster
// carve-outs, no multiclassing).
export const CASTER_CLASSES = ['BARD', 'CLERIC', 'DRUID', 'PALADIN', 'RANGER', 'SORCERER', 'WARLOCK', 'WIZARD']

// No spellcasting in the base rules - blocked from the research system
// entirely. A skills/fighting-style minigame for these is planned
// separately, not part of this pass.
export const NON_CASTER_CLASSES = ['FIGHTER', 'BARBARIAN', 'ROGUE', 'MONK']

export function normalizeClass(characterClass) {
    return characterClass ? characterClass.trim().toUpperCase() : ''
}

export function isNonCaster(characterClass) {
    return NON_CASTER_CLASSES.includes(normalizeClass(characterClass))
}

// True for a recognized caster class, or an unrecognized string (typo,
// homebrew name, blank field) - mirrors the backend's fail-open behavior:
// we only ever filter a spell list down when we're sure the class doesn't
// get it, never when we just don't recognize the class string.
export function isSpellEligible(characterClass, spell) {
    const cls = normalizeClass(characterClass)
    if (!CASTER_CLASSES.includes(cls)) return true
    if (!spell.classes || spell.classes.length === 0) return true
    return spell.classes.includes(cls)
}
