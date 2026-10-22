import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Button, Dossier, EmptyState, Loader, Stamp } from '../../components/ui'
import AspectIcon from '../../components/aspects/AspectIcon'
import HexGrid from '../../components/aspects/HexGrid'
import { className, formatDateTime } from '../../constants/dnd-ru'
import { useMagicData } from '../../lib/magic'
import { validate } from '../../lib/research'

// Панель ГМ → «Исследования»: research notes waiting for a decision, each
// with a read-only preview of the grid, then the history of decisions.
export default function AdminResearch() {
    const [magic] = useMagicData()
    const [open, setOpen] = useState(null)
    const [history, setHistory] = useState(null)

    const refresh = useCallback(() => {
        api.get('/api/admin/research-notes?status=PENDING').then((res) => setOpen(res.data)).catch(() => setOpen([]))
        api.get('/api/admin/research-notes?status=DECIDED').then((res) => setHistory(res.data)).catch(() => setHistory([]))
    }, [])

    useEffect(() => { refresh() }, [refresh])

    return (
        <section id="research" className="admin-section">
            <h2 className="sheet-section-title" style={{ marginBottom: '0.75rem' }}>Исследования</h2>
            {(!open || !magic) && <Loader />}
            {open && open.length === 0 && <EmptyState>Записок нет. Секретарша проверит позже.</EmptyState>}
            {magic && (
                <div className="admin-requests">
                    {open?.map((n) => <NoteCard key={n.id} note={n} magic={magic} onDone={refresh} />)}
                </div>
            )}
            {history && history.length > 0 && (
                <>
                    <h3 className="reception-section-title" style={{ marginTop: '1.5rem' }}>История решений</h3>
                    <ul className="note-history">
                        {history.map((n) => (
                            <li key={n.id}>
                                <span className={`note-status note-${n.status.toLowerCase()}`}>{n.status === 'APPROVED' ? 'Одобрено' : 'Отказано'}</span>
                                <span>«{n.spellNameRu || n.spellName}» · {n.characterName}</span>
                                <span className="note-meta">{formatDateTime(n.decidedAt)}{n.gmComment ? ` · ${n.gmComment}` : ''}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    )
}

function NoteCard({ note: n, magic, onDone }) {
    const [comment, setComment] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [decided, setDecided] = useState(null)
    const grid = n.grid || {}
    const anchors = grid.anchors || []
    const placed = grid.placed || []
    const result = validate(magic.graph, grid.radius || 4, anchors, placed)

    const decide = async (action) => {
        setBusy(true)
        setError('')
        try {
            await api.post(`/api/admin/research-notes/${n.id}/${action}`, { gmComment: comment })
            setDecided(action === 'approve' ? 'approved' : 'rejected')
            setTimeout(onDone, 1200)
        } catch (err) {
            setError(err.response?.data?.message || 'Решение не сохранилось. Повторите.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dossier tab="Исследовательская записка" className="request-card note-card">
            <div className="request-card-head">
                <div>
                    <p className="request-char">«{n.spellNameRu || n.spellName}» · {n.spellLevel} круг · {magic.schoolByKey[n.school]?.nameRu || n.school}</p>
                    <p className="request-meta">
                        <Link to={`/characters/${n.characterId}?tab=magic`}>{n.characterName}</Link>
                        {' · '}{className(n.characterClass)}, {n.characterLevel} уровень · игрок {n.playerName} · подана {formatDateTime(n.createdAt)}
                    </p>
                </div>
                {decided && <Stamp kind={decided} />}
            </div>
            <div className="note-preview" data-theme="night">
                <HexGrid radius={grid.radius || 4} anchors={anchors} placed={placed} byKey={magic.byKey} graph={magic.graph}
                    result={result} size={16} readOnly label={`Сетка записки «${n.spellNameRu || n.spellName}»`} />
            </div>
            <p className="sheet-label">Списано</p>
            <ul className="research-spent">
                {Object.entries(n.spent || {}).map(([k, count]) => (
                    <li key={k}><AspectIcon aspect={magic.byKey[k]} size={22} /> {magic.byKey[k]?.nameRu || k} × {count}</li>
                ))}
            </ul>
            {!decided && (
                <>
                    <label className="sheet-label" htmlFor={`note-comment-${n.id}`}>Комментарий ГМ</label>
                    <textarea id={`note-comment-${n.id}`} className="sheet-input sheet-textarea" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
                    {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                    <div className="ui-modal-actions">
                        <Button variant="danger" onClick={() => decide('reject')} disabled={busy}>Отклонить</Button>
                        <Button onClick={() => decide('approve')} disabled={busy}>Одобрить</Button>
                    </div>
                </>
            )}
        </Dossier>
    )
}
