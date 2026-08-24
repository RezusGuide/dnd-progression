import { useEffect, useRef, useState } from 'react'

// Hand-rolled force-directed layout (no d3 dependency) - mutual repulsion
// between every pair of nodes, a spring pulling connected nodes toward a
// resting distance, and a weak pull toward the center so the graph doesn't
// drift off-canvas. Runs continuously at low alpha so it feels alive
// without being distracting; dragging a node overrides physics for it
// until released.

const WIDTH = 800
const HEIGHT = 520
const REPULSION = 14000
const SPRING_LENGTH = 150
const SPRING_K = 0.02
const CENTER_K = 0.012
const DAMPING = 0.82

export default function RelationshipGraph({ people, connections, onNodeClick, selectedId }) {
    const simRef = useRef({})
    const draggingRef = useRef(null)
    const svgRef = useRef(null)
    const [, setTick] = useState(0)

    useEffect(() => {
        const sim = simRef.current
        const existingIds = new Set(people.map((p) => p.id))
        Object.keys(sim).forEach((id) => {
            if (!existingIds.has(Number(id))) delete sim[id]
        })
        people.forEach((p, i) => {
            if (!sim[p.id]) {
                const angle = (i / Math.max(people.length, 1)) * Math.PI * 2
                sim[p.id] = {
                    x: WIDTH / 2 + Math.cos(angle) * 160 + (Math.random() - 0.5) * 40,
                    y: HEIGHT / 2 + Math.sin(angle) * 160 + (Math.random() - 0.5) * 40,
                    vx: 0,
                    vy: 0,
                }
            }
        })
    }, [people])

    useEffect(() => {
        let alive = true
        let raf

        function step() {
            const sim = simRef.current
            const ids = people.map((p) => p.id)

            for (let i = 0; i < ids.length; i++) {
                const a = sim[ids[i]]
                if (!a) continue
                for (let j = i + 1; j < ids.length; j++) {
                    const b = sim[ids[j]]
                    if (!b) continue
                    const dx = a.x - b.x
                    const dy = a.y - b.y
                    const distSq = dx * dx + dy * dy || 0.01
                    const dist = Math.sqrt(distSq)
                    const force = REPULSION / distSq
                    const fx = (dx / dist) * force
                    const fy = (dy / dist) * force
                    a.vx += fx; a.vy += fy
                    b.vx -= fx; b.vy -= fy
                }
            }

            connections.forEach((c) => {
                const a = sim[c.personAId]
                const b = sim[c.personBId]
                if (!a || !b) return
                const dx = b.x - a.x
                const dy = b.y - a.y
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
                const force = (dist - SPRING_LENGTH) * SPRING_K
                const fx = (dx / dist) * force
                const fy = (dy / dist) * force
                a.vx += fx; a.vy += fy
                b.vx -= fx; b.vy -= fy
            })

            ids.forEach((id) => {
                const n = sim[id]
                if (!n) return
                n.vx += (WIDTH / 2 - n.x) * CENTER_K
                n.vy += (HEIGHT / 2 - n.y) * CENTER_K
            })

            ids.forEach((id) => {
                const n = sim[id]
                if (!n) return
                if (draggingRef.current === id) { n.vx = 0; n.vy = 0; return }
                n.vx *= DAMPING; n.vy *= DAMPING
                n.x += n.vx; n.y += n.vy
                n.x = Math.max(28, Math.min(WIDTH - 28, n.x))
                n.y = Math.max(28, Math.min(HEIGHT - 28, n.y))
            })

            if (alive) {
                setTick((t) => (t + 1) % 1000000)
                raf = requestAnimationFrame(step)
            }
        }

        raf = requestAnimationFrame(step)
        return () => { alive = false; cancelAnimationFrame(raf) }
    }, [people, connections])

    const toSvgPoint = (e) => {
        const rect = svgRef.current.getBoundingClientRect()
        return {
            x: ((e.clientX - rect.left) / rect.width) * WIDTH,
            y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
        }
    }

    const handlePointerDown = (id) => (e) => {
        e.stopPropagation()
        draggingRef.current = id
    }
    const handlePointerMove = (e) => {
        const id = draggingRef.current
        if (id == null || !svgRef.current) return
        const { x, y } = toSvgPoint(e)
        const n = simRef.current[id]
        if (n) { n.x = x; n.y = y }
    }
    const stopDragging = () => { draggingRef.current = null }

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="cp-graph-svg"
            onMouseMove={handlePointerMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
        >
            {connections.map((c) => {
                const a = simRef.current[c.personAId]
                const b = simRef.current[c.personBId]
                if (!a || !b) return null
                return (
                    <g key={c.id}>
                        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="cp-edge" />
                        <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} className="cp-edge-label">{c.label}</text>
                    </g>
                )
            })}
            {people.map((p) => {
                const n = simRef.current[p.id]
                if (!n) return null
                const isSelected = selectedId === p.id
                return (
                    <g
                        key={p.id}
                        transform={`translate(${n.x},${n.y})`}
                        onMouseDown={handlePointerDown(p.id)}
                        onClick={() => onNodeClick(p)}
                        className="cp-node-group"
                    >
                        <circle r={isSelected ? 26 : 20} className={`cp-node${isSelected ? ' selected' : ''}`} />
                        <text y={4} textAnchor="middle" className="cp-node-initial">{p.name?.[0]?.toUpperCase()}</text>
                        <text y={isSelected ? 42 : 36} textAnchor="middle" className="cp-node-label">{p.name}</text>
                    </g>
                )
            })}
        </svg>
    )
}
