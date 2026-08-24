// The six magical aspects used throughout spell research - the material
// pouch (CharacterSheet.jsx), the DM grant panel (Admin.jsx), and the
// research grid palette (Research.jsx) all share this single list so they
// can't drift out of sync. labelKey/descKey are LangContext translation
// keys, not the raw display text.
export const ASPECTS = [
    { key: 'FIRE', labelKey: 'aspectFire', descKey: 'aspectFireDesc' },
    { key: 'WATER', labelKey: 'aspectWater', descKey: 'aspectWaterDesc' },
    { key: 'EARTH', labelKey: 'aspectEarth', descKey: 'aspectEarthDesc' },
    { key: 'AIR', labelKey: 'aspectAir', descKey: 'aspectAirDesc' },
    { key: 'ORDER', labelKey: 'aspectOrder', descKey: 'aspectOrderDesc' },
    { key: 'ENTROPY', labelKey: 'aspectEntropy', descKey: 'aspectEntropyDesc' },
]
