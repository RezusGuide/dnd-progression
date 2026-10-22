import { Link } from 'react-router-dom'
import { Stamp } from './ui'
import { className, formatDateTime } from '../constants/dnd-ru'
import { requestTitle } from '../lib/requests'

const STAMP = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' }
const STAMP_TEXT = { PENDING: 'На рассмотрении', APPROVED: 'Одобрено', REJECTED: 'Отказано' }

// Compact list of admission requests (Приёмная, sheet history).
export default function RequestList({ requests }) {
    return (
        <ul className="request-list">
            {requests.map((r) => (
                <li key={r.id} className="request-row">
                    <div className="request-main">
                        <Link to={`/characters/${r.characterId}`} className="request-char">
                            {r.characterName}
                            <span className="request-meta"> · {className(r.characterClass)}</span>
                        </Link>
                        <span>{requestTitle(r)}{r.aboveCap ? ' · сверх потолка руны' : ''}</span>
                        <span className="request-date">{formatDateTime(r.decidedAt || r.createdAt)}</span>
                        {r.gmComment && <span className="request-comment">ГМ: {r.gmComment}</span>}
                    </div>
                    <Stamp kind={STAMP[r.status]}>{STAMP_TEXT[r.status]}</Stamp>
                </li>
            ))}
        </ul>
    )
}
