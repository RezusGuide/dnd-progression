import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { Button, Dossier, EmptyState, Loader } from '../../components/ui'
import { cityName, countdownText, downloadIcs, formatSpan, useMyAvailability } from '../../lib/calendar'
import { useTick } from '../../lib/chest'

// «Сессии»: upcoming and past, in the viewer's zone, a countdown to the
// nearest one and its .ics.
export function SessionCard({ session, zone, big = false }) {
    const [error, setError] = useState('')
    const start = Date.parse(session.startUtc)
    const end = new Date(start + session.durationMinutes * 60000).toISOString()
    return (
        <div className={`calendar-session ${big ? 'is-next' : ''}`}>
            <div>
                <p className="calendar-session-title">{session.title}</p>
                <p className="calendar-session-time">{formatSpan(session.startUtc, end, zone)} <span className="calendar-help">({cityName(zone)})</span></p>
                {big && <p className="calendar-countdown" role="timer">{countdownText(start, session.durationMinutes)}</p>}
                {session.campaignName && <p className="calendar-help">{session.campaignName}</p>}
            </div>
            <Button variant={big ? 'primary' : 'secondary'} onClick={() => downloadIcs(session.id).catch(() => setError('Файл не скачался.'))}>В календарь (.ics)</Button>
            {error && <p className="ui-field-error" role="alert">{error}</p>}
        </div>
    )
}

export default function SessionsTab() {
    const { zone, loading } = useMyAvailability()
    const [sessions, setSessions] = useState(null)
    useEffect(() => {
        api.get('/api/sessions').then((res) => setSessions(res.data)).catch(() => setSessions([]))
    }, [])
    useTick(true)

    if (!sessions || loading) return <Loader />
    const now = Date.now()
    const ends = (s) => Date.parse(s.startUtc) + s.durationMinutes * 60000
    const upcoming = sessions.filter((s) => ends(s) > now)
    const past = sessions.filter((s) => ends(s) <= now).reverse()
    return (
        <div className="calendar-sessions">
            {upcoming.length === 0 && <EmptyState>Ближайших сессий нет. Секретарша проверит позже.</EmptyState>}
            {upcoming.length > 0 && (
                <Dossier tab="Ближайшая" className="calendar-card"><SessionCard session={upcoming[0]} zone={zone} big /></Dossier>
            )}
            {upcoming.length > 1 && (
                <Dossier tab="Дальше" className="calendar-card">
                    {upcoming.slice(1).map((s) => <SessionCard key={s.id} session={s} zone={zone} />)}
                </Dossier>
            )}
            {past.length > 0 && (
                <Dossier tab="Прошедшие" className="calendar-card calendar-past">
                    {past.map((s) => <SessionCard key={s.id} session={s} zone={zone} />)}
                </Dossier>
            )}
        </div>
    )
}
