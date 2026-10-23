import { describe, expect, it } from 'vitest'
import aspectsFile from '../../../backend/src/main/resources/data/aspects.json'
import {
    allowedCells, ancestry, bagLeft, brokenJoints, buildGraph, chainOfLength, gridCells, hexDistance, jointText,
    recipeFor, ruleText, shortestChain, spentCounts, submitBlocker, validate,
} from './research'
import { spellSlotsFor } from './dnd-rules'

// The same cases as the backend's ResearchCoreTests, on the real aspects.json.
const aspects = aspectsFile.aspects
const graph = buildGraph(aspects)

// Two anchors three cells apart on one row: dawn at (-2,0), storm at (1,0).
const anchors = [{ q: -2, r: 0, aspect: 'dawn' }, { q: 1, r: 0, aspect: 'storm' }]

describe('aspect links', () => {
    it('follow recipes and never join the same aspect', () => {
        expect(aspects).toHaveLength(19)
        expect(graph.linked('gear', 'order')).toBe(true)
        expect(graph.linked('steam', 'gear')).toBe(true)
        expect(graph.linked('machine', 'gear')).toBe(true)
        expect(graph.linked('life', 'decay')).toBe(true)
        expect(graph.linked('dawn', 'shadow')).toBe(false)
        expect(graph.linked('gear', 'gear')).toBe(false)
    })
    it('combine into the compound', () => {
        expect(recipeFor(aspects, 'steam', 'order')).toBe('gear')
        expect(recipeFor(aspects, 'dawn', 'shadow')).toBeNull()
    })
})

describe('grid', () => {
    it('has 61 cells at radius 4 and 91 at radius 5', () => {
        expect(gridCells(4)).toHaveLength(61)
        expect(gridCells(5)).toHaveLength(91)
        expect(hexDistance({ q: -2, r: 0 }, { q: 1, r: 0 })).toBe(3)
    })
})

describe('the solution rule', () => {
    it('accepts a chain of linked aspects', () => {
        // dawn - flame - steam - storm
        const placed = [{ q: -1, r: 0, aspect: 'flame' }, { q: 0, r: 0, aspect: 'steam' }]
        const r = validate(graph, 4, anchors, placed)
        expect(r.valid).toBe(true)
        expect(r.anchorsConnected).toBe(2)
        expect(r.edges).toHaveLength(3)
        expect(spentCounts(placed)).toEqual({ flame: 1, steam: 1 })
    })
    it('rejects a dangling aspect', () => {
        const placed = [{ q: -1, r: 0, aspect: 'flame' }, { q: 0, r: 0, aspect: 'steam' }, { q: 3, r: -3, aspect: 'gear' }]
        const r = validate(graph, 4, anchors, placed)
        expect(r.valid).toBe(false)
        expect(r.anchorsConnected).toBe(2)
        expect([...r.dangling]).toEqual(['3,-3'])
    })
    it('does not connect identical neighbours', () => {
        const placed = [{ q: -1, r: 0, aspect: 'flame' }, { q: 0, r: 0, aspect: 'flame' }]
        const r = validate(graph, 4, anchors, placed)
        expect(r.valid).toBe(false)
        expect(r.anchorsConnected).toBe(0)
        expect(r.edges).toHaveLength(1)
    })
    it('rejects an anchor outside the component', () => {
        const three = [...anchors, { q: 0, r: 3, aspect: 'order' }]
        const placed = [{ q: -1, r: 0, aspect: 'flame' }, { q: 0, r: 0, aspect: 'steam' }]
        const r = validate(graph, 4, three, placed)
        expect(r.valid).toBe(false)
        expect(r.anchorsConnected).toBe(2)
        expect(r.dangling.size).toBe(0)
    })
    it('reports cells on an anchor or outside the grid', () => {
        expect(validate(graph, 4, anchors, [{ q: -2, r: 0, aspect: 'flame' }]).problem).toBe('ON_ANCHOR')
        expect(validate(graph, 4, anchors, [{ q: 5, r: 0, aspect: 'flame' }]).problem).toBe('OUTSIDE_GRID')
        expect(validate(graph, 4, anchors, [{ q: 0, r: 0, aspect: 'nothing' }]).problem).toBe('UNKNOWN_ASPECT')
    })
})

// The backend's SpellAccess must match the slot tables here (same cases as
// ResearchCoreTests#maxSpellLevelFollowsTheSlotTables).
describe('highest spell level matches the backend', () => {
    const maxLevel = (cls, level) => Math.max(0, ...Object.keys(spellSlotsFor(cls, level) || {}).map(Number))
    it('for the same classes and levels', () => {
        expect(maxLevel('Wizard', 1)).toBe(1)
        expect(maxLevel('Wizard', 3)).toBe(2)
        expect(maxLevel('Wizard', 5)).toBe(3)
        expect(maxLevel('Paladin', 1)).toBe(0)
        expect(maxLevel('Paladin', 2)).toBe(1)
        expect(maxLevel('Paladin', 5)).toBe(2)
        expect(maxLevel('Artificer', 1)).toBe(1)
        expect(maxLevel('Warlock', 5)).toBe(3)
    })
})

// ── Explaining the rule, on the real reference data ──
const realGraph = graph
const realByKey = Object.fromEntries(aspects.map((a) => [a.key, a]))
const name = (keys) => keys.map((k) => realByKey[k].nameRu).join(' → ')

