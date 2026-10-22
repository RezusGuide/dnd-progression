import { useEffect, useState } from 'react'
import api from '../api/axios'

// Календарь: time zones, Russian date formatting in the viewer's zone, and
// the weekly grid (7 days x 48 half-hours, Monday 00:00 local first). The
// server (AvailabilityCalculator) does the window search; this file only
// draws and edits.

export const SLOTS = 48
export const GRID_LENGTH = 7 * SLOTS
export const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function browserZone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
        return 'UTC'
    }
}

export function allZones() {
    try {
        return Intl.supportedValuesOf('timeZone')
    } catch {
        return ['UTC', 'Europe/Moscow', 'Asia/Almaty', 'America/Toronto']
    }
}

// Russian names for the zones the company actually uses; others fall back
// to the city part of the IANA name.
const CITY = {
    'America/Toronto': 'Торонто', 'America/Vancouver': 'Ванкувер', 'America/Edmonton': 'Эдмонтон',
    'America/Winnipeg': 'Виннипег', 'America/Halifax': 'Галифакс', 'America/New_York': 'Нью-Йорк',
    'America/Los_Angeles': 'Лос-Анджелес', 'Europe/Moscow': 'Москва', 'Europe/Kaliningrad': 'Калининград',
    'Europe/Samara': 'Самара', 'Asia/Yekaterinburg': 'Екатеринбург', 'Asia/Omsk': 'Омск',
    'Asia/Novosibirsk': 'Новосибирск', 'Asia/Krasnoyarsk': 'Красноярск', 'Asia/Irkutsk': 'Иркутск',
    'Asia/Yakutsk': 'Якутск', 'Asia/Vladivostok': 'Владивосток', 'Asia/Almaty': 'Алматы',
    'Asia/Aqtobe': 'Актобе', 'Asia/Qyzylorda': 'Кызылорда', 'Asia/Qostanay': 'Костанай', 'Asia/Aqtau': 'Актау',
    'Asia/Atyrau': 'Атырау', 'Asia/Oral': 'Уральск', 'Asia/Tashkent': 'Ташкент', 'Asia/Bishkek': 'Бишкек', 'Europe/Kyiv': 'Киев',
    'Europe/Minsk': 'Минск', 'Europe/Berlin': 'Берлин', 'Europe/London': 'Лондон', 'UTC': 'UTC',
}

export function cityName(zone) {
    if (!zone) return 'пояс не указан'
    return CITY[zone] || zone.split('/').pop().replaceAll('_', ' ')
}

const fmtCache = new Map()
function formatter(zone, options) {
    const key = `${zone}|${JSON.stringify(options)}`
    if (!fmtCache.has(key)) fmtCache.set(key, new Intl.DateTimeFormat('ru-RU', { timeZone: zone, ...options }))
    return fmtCache.get(key)
}

// "Пт, 30 октября"
export function formatDay(instant, zone) {
    const s = formatter(zone, { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(instant))
    return s.charAt(0).toUpperCase() + s.slice(1)
}

// "19:00"
export function formatTime(instant, zone) {
    return formatter(zone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant))
}

// "Пт, 30 октября, 19:00–22:00"
export function formatSpan(start, end, zone) {
    return `${formatDay(start, zone)}, ${formatTime(start, zone)}–${formatTime(end, zone)}`
}

// Local "YYYY-MM-DDTHH:MM" strings from the server (participant's own time).
export function localClock(localIso) {
    return localIso ? localIso.slice(11, 16) : ''
}

// "3 ч", "2 ч 30 мин"
export const durationText = (min) => [Math.floor(min / 60) && `${Math.floor(min / 60)} ч`, min % 60 && `${min % 60} мин`].filter(Boolean).join(' ')

// "через 2 д 3 ч", "через 45 мин", "уже идёт"
export function countdownText(startMs, durationMin, now = Date.now()) {
    const left = startMs - now
    if (left <= 0) return now < startMs + durationMin * 60000 ? 'уже идёт' : 'прошла'
    const min = Math.floor(left / 60000)
    const d = Math.floor(min / 1440)
    const h = Math.floor((min % 1440) / 60)
    const m = min % 60
    return 'через ' + [d && `${d} д`, h && `${h} ч`, (!d && m) && `${m} мин`].filter(Boolean).join(' ') || 'через минуту'
}

// ── The weekly grid ──

export const slotLabel = (slot) => `${String(Math.floor(slot / 2)).padStart(2, '0')}:${slot % 2 ? '30' : '00'}`
export const timeToSlot = (hhmm) => {
    const [h, m] = String(hhmm || '00:00').split(':').map(Number)
    return h * 2 + (m >= 30 ? 1 : 0)
}

// Same rule as the server: a half-hour is asleep when its start is inside
// [sleepStart, sleepEnd), the window may cross midnight.
export function asleep(slot, sleepStart, sleepEnd) {
    const s = timeToSlot(sleepStart)
    const e = timeToSlot(sleepEnd)
    if (s === e) return false
    return s < e ? slot >= s && slot < e : slot >= s || slot < e
}

// days: 0 = Monday; slots [from, to). Sleep cells always stay 0.
export function paint(grid, days, from, to, value, sleepStart, sleepEnd) {
    const cells = grid.split('')
    for (const d of days) {
        for (let s = from; s < to; s++) {
            if (!asleep(s, sleepStart, sleepEnd)) cells[d * SLOTS + s] = value ? '1' : '0'
        }
    }
    return cells.join('')
}

export function clearSleep(grid, sleepStart, sleepEnd) {
    return grid.split('').map((c, i) => (asleep(i % SLOTS, sleepStart, sleepEnd) ? '0' : c)).join('')
}

export const PRESETS = {
    weekdayEvenings: (grid, a, b) => paint(grid, [0, 1, 2, 3, 4], timeToSlot('19:00'), timeToSlot('23:00'), true, a, b),
    weekendDays: (grid, a, b) => paint(grid, [5, 6], timeToSlot('12:00'), timeToSlot('20:00'), true, a, b),
}

// ── Viewer's zone ──

// The viewer's zone: their saved profile, else the browser. Also tells
// whether a profile exists (for the reception hint).
export function useMyAvailability(enabled = true) {
    const [state, setState] = useState({ loading: enabled, profile: null, zone: browserZone() })
    useEffect(() => {
        if (!enabled) return
        api.get('/api/me/availability', { params: { zone: browserZone() } })
            .then((res) => setState({ loading: false, profile: res.data, zone: res.data.exists ? res.data.timezone : browserZone() }))
            .catch(() => setState({ loading: false, profile: null, zone: browserZone() }))
    }, [enabled])
    return state
}

// Downloads the session's .ics with the session token (a plain link would not send it).
export async function downloadIcs(sessionId) {
    const res = await api.get(`/api/sessions/${sessionId}/ics`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-${sessionId}.ics`
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
