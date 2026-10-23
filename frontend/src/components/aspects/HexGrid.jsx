import AspectIcon from './AspectIcon'
import { cellKey, gridCells, hexCorners, hexToPixel } from '../../lib/research'

// The research grid: hex cells, anchors (locked), placed aspects, brass
// lines between linked neighbours and the green / red outlines from
// validate(). Read-only for the GM preview (no handlers, no tab stops).
//
// hoverAspect outlines (dashed) every cell whose aspect is linked to it.
// joints: unlinked neighbours that explain a red cell - a short red dashed
// mark across their shared edge, with the reason as a tooltip.
// allowed: empty cells where the aspect chosen in the bag would link.
export default function HexGrid({
    radius, anchors, placed, byKey, graph, result, size = 30,
    hoverAspect = null, onCellClick, onHoverAspect, readOnly = false, label = 'Стол исследований',
    joints = [], allowed = null,
}) {
    const cells = gridCells(radius)
    const anchorMap = new Map(anchors.map((a) => [cellKey(a.q, a.r), a]))
    const placedMap = new Map(placed.map((p) => [cellKey(p.q, p.r), p]))
    const pad = size + 4
    const width = Math.sqrt(3) * size * (2 * radius + 1) + pad
    const height = size * (3 * radius + 2) + pad
    const centre = (cell) => {
        const { x, y } = hexToPixel(cell, size)
        return { x: x + width / 2, y: y + height / 2 }
    }
    const fromKey = (k) => {
        const [q, r] = k.split(',').map(Number)
        return centre({ q, r })
    }

    // Green: the cell is chained to an anchor. Red: it hangs on its own.
    // Anchors glow once two or more of them are joined.
    const cellState = (k) => {
        if (!result) return ''
        if (result.dangling.has(k)) return 'is-dangling'
        if (placedMap.has(k) && (result.main.has(k) || result.detached.has(k))) return 'is-linked'
        if (anchorMap.has(k) && result.main.has(k) && result.anchorsConnected > 0) return 'is-linked'
        return ''
    }

    // The shared edge of two neighbours is perpendicular to the line between
    // their centres and as long as the hex side.
    const jointLine = (a, b) => {
        const p = fromKey(a)
        const q = fromKey(b)
        const mx = (p.x + q.x) / 2
        const my = (p.y + q.y) / 2
        const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
        const nx = -(q.y - p.y) / len
        const ny = (q.x - p.x) / len
        const h = size * 0.42
        return { x1: mx - nx * h, y1: my - ny * h, x2: mx + nx * h, y2: my + ny * h }
    }

    return (
        <svg className={`hexgrid ${readOnly ? 'is-readonly' : ''}`} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={label}>
            {cells.map((cell) => {
                const k = cellKey(cell.q, cell.r)
                const anchor = anchorMap.get(k)
                const item = anchor || placedMap.get(k)
                const c = centre(cell)
                const points = hexCorners(c, size - 1.5).map((p) => p.join(',')).join(' ')
                const related = hoverAspect && item && graph?.linked(hoverAspect, item.aspect)
                const canPlace = !item && allowed?.has(k)
                const name = item ? byKey[item.aspect]?.nameRu || item.aspect : ''
                const cellLabel = anchor ? `Якорь: ${name}` : item ? `${name}, снять` : canPlace ? 'Пустая клетка, сюда можно поставить' : 'Пустая клетка'
                const interactive = !readOnly && !anchor
                return (
                    <g key={k}
                        data-cell={k}
                        className={`hex ${anchor ? 'is-anchor' : item ? 'is-placed' : 'is-empty'} ${cellState(k)} ${related ? 'is-related' : ''} ${canPlace ? 'is-allowed' : ''}`}
                        role={interactive ? 'button' : undefined}
                        tabIndex={interactive ? 0 : undefined}
                        aria-label={interactive || anchor ? cellLabel : undefined}
                        onClick={interactive ? () => onCellClick?.(cell, item) : undefined}
                        onKeyDown={interactive ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick?.(cell, item) }
                        } : undefined}
                        onMouseEnter={item && !readOnly ? () => onHoverAspect?.(item.aspect) : undefined}
                        onMouseLeave={item && !readOnly ? () => onHoverAspect?.(null) : undefined}
                    >
                        <polygon points={points} className="hex-shape" />
                    </g>
                )
            })}
            <g className="hex-edges" aria-hidden="true">
                {(result?.edges || []).map(([a, b]) => {
                    const p = fromKey(a)
                    const q = fromKey(b)
                    return <line key={`${a}|${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
                })}
            </g>
            <g className="hex-icons" aria-hidden="true">
                {[...anchors, ...placed].map((item) => {
                    const k = cellKey(item.q, item.r)
                    const isAnchor = anchorMap.has(k)
                    const s = isAnchor ? size * 1.35 : size * 1.05
                    const c = centre(item)
                    return (
                        <g key={k} transform={`translate(${c.x - s / 2} ${c.y - s / 2})`} pointerEvents="none">
                            <AspectIcon aspect={byKey[item.aspect] || item.aspect} size={s} />
                            {isAnchor && (
                                <g transform={`translate(${s - 9} ${s - 11})`} className="hex-lock">
                                    <rect x="0" y="4" width="10" height="7" rx="1.5" />
                                    <path d="M2.5 4V2.8a2.5 2.5 0 0 1 5 0V4" fill="none" />
                                </g>
                            )}
                        </g>
                    )
                })}
            </g>
            <g className="hex-joints">
                {joints.map((j) => {
                    const l = jointLine(j.a, j.b)
                    return (
                        <g key={`${j.a}|${j.b}`} className="hex-joint">
                            <title>{j.text}</title>
                            <line {...l} className="hex-joint-hit" />
                            <line {...l} className="hex-joint-under" />
                            <line {...l} className="hex-joint-mark" />
                        </g>
                    )
                })}
            </g>
        </svg>
    )
}
