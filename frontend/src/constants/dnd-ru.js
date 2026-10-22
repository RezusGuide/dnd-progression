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
    // Campaign classes beyond the SRD (data/classes.json).
    Artificer: 'Изобретатель',
    Alchemist: 'Алхимик',
    Jaeger: 'Егерь',
    'Blood hunter': 'Кровавый охотник',
    Runekeeper: 'Хранитель рун',
    'Warrior Sidekick': 'Боец',
    'Spellcaster Sidekick': 'Заклинатель',
    'Expert Sidekick': 'Эксперт',
    'Alternate Barbarian': 'Альтернативный Варвар',
    'Alternate Fighter': 'Альтернативный Воин',
    'Alternate Monk': 'Альтернативный монах',
    'Alternate Rogue': 'Альтернативный Плут',
    Warlord: 'Воевода',
    Stargazer: 'Звездочёт',
    Magus: 'Магус',
    Mystic: 'Мистик',
    'The lingering soul': 'Неупокоенная душа',
    Savant: 'Савант',
    Shaman: 'Шаман',
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
    // Campaign races beyond the SRD (data/races.json).
    Kobold: 'Кобольд',
    Kenku: 'Кенку',
    Goblin: 'Гоблин',
    Bugbear: 'Багбир',
    Goliath: 'Голиаф',
    Tabaxi: 'Табакси',
    Harengon: 'Зайцегон',
    Genasi: 'Дженази',
    Leonin: 'Леонин',
    Loxodon: 'Локсодон',
    Giff: 'Гифф',
    'Thri-kreen': 'Три-крин',
    Autognome: 'Автогном',
    Owlin: 'Совлин',
    Changeling: 'Чейнджлинг',
    Shifter: 'Шифтер',
    Warforged: 'Кованый',
    Gearforged: 'Кованый (Gearforged)',
    Gnoll: 'Гнолл',
    Dhampir: 'Дампир',
    Eladrin: 'Эладрин',
    'Shadar-kai': 'Шадар-кай',
    'Astral elf': 'Астральный эльф',
    'Sea elf': 'Морской эльф',
    Triton: 'Тритон',
    Orc: 'Орк',
    Aasimar: 'Аасимар',
    Aarakocra: 'Аараокра',
    Vedalken: 'Ведалкен',
    Verdan: 'Вердан',
    'Simic hybrid': 'Гибрид Симиков',
    Githyanki: 'Гитьянки',
    Githzerai: 'Гитцерай',
    Grung: 'Грунг',
    Kalashtar: 'Калаштар',
    Kender: 'Кендер',
    Centaur: 'Кентавр',
    Locathah: 'Локата',
    Lizardfolk: 'Людоящер',
    Minotaur: 'Минотавр',
    Plasmoid: 'Плазмоид',
    Satyr: 'Сатир',
    Tortle: 'Тортл',
    Firbolg: 'Фирболг',
    Fairy: 'Фэйри',
    Hadozee: 'Хадози',
    Hobgoblin: 'Хобгоблин',
    'Yuan-ti': 'Юань-ти',
    'Deep gnome': 'Глубинный гном',
    Duergar: 'Дуэргар',
    'Winterfolk halflings': 'Зиморождённые полурослики',
    'Kobolds of Midgard': 'Кобольд Мидгарда',
    'Human of Midgard': 'Люди Мидгарда',
    Ravenfolk: 'Людоворон',
    Ratfolk: 'Людокрыса',
    Bearfolk: 'Людомедведь',
    'Shadow fey': 'Теневая фея',
    Trollkin: 'Троллеобразный',
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
