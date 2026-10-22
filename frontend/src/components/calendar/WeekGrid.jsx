import { useEffect, useRef } from 'react'
import { DAYS, SLOTS, asleep, slotLabel } from '../../lib/calendar'

// The weekly grid: rows Mon-Sun, 48 half-hour columns. Press and drag to
// paint; the first cell decides whether the stroke fills or erases. Sleep
// cells are hatched and never change. Keyboard: arrows move, Space toggles.
export default function WeekGrid({ grid, sleepStart, sleepEnd, onChange, readOnly = false }) {
    const stroke = useRef(null) // '1' | '0' while dragging
    const current = useRef(grid)
    useEffect(() => { current.current = grid }, [grid])

    useEffect(() => {
        const end = () => { stroke.current = null }
        window.addEventListener('pointerup', end)
        return () => window.removeEventListener('pointerup', end)
    }, [])

    const set = (index, value) => {
        const cells = current.current.split('')
        if (cells[index] === value) return
        cells[index] = value
        current.current = cells.join('')
        onChange(current.current)
    }

    const down = (index, slot) => (e) => {
        if (readOnly || asleep(slot, sleepStart, sleepEnd)) return
        e.preventDefault()
        stroke.current = current.current[index] === '1' ? '0' : '1'
        set(index, stroke.current)
    }
    const enter = (index, slot) => () => {
        if (readOnly || !stroke.current || asleep(slot, sleepStart, sleepEnd)) return
        set(index, stroke.current)
    }
    const key = (index, slot) => (e) => {
        const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: SLOTS, ArrowUp: -SLOTS }
        if (moves[e.key] !== undefined) {
            e.preventDefault()
            const next = e.currentTarget.closest('.week-grid').querySelector(`[data-i="${index + moves[e.key]}"]`)
            next?.focus()
        } else if ((e.key === ' ' || e.key === 'Enter') && !readOnly && !asleep(slot, sleepStart, sleepEnd)) {
            e.preventDefault()
            set(index, current.current[index] === '1' ? '0' : '1')
        }
    }

    return (
        <div className={`week-grid ${readOnly ? 'is-readonly' : ''}`} role="grid" aria-label="Недельная сетка свободного времени">
            <div className="week-grid-row week-grid-head" role="row">
                <span className="week-grid-day" role="columnheader" />
                {Array.from({ length: SLOTS }, (_, s) => (
                    <span key={s} className={`week-grid-hour ${s % 2 ? 'is-half' : ''}`} role="columnheader" aria-label={slotLabel(s)}>
                        {s % 2 === 0 ? String(s / 2) : ''}
                    </span>
                ))}
            </div>
            {DAYS.map((day, d) => (
                <div key={day} className="week-grid-row" role="row">
                    <span className="week-grid-day" role="rowheader">{day}</span>
                    {Array.from({ length: SLOTS }, (_, s) => {
                        const i = d * SLOTS + s
                        const sleep = asleep(s, sleepStart, sleepEnd)
                        const on = grid[i] === '1'
                        return (
                            <span key={s} data-i={i} role="gridcell" tabIndex={d === 0 && s === 0 ? 0 : -1}
                                aria-selected={on} aria-disabled={sleep || undefined}
                                aria-label={`${day} ${slotLabel(s)}${sleep ? ', сон' : on ? ', свободен' : ''}`}
                                className={`week-grid-cell ${on ? 'is-on' : ''} ${sleep ? 'is-sleep' : ''} ${s % 2 ? 'is-half' : ''}`}
                                onPointerDown={down(i, s)} onPointerEnter={enter(i, s)} onKeyDown={key(i, s)} />
                        )
                    })}
                </div>
            ))}
        </div>
    )
}
