// Russian names for D&D terms (docs/zlatopryady/copy.md, section 4).
// The database keeps the English keys; only the screen shows Russian.
// Every lookup falls back to the key itself, so a home-made class or race
// typed in by hand still shows up as written.

export const CLASSES = {
    Barbarian: 'Варвар',
    Bard: 'Бард',
    Cleric: 'Жрец',
    Druid: 'Друид',
    Fighter: 'Воин',
    Monk: 'Монах',
    Paladin: 'Паладин',
    Ranger: 'Следопыт',
    Rogue: 'Плут',
    Sorcerer: 'Чародей',
    Warlock: 'Колдун',
    Wizard: 'Волшебник',
}

export const RACES = {
    Human: 'Человек',
    Elf: 'Эльф',
    Dwarf: 'Дварф',
    Halfling: 'Полурослик',
    Gnome: 'Гном',
    'Half-Orc': 'Полуорк',
    'Half-Elf': 'Полуэльф',
    Tiefling: 'Тифлинг',
    Dragonborn: 'Драконорождённый',
}

export const ABILITIES = {
    STR: { short: 'СИЛ', full: 'Сила' },
    DEX: { short: 'ЛОВ', full: 'Ловкость' },
    CON: { short: 'ТЕЛ', full: 'Телосложение' },
    INT: { short: 'ИНТ', full: 'Интеллект' },
    WIS: { short: 'МДР', full: 'Мудрость' },
    CHA: { short: 'ХАР', full: 'Харизма' },
}

export const SKILLS = {
    ACROBATICS: { name: 'Акробатика', ability: 'DEX' },
    INVESTIGATION: { name: 'Анализ', ability: 'INT' },
    ATHLETICS: { name: 'Атлетика', ability: 'STR' },
    PERCEPTION: { name: 'Восприятие', ability: 'WIS' },
    SURVIVAL: { name: 'Выживание', ability: 'WIS' },
    PERFORMANCE: { name: 'Выступление', ability: 'CHA' },
    INTIMIDATION: { name: 'Запугивание', ability: 'CHA' },
    HISTORY: { name: 'История', ability: 'INT' },
    SLEIGHT_OF_HAND: { name: 'Ловкость рук', ability: 'DEX' },
    ARCANA: { name: 'Магия', ability: 'INT' },
    MEDICINE: { name: 'Медицина', ability: 'WIS' },
    DECEPTION: { name: 'Обман', ability: 'CHA' },
    NATURE: { name: 'Природа', ability: 'INT' },
    INSIGHT: { name: 'Проницательность', ability: 'WIS' },
    RELIGION: { name: 'Религия', ability: 'INT' },
    STEALTH: { name: 'Скрытность', ability: 'DEX' },
    PERSUASION: { name: 'Убеждение', ability: 'CHA' },
    ANIMAL_HANDLING: { name: 'Уход за животными', ability: 'WIS' },
}

export const ALIGNMENTS = [
    'Законно-добрый',
    'Нейтрально-добрый',
    'Хаотично-добрый',
    'Законно-нейтральный',
    'Истинно нейтральный',
    'Хаотично-нейтральный',
    'Законно-злой',
    'Нейтрально-злой',
    'Хаотично-злой',
]

// Case-insensitive so 'WIZARD' / 'wizard' (casterClasses.js normalises to
// upper case) resolve too.
function lookup(table, key) {
    if (!key) return ''
    if (table[key]) return table[key]
    const hit = Object.keys(table).find((k) => k.toLowerCase() === String(key).toLowerCase())
    return hit ? table[hit] : key
}

export const className = (key) => lookup(CLASSES, key)
export const raceName = (key) => lookup(RACES, key)
export const abilityShort = (key) => ABILITIES[key]?.short || key
export const abilityName = (key) => ABILITIES[key]?.full || key
export const skillName = (key) => SKILLS[key]?.name || key

// "21 октября 2026, 22:40"
export function formatDateTime(value) {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/, '')
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return `${date}, ${time}`
}
