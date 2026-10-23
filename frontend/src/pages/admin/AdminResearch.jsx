import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Button, Dossier, Stamp } from '../../components/ui'
import AspectIcon from '../../components/aspects/AspectIcon'
import HexGrid from '../../components/aspects/HexGrid'
import { className, formatDateTime } from '../../constants/dnd-ru'
import { validate } from '../../lib/research'
import '../../styles/research.css'

// Пульт ГМ → «Входящие»: the card of one research note, with a read-only
// preview of the grid and approve / reject. The feed is pages/gm/Inbox.jsx.
export function NoteCard({ note: n, magic, onDone }) {
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
