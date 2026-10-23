import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Button, EmptyState, Loader } from '../../components/ui'
import { browserZone, cityName, durationText, formatSpan } from '../../lib/calendar'

// «Календарь» in the console: open polls and the sessions ahead, with links
// to the calendar's own screens, where polls are made and scheduled.
const STATUS = { OPEN: 'Идёт подбор', SCHEDULED: 'Назначено', CANCELLED: 'Отменён' }

export default function GmCalendar() {
    const [polls, setPolls] = useState(null)
    const [sessions, setSessions] = useState(null)
    const zone = browserZone()
    useEffect(() => {
        api.get('/api/polls').then((res) => setPolls(res.data)).catch(() => setPolls([]))
        api.get('/api/sessions', { params: { upcoming: true } }).then((res) => setSessions(res.data)).catch(() => setSessions([]))
    }, [])
    if (!polls || !sessions) return <section className="gm-section"><Loader /></section>
    const open = polls.filter((p) => p.status === 'OPEN')

    return (
        <section className="gm-section">
            <div className="admin-section-head">
                <h1 className="gm-title">Календарь</h1>
                <Button to="/calendar?tab=polls">Новый подбор</Button>
            </div>
            <p className="calendar-help">Время по вашему поясу: {cityName(zone)}.</p>

            <h2 className="reception-section-title">Подборы в работе</h2>
            {open.length === 0 ? <EmptyState>Открытых подборов нет.</EmptyState> : (
                <ul className="gm-list">
                    {open.map((p) => (
                        <li key={p.id}>
                            <Link to={`/calendar/polls/${p.id}`}>{p.title}</Link>
                            <span className="calendar-help"> · {p.dateFrom} — {p.dateTo} · {durationText(p.durationMinutes)} · участников {p.participants.length} · {STATUS[p.status]}</span>
                        </li>
                    ))}
                </ul>
            )}

            <h2 className="reception-section-title">Ближайшие сессии</h2>
            {sessions.length === 0 ? <EmptyState>Сессий не назначено.</EmptyState> : (
                <ul className="gm-list">
                    {sessions.map((s) => (
                        <li key={s.id}>
                            <b>{s.title}</b>
                            <span className="calendar-help"> · {formatSpan(s.startUtc, new Date(Date.parse(s.startUtc) + s.durationMinutes * 60000).toISOString(), zone)}{s.campaignName ? ` · ${s.campaignName}` : ''}</span>
                        </li>
                    ))}
                </ul>
            )}
            <p><Link to="/calendar?tab=sessions" className="reception-link">Все сессии →</Link></p>
        </section>
    )
}
