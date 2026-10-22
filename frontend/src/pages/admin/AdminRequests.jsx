import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Button, Dossier, EmptyState, Loader, Stamp } from '../../components/ui'
import RequestList from '../../components/RequestList'
import { requestTitle } from '../../lib/requests'
import RuneBadge from '../../components/brand/RuneBadge'
import { className, formatDateTime, raceName } from '../../constants/dnd-ru'
import { useRefData } from '../../lib/refData'

// Панель ГМ → «Заявки»: the open queue with approve / reject and a
// comment, then the history of decisions.
export default function AdminRequests() {
    const [open, setOpen] = useState(null)
    const [history, setHistory] = useState(null)
    const [runes] = useRefData('runes')

    const refresh = useCallback(() => {
        api.get('/api/admin/requests?status=PENDING').then((res) => setOpen(res.data)).catch(() => setOpen([]))
        api.get('/api/admin/requests?status=DECIDED').then((res) => setHistory(res.data)).catch(() => setHistory([]))
    }, [])

    useEffect(() => { refresh() }, [refresh])

    const runeName = (key) => runes?.find((r) => r.key === key)?.nameRu || key
    const runeCap = (key) => runes?.find((r) => r.key === key)?.levelCap

    return (
        <section id="requests" className="admin-section">
            <h2 className="sheet-section-title" style={{ marginBottom: '0.75rem' }}>Заявки</h2>
            {!open && <Loader />}
            {open && open.length === 0 && <EmptyState>Заявок нет. Секретарша проверит позже.</EmptyState>}
            <div className="admin-requests">
                {open?.map((r) => <RequestCard key={r.id} request={r} runeName={runeName} runeCap={runeCap} onDone={refresh} />)}
            </div>

            {history && history.length > 0 && (
                <>
                    <h3 className="reception-section-title" style={{ marginTop: '1.5rem' }}>История решений</h3>
                    <RequestList requests={history} />
                </>
            )}
        </section>
    )
}

function RequestCard({ request: r, runeName, runeCap, onDone }) {
    const [comment, setComment] = useState('')
    const [confirmRune, setConfirmRune] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [decided, setDecided] = useState(null) // 'approved' | 'rejected'
    const fancyRune = r.type === 'CREATION' && r.requestedRuneTier && r.requestedRuneTier !== 'COMMON'

    const decide = async (action) => {
        setBusy(true)
        setError('')
        try {
            await api.post(`/api/admin/requests/${r.id}/${action}`, { gmComment: comment, confirmRune })
            setDecided(action === 'approve' ? 'approved' : 'rejected')
            setTimeout(onDone, 1200)
        } catch (err) {
            setError(err.response?.data?.message || 'Допуск отклонён. Обратитесь в приёмную.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dossier tab={requestTitle(r)} className="request-card">
            <div className="request-card-head">
                <div>
                    <Link to={`/characters/${r.characterId}`} className="request-char">{r.characterName}</Link>
                    <p className="request-meta">
                        {className(r.characterClass)}, {raceName(r.characterRace)} · игрок {r.playerName} · подана {formatDateTime(r.createdAt)}
                    </p>
                </div>
                {decided && <Stamp kind={decided} />}
            </div>
            <dl className="wiz-dl">
                <dt>Уровень</dt>
                <dd>{r.type === 'LEVEL_UP' ? `${r.currentLevel} → ${r.requestedLevel}` : r.requestedLevel}</dd>
                <dt>Руна</dt>
                <dd className="request-rune">
                    <RuneBadge tier={r.type === 'CREATION' ? r.requestedRuneTier : r.runeTier} size={20} />
                    {runeName(r.type === 'CREATION' ? r.requestedRuneTier : r.runeTier)} · потолок {r.type === 'CREATION' ? (runeCap(r.requestedRuneTier) ?? r.levelCap) : r.levelCap}
                </dd>
                {r.hpRoll != null && (
                    <><dt>Хиты</dt><dd>+{r.hpGain} ({r.hpMethod === 'ROLL' ? `бросок ${r.hpRoll} на к${r.hitDie}` : `среднее ${r.hpRoll} для к${r.hitDie}`}, с мод. ТЕЛ)</dd></>
                )}
                {r.aboveCap && <><dt>Допуск</dt><dd className="request-warn">Сверх потолка руны: нужен допуск</dd></>}
                {r.playerComment && <><dt>Игрок</dt><dd>{r.playerComment}</dd></>}
            </dl>
            {!decided && (
                <>
                    {fancyRune && (
                        <label className="pass-check">
                            <input type="checkbox" checked={confirmRune} onChange={(e) => setConfirmRune(e.target.checked)} />
                            Подтверждаю руну «{runeName(r.requestedRuneTier)}» (без отметки — обычная)
                        </label>
                    )}
                    <label className="sheet-label" htmlFor={`gm-comment-${r.id}`}>Комментарий ГМ</label>
                    <textarea id={`gm-comment-${r.id}`} className="sheet-input sheet-textarea" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
                    {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                    <div className="ui-modal-actions">
                        <Button variant="danger" disabled={busy} onClick={() => decide('reject')}>Отклонить</Button>
                        <Button disabled={busy} onClick={() => decide('approve')}>Одобрить</Button>
                    </div>
                </>
            )}
        </Dossier>
    )
}
