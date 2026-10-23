import { describe, expect, it } from 'vitest'
import { isRecent, matches, wikiSlug, wikiToMarkdown } from './world'
import { caseNumber, closedText, stageLabel, stageLabels } from './dreams'

describe('wiki links', () => {
    it('turns both forms into links to /world', () => {
        expect(wikiToMarkdown('См. [[founders|основателей]] и [[runes]].', { runes: 'Руны и уровни' }))
            .toBe('См. [основателей](/world/founders) и [Руны и уровни](/world/runes).')
    })
    it('falls back to the slug when the title is unknown', () => {
        expect(wikiToMarkdown('[[nowhere]]')).toBe('[nowhere](/world/nowhere)')
    })
    it('escapes brackets in the text and leaves bad slugs alone', () => {
        expect(wikiToMarkdown('[[a-b|x [y]]]')).toBe('[x \\[y](/world/a-b)]')
        expect(wikiToMarkdown('[[Не Слаг]]')).toBe('[[Не Слаг]]')
    })
    it('reads the slug back from the href only for /world links', () => {
        expect(wikiSlug('/world/demon-continent')).toBe('demon-continent')
        expect(wikiSlug('javascript:alert(1)')).toBeNull()
        expect(wikiSlug('https://example.test/world/x')).toBeNull()
    })
})

describe('archive', () => {
    it('knows what was opened this week', () => {
        const now = Date.parse('2026-10-23T12:00:00')
        expect(isRecent('2026-10-20T10:00:00', now)).toBe(true)
        expect(isRecent('2026-10-10T10:00:00', now)).toBe(false)
        expect(isRecent(null, now)).toBe(false)
    })
    it('searches title and teaser, ё as е', () => {
        const a = { title: 'Тёмный лес', teaser: 'Юго-запад' }
        expect(matches(a, 'темн')).toBe(true)
        expect(matches(a, 'ЮГО')).toBe(true)
        expect(matches(a, 'север')).toBe(false)
        expect(matches(a, '  ')).toBe(true)
    })
})

describe('dreams', () => {
    it('numbers cases with four digits', () => {
        expect(caseNumber(12)).toBe('№0012')
        expect(caseNumber(1234)).toBe('№1234')
    })
    it('reads stage names from the article table', () => {
        const body = 'Текст.\n\n| Стадия | Что происходит |\n|---|---|\n| 1 | Мир становится понятнее |\n| 2 | Меняется одежда |\n'
        const labels = stageLabels(body)
        expect(labels[0]).toBe('Погружения нет')
        expect(labels[2]).toBe('Меняется одежда')
        expect(stageLabel(labels, 3)).toBe('Стадия 3')
        expect(stageLabels(null)[0]).toBe('Погружения нет')
    })
    it('says how a case ended', () => {
        expect(closedText('CLEARED')).toBe('Дело закрыто. Итог: зачищено.')
        expect(closedText('OPEN')).toBeNull()
    })
})
