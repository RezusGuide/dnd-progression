// Пульт ГМ (prompts/10-gm-panel-and-release.md): section list, journal
// action names, staff statuses.

export const SECTIONS = [
    ['', 'Входящие'],
    ['characters', 'Сотрудники'],
    ['grants', 'Выдачи'],
    ['accounts', 'Пропуска'],
    ['options', 'Справочник'],
    ['world', 'Архив'],
    ['dreams', 'Сны'],
    ['chest', 'Сундучок'],
    ['calendar', 'Календарь'],
    ['cheatsheet', 'Шпаргалка'],
    ['journal', 'Журнал'],
]

export const ACTION_LABEL = {
    REQUEST_APPROVED: 'Заявка одобрена',
    REQUEST_REJECTED: 'Заявка отклонена',
    NOTE_APPROVED: 'Записка одобрена',
    NOTE_REJECTED: 'Записка отклонена',
    ASPECTS_GRANTED: 'Выданы аспекты',
    ITEM_GRANTED: 'Выдан предмет',
    MATERIAL_GRANTED: 'Выдан материал',
    PARCEL_SENT: 'Отправлена посылка',
    ARTICLE_STATUS: 'Статус статьи',
    DREAM_STATUS: 'Статус дела',
    DREAM_STAGE: 'Стадия погружения',
    XP_GRANTED: 'Начислен опыт',
    INSPIRATION: 'Вдохновение',
}

export const APPROVAL_LABEL = { APPROVED: 'Одобрено', PENDING: 'На рассмотрении', REJECTED: 'Отказано' }

export const DIFFICULTY_LABEL = {
    TRIVIAL: 'Проще лёгкого',
    EASY: 'Лёгкий',
    MEDIUM: 'Средний',
    HARD: 'Сложный',
    DEADLY: 'Смертельный',
}

/** Where a journal line points: a sheet, a case, an article. */
export function journalLink(entry) {
    if (!entry.targetId) return null
    if (entry.targetType === 'CHARACTER') return `/characters/${entry.targetId}`
    if (entry.targetType === 'DREAM') return '/gm/dreams'
    if (entry.targetType === 'ARTICLE') return '/gm/world'
    return null
}
