import { describe, expect, it } from 'vitest'
import aspectsFile from '../../../backend/src/main/resources/data/aspects.json'
import { buildGraph, gridCells, hexDistance, recipeFor, spentCounts, validate } from './research'
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
