import { formatDay, formatTime } from '../../lib/calendar'

// The poll's heat map in the viewer's zone: a row per local date, a column
// per half-hour; the darker, the more people free. The title of each cell
// says who exactly.
export default function HeatMap({ cells, zone, names, total }) {
    const rows = new Map()
    for (const c of cells) {
        const day = formatDay(c.startUtc, zone)
        const [h, m] = formatTime(c.startUtc, zone).split(':').map(Number)
        if (!rows.has(day)) rows.set(day, new Map())
        rows.get(day).set(h * 2 + (m >= 30 ? 1 : 0), c)
    }
    return (
        <div className="heat-map" role="table" aria-label="Кто свободен: строки — даты, столбцы — часы, ваше время">
            <div className="heat-row heat-head" role="row">
                <span className="heat-day" role="columnheader" />
                {Array.from({ length: 48 }, (_, s) => (
                    <span key={s} className="heat-hour" role="columnheader">{s % 4 === 0 ? s / 2 : ''}</span>
                ))}
            </div>
            {[...rows.entries()].map(([day, slots]) => (
                <div key={day} className="heat-row" role="row">
                    <span className="heat-day" role="rowheader">{day}</span>
                    {Array.from({ length: 48 }, (_, s) => {
                        const c = slots.get(s)
                        if (!c) return <span key={s} className="heat-cell is-out" role="cell" />
                        const n = c.free.length
                        const who = c.free.map((id) => names[id] || id).join(', ')
                        return (
                            <span key={s} role="cell" className={`heat-cell ${n === total && total > 0 ? 'is-all' : ''}`}
                                style={{ '--heat': total ? n / total : 0 }}
                                title={`${formatTime(c.startUtc, zone)} · свободны ${n} из ${total}${who ? `: ${who}` : ''}`}
                                aria-label={`${formatTime(c.startUtc, zone)}: свободны ${n} из ${total}`} />
                        )
                    })}
                </div>
            ))}
            <p className="heat-legend">
                <span className="heat-cell" style={{ '--heat': 0 }} /> никто
                <span className="heat-cell" style={{ '--heat': 0.5 }} /> часть
                <span className="heat-cell is-all" style={{ '--heat': 1 }} /> все
            </p>
        </div>
    )
}
