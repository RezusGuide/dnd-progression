// Shared helpers for localized spell display. Spell content lives in
// spells.json (backend) and arrives with an optional nameRu/descriptionRu
// per entry - translation is being filled in gradually level by level, so
// every call site falls back to the English field whenever the Russian one
// is still missing, rather than the UI ever showing a blank.
export function spellName(spell, lang) {
    if (!spell) return ''
    return (lang === 'ru' && spell.nameRu) ? spell.nameRu : spell.name
}

export function spellDescription(spell, lang) {
    if (!spell) return ''
    return (lang === 'ru' && spell.descriptionRu) ? spell.descriptionRu : spell.description
}
