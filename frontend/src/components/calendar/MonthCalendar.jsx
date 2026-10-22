import { useState } from 'react'
import { DAYS } from '../../lib/calendar'

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// A month of local dates for exceptions. marks: { "2026-10-24": "BUSY" | "FREE" }.
export default function MonthCalendar({ marks = {}, onPick, today }) {
    const start = today ? new Date(`${today}T00:00:00`) : new Date()
    const [cursor, setCursor] = useState({ y: start.getFullYear(), m: start.getMonth() })
    const first = new Date(cursor.y, cursor.m, 1)
    const offset = (first.getDay() + 6) % 7 // Monday first
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate()
    const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
    const move = (delta) => setCursor(({ y, m }) => {
        const d = new Date(y, m + delta, 1)
        return { y: d.getFullYear(), m: d.getMonth() }
    })
    const todayIso = today || iso(start.getFullYear(), start.getMonth(), start.getDate())

    return (
        <div className="month-cal">
            <div className="month-cal-head">
                <button type="button" className="month-cal-nav" onClick={() => move(-1)} aria-label="Предыдущий месяц">‹</button>
                <span className="month-cal-title">{MONTHS[cursor.m]} {cursor.y}</span>
                <button type="button" className="month-cal-nav" onClick={() => move(1)} aria-label="Следующий месяц">›</button>
            </div>
            <div className="month-cal-grid">
                {DAYS.map((d) => <span key={d} className="month-cal-dow">{d}</span>)}
                {cells.map((d, i) => {
                    if (!d) return <span key={`e${i}`} />
                    const date = iso(cursor.y, cursor.m, d)
                    const mark = marks[date]
                    return (
                        <button key={date} type="button"
                            className={`month-cal-day ${mark ? `is-${mark.toLowerCase()}` : ''} ${date === todayIso ? 'is-today' : ''}`}
                            onClick={() => onPick(date)}
                            aria-label={`${d} ${MONTHS[cursor.m].toLowerCase()}${mark === 'BUSY' ? ', занят' : mark === 'FREE' ? ', свободен' : ''}`}>
                            {d}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
