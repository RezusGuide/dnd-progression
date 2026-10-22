import { describe, expect, it } from 'vitest'
import { GRID_LENGTH, PRESETS, asleep, cityName, clearSleep, countdownText, formatSpan, paint, slotLabel, timeToSlot } from './calendar'

const empty = '0'.repeat(GRID_LENGTH)

describe('sleep window', () => {
    it('works inside one day and across midnight', () => {
        expect(asleep(timeToSlot('03:00'), '00:00', '08:00')).toBe(true)
        expect(asleep(timeToSlot('08:00'), '00:00', '08:00')).toBe(false)
        expect(asleep(timeToSlot('23:30'), '23:00', '07:00')).toBe(true)
        expect(asleep(timeToSlot('06:30'), '23:00', '07:00')).toBe(true)
        expect(asleep(timeToSlot('07:00'), '23:00', '07:00')).toBe(false)
        expect(asleep(timeToSlot('22:30'), '23:00', '07:00')).toBe(false)
    })
})

describe('weekly grid', () => {
    it('paints days and half-hours, never over sleep', () => {
        const g = paint(empty, [0], 0, 48, true, '23:00', '07:00')
        expect(g.slice(0, 48)).toBe('0'.repeat(14) + '1'.repeat(32) + '00')
        expect(g.slice(48)).toBe('0'.repeat(GRID_LENGTH - 48))
    })
    it('presets: weekday evenings 19-23 and weekend days 12-20', () => {
        const g = PRESETS.weekendDays(PRESETS.weekdayEvenings(empty, '00:00', '08:00'), '00:00', '08:00')
        expect(g.slice(timeToSlot('19:00'), timeToSlot('23:00'))).toBe('11111111')
        expect(g[4 * 48 + timeToSlot('18:30')]).toBe('0')
        expect(g.slice(5 * 48 + 24, 5 * 48 + 40)).toBe('1'.repeat(16))
        expect(g.split('').filter((c) => c === '1').length).toBe(5 * 8 + 2 * 16)
    })
    it('clearing sleep wipes only the sleep half-hours', () => {
        const g = clearSleep('1'.repeat(GRID_LENGTH), '00:00', '08:00')
        expect(g.slice(0, 16)).toBe('0'.repeat(16))
        expect(g[16]).toBe('1')
    })
    it('labels slots', () => {
        expect(slotLabel(0)).toBe('00:00')
        expect(slotLabel(39)).toBe('19:30')
    })
})

describe('time zones and formatting', () => {
    it('names cities in Russian, falling back to the IANA city', () => {
        expect(cityName('America/Toronto')).toBe('Торонто')
        expect(cityName('Asia/Almaty')).toBe('Алматы')
        expect(cityName('America/St_Johns')).toBe('St Johns')
    })
    it('formats one moment in each viewer zone', () => {
        const start = '2026-10-24T14:00:00Z'
        const end = '2026-10-24T17:00:00Z'
        expect(formatSpan(start, end, 'America/Toronto')).toBe('Сб, 24 октября, 10:00–13:00')
        expect(formatSpan(start, end, 'Asia/Almaty')).toBe('Сб, 24 октября, 19:00–22:00')
    })
    it('counts down', () => {
        const now = Date.parse('2026-10-22T12:00:00Z')
        expect(countdownText(Date.parse('2026-10-24T14:30:00Z'), 180, now)).toBe('через 2 д 2 ч')
        expect(countdownText(Date.parse('2026-10-22T12:45:00Z'), 180, now)).toBe('через 45 мин')
        expect(countdownText(Date.parse('2026-10-22T11:00:00Z'), 180, now)).toBe('уже идёт')
    })
})
