import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { Button, Dossier, EmptyState, Hint, Loader, Modal, PageHeader, Stamp } from '../../components/ui'
import ErrorScreen from '../../components/errors/ErrorScreen'
import HeatMap from '../../components/calendar/HeatMap'
import { cityName, durationText, formatSpan, localClock, useMyAvailability } from '../../lib/calendar'
import '../../styles/sheet.css'
import '../../styles/calendar.css'

// One poll: the heat map and the best windows, all in the viewer's zone,
// with everyone's local time under each window. The GM schedules from here.
export default function PollPage() {
    const { pollId } = useParams()
    const { hasSection } = useAuth()
    const gm = hasSection('*')
    const { zone, loading } = useMyAvailability()
    const [poll, setPoll] = useState(null)
    const [loadError, setLoadError] = useState(null)
    const [confirm, setConfirm] = useState(null) // window to schedule
    const [cancelling, setCancelling] = useState(false)
    const [notice, setNotice] = useState('')
    const [error, setError] = useState('')

    const refresh = useCallback(() => {
        api.get(`/api/polls/${pollId}`).then((res) => setPoll(res.data)).catch(setLoadError)
    }, [pollId])
    useEffect(() => { refresh() }, [refresh])

    if (loadError) {
        const status = loadError.response?.status
        return <ErrorScreen code={status === 403 ? 403 : status === 404 ? 404 : status ? 500 : 'offline'} />
    }
    if (!poll || loading) return <div className="parchment-page"><Loader /></div>

    const people = Object.fromEntries(poll.participants.map((p) => [p.userId, p]))
    const names = Object.fromEntries(poll.participants.map((p) => [p.userId, p.username]))
    const missing = (poll.withoutProfile || []).map((id) => people[id]?.username).filter(Boolean)

    const schedule = async () => {
        setError('')
        try {
            await api.post(`/api/polls/${poll.id}/schedule`, { startUtc: confirm.startUtc })
            setConfirm(null)
            setNotice('Сессия назначена. Печать поставлена.')
            refresh()
        } catch (err) {
            setError(err.response?.data?.message || 'Не назначилось. Повторите.')
            setConfirm(null)
        }
    }

    const cancel = async () => {
        setError('')
        try {
            await api.post(`/api/polls/${poll.id}/cancel`)
            setNotice('Подбор отменён.')
            refresh()
        } catch (err) {
            setError(err.response?.data?.message || 'Не отменилось. Повторите.')
        }
        setCancelling(false)
    }

    const dateText = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    return (
        <div className="parchment-page calendar-page">
            <PageHeader title={poll.title} back="/calendar?tab=polls" backLabel="← Подборы"
                subtitle={`${dateText(poll.dateFrom)} — ${dateText(poll.dateTo)} · ${durationText(poll.durationMinutes)} · нужно участников: ${poll.minParticipants} из ${poll.participants.length}`} />
            <div className="calendar-body">
                {poll.status === 'SCHEDULED' && <Stamp kind="approved">Назначено</Stamp>}
                {poll.status === 'CANCELLED' && <Stamp kind="rejected">Отменён</Stamp>}
                {notice && <p className="tome-notice" role="status">{notice}</p>}
                {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}

                {gm && poll.status === 'OPEN' && (
                    <div className="calendar-actions"><Button variant="secondary" onClick={() => setCancelling(true)}>Отменить подбор</Button></div>
                )}
                <p className="calendar-help">Время показано по вашему поясу: {cityName(zone)}.</p>
                <p className="calendar-people-line">
                    {poll.participants.map((p) => (
                        <span key={p.userId} className={`calendar-person ${p.hasProfile ? '' : 'is-missing'}`}>{p.username} · {cityName(p.timezone)}</span>
                    ))}
                </p>
                {missing.length > 0 && (
                    <Hint>Не заполнили расписание: {missing.join(', ')}. Без него их время не учитывается.</Hint>
                )}

                <Dossier tab="Лучшие окна" className="calendar-card">
                    {(poll.windows || []).length === 0 && <EmptyState>Окон не найдено. Попробуйте расширить даты или уменьшить длительность.</EmptyState>}
                    <ol className="calendar-windows">
                        {(poll.windows || []).map((w) => (
                            <li key={w.startUtc} className="calendar-window">
                                <div className="calendar-window-main">
                                    <p className="calendar-window-time">{formatSpan(w.startUtc, w.endUtc, zone)} <span className="calendar-help">(ваше время)</span></p>
                                    <ul className="calendar-window-locals">
                                        {w.local.map((l) => {
                                            const free = w.available.includes(l.userId)
                                            return (
                                                <li key={l.userId} className={free ? '' : 'is-busy'}>
                                                    {l.username} · {cityName(l.timezone)} {localClock(l.start)}–{localClock(l.end)}
                                                    {!free && <span className="calendar-tag is-busy">занят</span>}
                                                    {free && l.inconvenient && <span className="calendar-tag is-late" title="Рано или поздно по местному времени">неудобно</span>}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                                {gm && poll.status === 'OPEN' && <Button onClick={() => setConfirm(w)}>Назначить</Button>}
                            </li>
                        ))}
                    </ol>
                </Dossier>

                <Dossier tab="Кто когда свободен" className="calendar-card">
                    <HeatMap cells={poll.heatMap || []} zone={zone} names={names} total={poll.participants.length} />
                </Dossier>
            </div>

            {confirm && (
                <Modal title="Назначить сессию" onClose={() => setConfirm(null)}
                    actions={<><Button variant="ghost" onClick={() => setConfirm(null)}>Отмена</Button><Button onClick={schedule}>Назначить</Button></>}>
                    <p>«{poll.title}»: {formatSpan(confirm.startUtc, confirm.endUtc, zone)} по вашему времени.</p>
                    <ul className="calendar-window-locals">
                        {confirm.local.map((l) => <li key={l.userId}>{l.username} · {cityName(l.timezone)} {localClock(l.start)}–{localClock(l.end)}</li>)}
                    </ul>
                    <p className="calendar-help">Подбор закроется, на доске появится объявление, в Приёмной — отсчёт.</p>
                </Modal>
            )}
            {cancelling && (
                <Modal title="Отменить подбор" onClose={() => setCancelling(false)}
                    actions={<><Button variant="ghost" onClick={() => setCancelling(false)}>Не отменять</Button><Button variant="danger" onClick={cancel}>Отменить подбор</Button></>}>
                    <p>Подбор «{poll.title}» закроется без сессии. Участники увидят его в списке как отменённый.</p>
                </Modal>
            )}
        </div>
    )
}