describe('explaining red joints', () => {
    const anchors = [{ q: 0, r: 0, aspect: 'dawn' }, { q: 3, r: 0, aspect: 'dream' }]
    it('names the unlinked pair and the recipe', () => {
        const placed = [{ q: 1, r: 0, aspect: 'fog' }]
        const result = validate(realGraph, 4, anchors, placed)
        const joints = brokenJoints(realGraph, anchors, placed, result)
        expect(joints).toHaveLength(1)
        expect(jointText(joints[0], realByKey)).toBe('Рассвет и Туман не связаны. Туман = Пар + Тень.')
    })
    it('primal next to primal, same next to same, same next to its anchor', () => {
        expect(jointText({ kind: 'UNLINKED', aspects: ['dawn', 'steam'] }, realByKey))
            .toBe('Рассвет и Пар не связаны. Базовые аспекты между собой не связаны.')
        expect(jointText({ kind: 'SAME', aspects: ['fog', 'fog'] }, realByKey)).toBe('Одинаковые аспекты не связаны.')
        const placed = [{ q: 2, r: 0, aspect: 'dream' }]
        const joints = brokenJoints(realGraph, anchors, placed, validate(realGraph, 4, anchors, placed))
        expect(joints.map((j) => j.kind)).toEqual(['SAME_AS_ANCHOR'])
    })
    it('a correct chain shows no red joints even with unlinked side neighbours', () => {
        const a = [{ q: 0, r: 0, aspect: 'dawn' }, { q: 2, r: 0, aspect: 'dream' }]
        const placed = [{ q: 1, r: 0, aspect: 'mirage' }, { q: 1, r: -1, aspect: 'mirage' }]
        const result = validate(realGraph, 4, a, placed)
        expect(result.valid).toBe(true)
        expect(brokenJoints(realGraph, a, placed, result)).toEqual([])
    })
    it('the rule line uses a real recipe', () => {
        expect(ruleText(realByKey)).toBe('Связаны только аспект и его составляющие: Туман связан с Паром и Тенью. Базовые аспекты между собой не связаны.')
    })
})

describe('ancestry of anchors', () => {
    it('shortest chain by the reference', () => {
        expect(name(shortestChain(realGraph, 'fog', 'dream'))).toBe('Туман → Тень → Кошмар → Сон')
        expect(shortestChain(realGraph, 'dawn', 'dawn')).toEqual(['dawn'])
    })
    it('a chain of an exact length links every step, ends included', () => {
        for (const cells of [2, 3, 4, 5, 6, 7]) {
            const chain = chainOfLength(realGraph, 'fog', 'dream', cells)
            if (!chain) continue
            expect(chain).toHaveLength(cells)
            const full = ['fog', ...chain, 'dream']
            for (let i = 1; i < full.length; i++) expect(realGraph.linked(full[i - 1], full[i])).toBe(true)
        }
        expect(chainOfLength(realGraph, 'fog', 'dream', 1)).toBeNull()
    })
    it('«Безмолвный образ»: Сон (−4,3) and Туман (1,−3) are 6 apart; a fitting sequence exists', () => {
        const anchors = [{ q: -4, r: 3, aspect: 'dream' }, { q: 1, r: -3, aspect: 'fog' }]
        const [pair] = ancestry(realGraph, anchors)
        expect(pair.distance).toBe(6)
        expect(pair.straight).toBe(5)
        expect(name(pair.shortest)).toBe('Сон → Кошмар → Тень → Туман')
        expect(pair.fit).not.toBeNull()
        expect([5, 6, 7]).toContain(pair.fit.cells)
        const full = ['dream', ...pair.fit.chain, 'fog']
        for (let i = 1; i < full.length; i++) expect(realGraph.linked(full[i - 1], full[i])).toBe(true)
    })
})

describe('placing and the bag', () => {
    it('highlights empty cells where the chosen aspect links to a neighbour', () => {
        const anchors = [{ q: 0, r: 0, aspect: 'shadow' }]
        const ok = allowedCells(realGraph, 2, anchors, [], 'fog')
        expect(ok.size).toBe(6)
        expect(allowedCells(realGraph, 2, anchors, [], 'dawn').size).toBe(0)
        expect(allowedCells(realGraph, 2, anchors, [], null).size).toBe(0)
    })
    it('a note on review is not taken from the bag twice', () => {
        const placed = [{ q: 1, r: 0, aspect: 'fog' }, { q: 2, r: 0, aspect: 'fog' }]
        expect(bagLeft({ fog: 99 }, placed, true)('fog')).toBe(97)
        expect(bagLeft({ fog: 97 }, placed, false)('fog')).toBe(97)
    })
    it('says why the note cannot be sent', () => {
        const anchors = [{ q: 0, r: 0, aspect: 'dawn' }, { q: 2, r: 0, aspect: 'dream' }]
        const loose = [{ q: 0, r: 2, aspect: 'fog' }]
        expect(submitBlocker(validate(realGraph, 4, anchors, loose), loose, { fog: 5 })).toBe('Уберите висящие аспекты: 1')
        expect(submitBlocker(validate(realGraph, 4, anchors, []), [], {})).toBe('Сначала соедините все якоря')
        const good = [{ q: 1, r: 0, aspect: 'mirage' }]
        expect(submitBlocker(validate(realGraph, 4, anchors, good), good, {})).toBe('Не хватает аспектов в сумке')
        expect(submitBlocker(validate(realGraph, 4, anchors, good), good, { mirage: 1 })).toBeNull()
    })
})
