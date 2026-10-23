import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { EmptyState, Loader } from '../../components/ui'
import { RequestCard } from '../admin/AdminRequests'
import { NoteCard } from '../admin/AdminResearch'
import { requestTitle } from '../../lib/requests'
import { useRefData } from '../../lib/refData'
import { useMagicData } from '../../lib/magic'
import { browserZone, cityName, formatDay, formatTime } from '../../lib/calendar'
import { formatDateTime } from '../../constants/dnd-ru'

// «Входящие»: everything waiting for a decision in one feed - creation and
// level-up requests, research notes - with the summary on top. Approve and
// reject inside the feed; a row opens its card.
const KINDS = [['', 'Всё'], ['CREATION', 'Личные дела'], ['LEVEL_UP', 'Повышения'], ['NOTE', 'Записки']]

export default function Inbox() {
    const [summary, setSummary] = useState(null)
    const [requests, setRequests] = useState(null)
    const [notes, setNotes] = useState(null)
    const [kind, setKind] = useState('')
    const [order, setOrder] = useState('old')
    const [openKey, setOpenKey] = useState(null)
    const [runes] = useRefData('runes')
    const [magic] = useMagicData()

    const refresh = useCallback(() => {
        api.get('/api/admin/summary').then((res) => setSummary(res.data)).catch(() => {})
        api.get('/api/admin/requests?status=PENDING').then((res) => setRequests(res.data)).catch(() => setRequests([]))
        api.get('/api/admin/research-notes?status=PENDING').then((res) => setNotes(res.data)).catch(() => setNotes([]))
    }, [])
    useEffect(() => { refresh() }, [refresh])

    const feed = useMemo(() => {
        const items = [
            ...(requests || []).map((r) => ({ key: `r${r.id}`, kind: r.type, at: r.createdAt, request: r })),
            ...(notes || []).map((n) => ({ key: `n${n.id}`, kind: 'NOTE', at: n.createdAt, note: n })),
        ].filter((i) => !kind || i.kind === kind)
        items.sort((a, b) => (order === 'old' ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at)))
        return items
    }, [requests, notes, kind, order])

    const runeName = (key) => runes?.find((r) => r.key === key)?.nameRu || key
    const runeCap = (key) => runes?.find((r) => r.key === key)?.levelCap
    const done = () => { setOpenKey(null); refresh() }
    const zone = browserZone()

    return (
        <section className="gm-section">
            <h1 className="gm-title">Входящие</h1>
            {summary && (
                <p className="gm-summary" role="status">
                    <span>Ждут решения: <b>{summary.pendingRequests + summary.pendingNotes}</b></span>
                    <span>Открытых снов: <b>{summary.openDreams}</b></span>
                    <span>Запечатанных посылок: <b>{summary.sealedParcels}</b></span>
                    <span>Ближайшая сессия: {summary.nextSession
                        ? <><Link to="/calendar?tab=sessions">{summary.nextSession.title}</Link>, <b>{formatDay(summary.nextSession.startUtc, zone)}, {formatTime(summary.nextSession.startUtc, zone)}</b> ({cityName(zone)})</>
                        : <b>не назначена</b>}</span>
                </p>
            )}
            <div className="admin-filters">
                <select className="sheet-input" aria-label="Тип" value={kind} onChange={(e) => setKind(e.target.value)}>
                    {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <select className="sheet-input" aria-label="Порядок" value={order} onChange={(e) => setOrder(e.target.value)}>
                    <option value="old">Сначала старые</option>
                    <option value="new">Сначала новые</option>
                </select>
            </div>
            {(!requests || !notes) && <Loader />}
            {requests && notes && feed.length === 0 && <EmptyState>Решать нечего. Секретарша проверит позже.</EmptyState>}
            <ul className="gm-feed">
                {feed.map((item) => {
                    const open = openKey === item.key
                    const r = item.request
                    const n = item.note
                    return (
                        <li key={item.key} className={`gm-feed-item ${open ? 'is-open' : ''}`}>
                            <button type="button" className="gm-feed-row" aria-expanded={open} onClick={() => setOpenKey(open ? null : item.key)}>
                                <span className={`gm-kind is-${item.kind.toLowerCase()}`}>{r ? requestTitle(r) : 'Записка'}</span>
                                <span className="gm-feed-what">
                                    {r ? r.characterName : `«${n.spellNameRu || n.spellName}» · ${n.characterName}`}
                                    <span className="gm-feed-meta"> · игрок {r ? r.playerName : n.playerName}
                                        {r?.type === 'LEVEL_UP' && ` · ${r.currentLevel} → ${r.requestedLevel}`}</span>
                                </span>
                                <span className="gm-feed-date">{formatDateTime(item.at)}</span>
                                <span className="gm-feed-toggle" aria-hidden="true">{open ? '▴' : '▾'}</span>
                            </button>
                            {open && r && <RequestCard request={r} runeName={runeName} runeCap={runeCap} onDone={done} />}
                            {open && n && magic && <NoteCard note={n} magic={magic} onDone={done} />}
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
