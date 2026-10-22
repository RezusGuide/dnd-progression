import { useEffect, useState } from 'react'
import api from '../api/axios'

// Сундучок: labels and small hooks shared by the chest page, the sheet,
// the reception and the GM panel (docs/zlatopryady/copy.md, «Сундучок»).

export const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'VERY_RARE', 'LEGENDARY', 'ARTIFACT']

export const RARITY_LABEL = {
    COMMON: 'обычный',
    UNCOMMON: 'необычный',
    RARE: 'редкий',
    VERY_RARE: 'очень редкий',
    LEGENDARY: 'легендарный',
    ARTIFACT: 'артефакт',
}

export const COINS = [['pp', 'пм'], ['gp', 'зм'], ['ep', 'эм'], ['sp', 'см'], ['cp', 'мм']]

export const PENALTIES = {
    NONE: 'Без штрафа',
    HP_1: 'Откусить 1 хит',
    LOCK_10_MIN: 'Обидеться на 10 минут',
}

// What the player reads after a wrong answer.
export const BITE_TEXT = {
    NONE: 'Сундучок клацнул крышкой. Ответ неверный.',
    HP_1: 'Сундучок откусил 1 хит.',
    LOCK_10_MIN: 'Сундучок обиделся на 10 минут.',
}

// "10 зм, 5 см" from {gp: 10, sp: 5}.
export function coinsText(coins) {
    return COINS.filter(([k]) => coins?.[k] > 0).map(([k, label]) => `${coins[k]} ${label}`).join(', ')
}

export function isEmptyContents(contents) {
    return !contents
        || (Object.values(contents.aspects || {}).every((n) => !n)
            && Object.values(contents.coins || {}).every((n) => !n)
            && !(contents.items || []).length)
}

// Sealed rewards per own character: { "7": 2 }. Fails quietly to {}.
export function useSealedCounts(enabled = true) {
    const [counts, setCounts] = useState({})
    useEffect(() => {
        if (!enabled) return
        api.get('/api/chest/mine').then((res) => setCounts(res.data || {})).catch(() => setCounts({}))
    }, [enabled])
    return counts
}

export const totalSealed = (counts) => Object.values(counts || {}).reduce((a, b) => a + (Number(b) || 0), 0)

// Re-renders every second while `active`, for lock countdowns.
export function useTick(active) {
    const [, setTick] = useState(0)
    useEffect(() => {
        if (!active) return
        const timer = setInterval(() => setTick((t) => t + 1), 1000)
        return () => clearInterval(timer)
    }, [active])
}

// The server sends the seconds left (lockSeconds); this turns them into a
// deadline on the browser's own clock, so time zones never matter.
export const deadlineFrom = (seconds) => (seconds > 0 ? Date.now() + seconds * 1000 : null)

// "9:41" until a deadline (ms), or null once it has passed.
export function countdown(deadline) {
    if (!deadline) return null
    const left = Math.ceil((deadline - Date.now()) / 1000)
    if (left <= 0) return null
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
}

export function prefersReducedMotion() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
        return false
    }
}
