// "Исследования Санни" on the frontend: the hex grid, aspect links and the
// solution rule (docs/zlatopryady/magic-v2.md, sections 1, 3, 4). The
// backend (com.backend.research.ResearchValidator) has the same rule and
// checks it again on submit; this copy only drives the highlighting. The
// tests in research.test.js cover the same cases as ResearchCoreTests.

export const cellKey = (q, r) => `${q},${r}`

export function hexDistance(a, b) {
    const dq = a.q - b.q
    const dr = a.r - b.r
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

const DIRECTIONS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]

export function neighbours({ q, r }) {
    return DIRECTIONS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
}

export function inGrid(cell, radius) {
    return hexDistance(cell, { q: 0, r: 0 }) <= radius
}

// Every cell of the grid, row by row.
export function gridCells(radius) {
    const out = []
    for (let r = -radius; r <= radius; r++) {
        for (let q = -radius; q <= radius; q++) {
            if (inGrid({ q, r }, radius)) out.push({ q, r })
        }
    }
    return out
}

// Pointy-top hex centre in pixels for a cell size (centre to corner).
export function hexToPixel({ q, r }, size) {
    return { x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r }
}

export function hexCorners({ x, y }, size) {
    return Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i - 30)
        return [x + size * Math.cos(angle), y + size * Math.sin(angle)]
    })
}

// Links from data/aspects.json: A and B are linked when one is in the
// other's recipe. The same aspect is never linked to itself.
export function buildGraph(aspects) {
    const links = new Map((aspects || []).map((a) => [a.key, new Set()]))
    for (const a of aspects || []) {
        for (const part of a.components || []) {
            if (part === a.key || !links.has(part)) continue
            links.get(a.key).add(part)
            links.get(part).add(a.key)
        }
    }
    return {
        has: (k) => links.has(k),
        linked: (a, b) => !!a && a !== b && !!links.get(a)?.has(b),
        linkedTo: (a) => [...(links.get(a) || [])],
    }
}

// What placing these aspects takes from the bag: { flame: 2, ... }.
export function spentCounts(placed) {
    const out = {}
    for (const p of placed || []) out[p.aspect] = (out[p.aspect] || 0) + 1
    return out
}

// The rule. Every occupied cell is a vertex; neighbours share an edge only
// when their aspects are linked. Correct when all anchors are in one
// component and every placed aspect is in it too.
//   main      - cell keys of the component with the most anchors
//   dangling  - placed cells in a component with no anchor (red)
//   detached  - placed cells joined to an anchor outside the main component
//   edges     - [keyA, keyB] for the brass link lines
//   problem   - OUTSIDE_GRID | ON_ANCHOR | TWICE_IN_A_CELL | UNKNOWN_ASPECT
export function validate(graph, radius, anchors, placed) {
    const cells = new Map()
    const anchorKeys = new Set()
    for (const a of anchors) {
        cells.set(cellKey(a.q, a.r), a)
        anchorKeys.add(cellKey(a.q, a.r))
    }
    const empty = (problem) => ({
        valid: false, problem, anchorsConnected: 0, anchorsTotal: anchors.length,
        main: new Set(), dangling: new Set(), detached: new Set(), edges: [],
    })
    for (const p of placed) {
        const k = cellKey(p.q, p.r)
        if (!inGrid(p, radius)) return empty('OUTSIDE_GRID')
        if (anchorKeys.has(k)) return empty('ON_ANCHOR')
        if (cells.has(k)) return empty('TWICE_IN_A_CELL')
        if (!graph.has(p.aspect)) return empty('UNKNOWN_ASPECT')
        cells.set(k, p)
    }

    const adjacent = new Map()
    const edges = []
    for (const [k, cell] of cells) {
        for (const n of neighbours(cell)) {
            const nk = cellKey(n.q, n.r)
            const other = cells.get(nk)
            if (other && graph.linked(cell.aspect, other.aspect)) {
                if (!adjacent.has(k)) adjacent.set(k, [])
                adjacent.get(k).push(nk)
                if (k < nk) edges.push([k, nk])
            }
        }
    }

    let main = new Set()
    let mainAnchors = -1
    const dangling = new Set()
    const anchored = []
    const seen = new Set()
    for (const start of cells.keys()) {
        if (seen.has(start)) continue
        seen.add(start)
        const component = new Set([start])
        const queue = [start]
        while (queue.length) {
            for (const n of adjacent.get(queue.shift()) || []) {
                if (!seen.has(n)) {
                    seen.add(n)
                    component.add(n)
                    queue.push(n)
                }
            }
        }
        const count = [...component].filter((k) => anchorKeys.has(k)).length
        if (count === 0) component.forEach((k) => dangling.add(k))
        else {
            anchored.push(component)
            if (count > mainAnchors) {
                mainAnchors = count
                main = component
            }
        }
    }
    const detached = new Set()
    for (const component of anchored) {
        if (component !== main) component.forEach((k) => { if (!anchorKeys.has(k)) detached.add(k) })
    }

    return {
        valid: mainAnchors === anchors.length && dangling.size === 0 && detached.size === 0,
        problem: null,
        anchorsConnected: mainAnchors >= 2 ? mainAnchors : 0,
        anchorsTotal: anchors.length,
        main, dangling, detached, edges,
    }
}

// The compound made of a and b (either order), or null.
export function recipeFor(aspects, a, b) {
    return (aspects || []).find((x) => x.components?.length === 2
        && ((x.components[0] === a && x.components[1] === b) || (x.components[0] === b && x.components[1] === a)))?.key || null
}
