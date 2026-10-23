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

// ── Explaining the rule (prompts/12-fixes-after-release.md, section 3) ──

/**
 * Neighbouring occupied cells that are NOT linked, where it matters: at
 * least one of the two is outside the anchors' main chain. kind:
 *   SAME           - the same aspect twice;
 *   SAME_AS_ANCHOR - next to an anchor stands the anchor's own aspect;
 *   UNLINKED       - different aspects that are not related.
 */
export function brokenJoints(graph, anchors, placed, result) {
    const cells = new Map()
    const anchorKeys = new Set(anchors.map((a) => cellKey(a.q, a.r)))
    for (const c of [...anchors, ...placed]) cells.set(cellKey(c.q, c.r), c)
    const out = []
    for (const [k, cell] of cells) {
        for (const n of neighbours(cell)) {
            const nk = cellKey(n.q, n.r)
            const other = cells.get(nk)
            if (!other || nk <= k) continue
            if (anchorKeys.has(k) && anchorKeys.has(nk)) continue
            if (graph.linked(cell.aspect, other.aspect)) continue
            if (result && result.main.has(k) && result.main.has(nk)) continue
            const same = cell.aspect === other.aspect
            const kind = same && (anchorKeys.has(k) || anchorKeys.has(nk)) ? 'SAME_AS_ANCHOR' : same ? 'SAME' : 'UNLINKED'
            out.push({ a: k, b: nk, kind, aspects: [cell.aspect, other.aspect] })
        }
    }
    return out
}

const recipeText = (aspect, byKey) =>
    `${aspect.nameRu} = ${aspect.components.map((c) => byKey[c]?.nameRu || c).join(' + ')}`

/** «Рассвет и Туман не связаны. Туман = Пар + Тень.» and the like. */
export function jointText(joint, byKey) {
    if (joint.kind === 'SAME_AS_ANCHOR') {
        return 'Рядом с якорем стоит такой же аспект: он не связан с якорем. Поставьте сюда родственный якорю аспект.'
    }
    if (joint.kind === 'SAME') return 'Одинаковые аспекты не связаны.'
    const [x, y] = joint.aspects.map((k) => byKey[k] || { key: k, nameRu: k, components: [] })
    const head = `${x.nameRu} и ${y.nameRu} не связаны.`
    const recipes = [x, y].filter((a) => a.components?.length).map((a) => recipeText(a, byKey))
    if (recipes.length === 0) return `${head} Базовые аспекты между собой не связаны.`
    return `${head} ${recipes.join('. ')}.`
}

/** The rule in one line, with a real example from the data. */
export function ruleText(byKey, exampleKey = 'fog') {
    const ex = byKey[exampleKey] || Object.values(byKey).find((a) => a.components?.length === 2)
    const parts = ex ? ex.components.map((c) => byKey[c]?.nameRu || c) : []
    const example = ex ? ` ${ex.nameRu} связан с ${instrumental(parts[0])} и ${instrumental(parts[1])}.` : ''
    return `Связаны только аспект и его составляющие:${example} Базовые аспекты между собой не связаны.`
}

// «Пар» → «Паром», «Тень» → «Тенью»: enough for the aspect names in the data.
function instrumental(word = '') {
    if (/ь$/.test(word)) return word.slice(0, -1) + 'ью'
    if (/й$/.test(word)) return word.slice(0, -1) + 'ем'
    if (/я$/.test(word)) return word.slice(0, -1) + 'ей'
    if (/а$/.test(word)) return word.slice(0, -1) + 'ой'
    if (/[жшчщц]$/.test(word)) return word + 'ем'
    return word + 'ом'
}

/** Shortest chain of aspect keys from one aspect to another, both ends included; null if none. */
export function shortestChain(graph, from, to) {
    if (from === to) return [from]
    const prev = new Map([[from, null]])
    const queue = [from]
    while (queue.length) {
        const cur = queue.shift()
        for (const n of graph.linkedTo(cur)) {
            if (prev.has(n)) continue
            prev.set(n, cur)
            if (n === to) {
                const path = [to]
                for (let p = cur; p !== null; p = prev.get(p)) path.unshift(p)
                return path
            }
            queue.push(n)
        }
    }
    return null
}

/**
 * Aspects for exactly `cells` cells between anchor `from` and anchor `to`:
 * from→c1, c1→c2, …, cN→to all linked. Aspects may repeat (Тень → Туман →
 * Тень). BFS over (aspect, cells so far); null when that length is impossible.
 */
export function chainOfLength(graph, from, to, cells) {
    if (cells < 1) return null
    // layer[i]: aspects reachable as the i-th cell, with a back pointer.
    const layers = [new Map([[from, null]])]
    for (let i = 1; i <= cells; i++) {
        const next = new Map()
        for (const a of layers[i - 1].keys()) {
            for (const n of graph.linkedTo(a)) if (!next.has(n)) next.set(n, a)
        }
        if (next.size === 0) return null
        layers.push(next)
    }
    const last = [...layers[cells].keys()].find((a) => graph.linked(a, to))
    if (!last) return null
    const out = [last]
    for (let i = cells; i > 1; i--) out.unshift(layers[i].get(out[0]))
    return out
}

/**
 * «Родство якорей» for every pair: the shortest chain by the reference, the
 * distance on the grid, and a ready sequence of the length that fits -
 * d−1 cells (straight), else d, else d+1 (around an arc).
 */
export function ancestry(graph, anchors) {
    const out = []
    for (let i = 0; i < anchors.length; i++) {
        for (let j = i + 1; j < anchors.length; j++) {
            const a = anchors[i]
            const b = anchors[j]
            const distance = hexDistance(a, b)
            const straight = distance - 1
            let fit = null
            for (const cells of [straight, straight + 1, straight + 2]) {
                const chain = chainOfLength(graph, a.aspect, b.aspect, cells)
                if (chain) { fit = { cells, chain }; break }
            }
            out.push({ from: a.aspect, to: b.aspect, distance, straight, shortest: shortestChain(graph, a.aspect, b.aspect), fit })
        }
    }
    return out
}

/** Empty cells where `aspect` would link to at least one occupied neighbour. */
export function allowedCells(graph, radius, anchors, placed, aspect) {
    const out = new Set()
    if (!aspect) return out
    const cells = new Map()
    for (const c of [...anchors, ...placed]) cells.set(cellKey(c.q, c.r), c)
    for (const cell of gridCells(radius)) {
        const k = cellKey(cell.q, cell.r)
        if (cells.has(k)) continue
        if (neighbours(cell).some((n) => {
            const other = cells.get(cellKey(n.q, n.r))
            return other && graph.linked(aspect, other.aspect)
        })) out.add(k)
    }
    return out
}

/**
 * What is left in the bag. Only a grid being edited takes from it: the grid
 * of a note on review or approved was already written off by the server.
 */
export function bagLeft(bag, placed, editable) {
    const used = editable ? spentCounts(placed) : {}
    return (key) => (bag?.[key] || 0) - (used[key] || 0)
}

/** Why «Подать записку» is disabled, or null when it can be sent. */
export function submitBlocker(result, placed, bag) {
    if (!result) return null
    const used = spentCounts(placed)
    if (Object.entries(used).some(([k, n]) => (bag?.[k] || 0) < n)) return 'Не хватает аспектов в сумке'
    const loose = result.dangling.size + result.detached.size
    if (loose > 0) return `Уберите висящие аспекты: ${loose}`
    if (!result.valid) return 'Сначала соедините все якоря'
    return null
}
