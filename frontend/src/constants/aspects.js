// The full Thaumcraft 4 aspect tree: 6 primal aspects and ~44 compound
// aspects built by combining two aspects at a time (see AspectRecipe on
// the backend, seeded from the same chart this list was transcribed
// from). Shared by the material pouch (CharacterSheet.jsx), the crafting
// page (AspectCraft.jsx), the research grid palette (Research.jsx), and
// the admin grant forms (Admin.jsx) so they can't drift out of sync.
//
// Names stay in Latin in both languages - they're proper nouns, not
// translated, same convention as the source chart itself. Only the
// one-line descriptions are localized, via descKey into LangContext.
export const ASPECTS = [
    // Primal (6)
    { key: 'AER', descKey: 'aspectAerDesc', primal: true },
    { key: 'IGNIS', descKey: 'aspectIgnisDesc', primal: true },
    { key: 'AQUA', descKey: 'aspectAquaDesc', primal: true },
    { key: 'TERRA', descKey: 'aspectTerraDesc', primal: true },
    { key: 'ORDO', descKey: 'aspectOrdoDesc', primal: true },
    { key: 'PERDITIO', descKey: 'aspectPerditioDesc', primal: true },

    // Compound (~44)
    { key: 'VACUOS', descKey: 'aspectVacuosDesc', primal: false },
    { key: 'LUX', descKey: 'aspectLuxDesc', primal: false },
    { key: 'TEMPESTAS', descKey: 'aspectTempestasDesc', primal: false },
    { key: 'MOTUS', descKey: 'aspectMotusDesc', primal: false },
    { key: 'VICTUS', descKey: 'aspectVictusDesc', primal: false },
    { key: 'POTENTIA', descKey: 'aspectPotentiaDesc', primal: false },
    { key: 'PERMUTATIO', descKey: 'aspectPermutatioDesc', primal: false },
    { key: 'PRAECANTATIO', descKey: 'aspectPraecantatioDesc', primal: false },
    { key: 'TENEBRAE', descKey: 'aspectTenebraeDesc', primal: false },
    { key: 'VITIUM', descKey: 'aspectVitiumDesc', primal: false },
    { key: 'ALIENIS', descKey: 'aspectAlienisDesc', primal: false },
    { key: 'AURAM', descKey: 'aspectAuramDesc', primal: false },
    { key: 'FAMES', descKey: 'aspectFamesDesc', primal: false },
    { key: 'VENENUM', descKey: 'aspectVenenumDesc', primal: false },
    { key: 'MORTUUS', descKey: 'aspectMortuusDesc', primal: false },
    { key: 'SPIRITUS', descKey: 'aspectSpiritusDesc', primal: false },
    { key: 'SANO', descKey: 'aspectSanoDesc', primal: false },
    { key: 'VOLATUS', descKey: 'aspectVolatusDesc', primal: false },
    { key: 'BESTIA', descKey: 'aspectBestiaDesc', primal: false },
    { key: 'CORPUS', descKey: 'aspectCorpusDesc', primal: false },
    { key: 'EXANIMIS', descKey: 'aspectExanimisDesc', primal: false },
    { key: 'SENSUS', descKey: 'aspectSensusDesc', primal: false },
    { key: 'VINCULUM', descKey: 'aspectVinculumDesc', primal: false },
    { key: 'COGNITIO', descKey: 'aspectCognitioDesc', primal: false },
    { key: 'HUMANUS', descKey: 'aspectHumanusDesc', primal: false },
    { key: 'INSTRUMENTUM', descKey: 'aspectInstrumentumDesc', primal: false },
    { key: 'PANNUS', descKey: 'aspectPannusDesc', primal: false },
    { key: 'FABRICO', descKey: 'aspectFabricoDesc', primal: false },
    { key: 'LUCRUM', descKey: 'aspectLucrumDesc', primal: false },
    { key: 'LIMUS', descKey: 'aspectLimusDesc', primal: false },
    { key: 'GELUM', descKey: 'aspectGelumDesc', primal: false },
    { key: 'ITER', descKey: 'aspectIterDesc', primal: false },
    { key: 'HERBA', descKey: 'aspectHerbaDesc', primal: false },
    { key: 'GRANUM', descKey: 'aspectGranumDesc', primal: false },
    { key: 'ARBOR', descKey: 'aspectArborDesc', primal: false },
    { key: 'MESSIS', descKey: 'aspectMessisDesc', primal: false },
    { key: 'METO', descKey: 'aspectMetoDesc', primal: false },
    { key: 'PERFODIO', descKey: 'aspectPerfodioDesc', primal: false },
    { key: 'SAXUM', descKey: 'aspectSaxumDesc', primal: false },
    { key: 'VITREUS', descKey: 'aspectVitreusDesc', primal: false },
    { key: 'METALLUM', descKey: 'aspectMetallumDesc', primal: false },
    { key: 'TELUM', descKey: 'aspectTelumDesc', primal: false },
    { key: 'MACHINA', descKey: 'aspectMachinaDesc', primal: false },
    { key: 'TUTAMEN', descKey: 'aspectTutamenDesc', primal: false },
]

// "AER" -> "Aer" - the aspect names are Latin proper nouns, this is
// display formatting only, never translated.
export function aspectLabel(key) {
    if (!key) return ''
    return key.charAt(0) + key.slice(1).toLowerCase()
}
