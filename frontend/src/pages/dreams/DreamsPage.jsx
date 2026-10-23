import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { Button, EmptyState, Loader, PageHeader } from '../../components/ui'
import { STATUS, caseNumber } from '../../lib/dreams'
import '../../styles/dreams.css'

// «Сны»: dream cases as folders, in the night palette.
export default function DreamsPage() {
    const { hasSection } = useAuth()
    const [dreams, setDreams] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => {
        api.get('/api/dreams').then((res) => setDreams(res.data)).catch(() => { setDreams([]); setError('Не удалось достать дела. Повторите.') })
    }, [])

    if (!dreams) return <div className="parchment-page" data-theme="night"><Loader /></div>
    return (
        <div className="parchment-page dreams-page" data-theme="night">
            <PageHeader title="Сны" subtitle="Дела, в которые отправляют сотрудников."
                actions={hasSection('*') && <Button variant="secondary" to="/admin#dreams">Вести дела</Button>} />
            <div className="dreams-body">
                {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                {dreams.length === 0 && !error && <EmptyState>Дел пока нет. Когда сон откроется, папка появится здесь.</EmptyState>}
                <ul className="dream-folders">
                    {dreams.map((d) => <li key={d.id}><DreamFolder dream={d} /></li>)}
                </ul>
            </div>
        </div>
    )
}

export function DreamStamp({ status }) {
    return <span className={`dream-stamp is-${status.toLowerCase()}`}>{STATUS[status]}</span>
}

function DreamFolder({ dream }) {
    const current = dream.participants.filter((p) => !p.left)
    return (
        <Link to={`/dreams/${dream.id}`} className="dream-folder">
            <span className="dream-folder-tab">Дело {caseNumber(dream.number)}</span>
            <span className="dream-folder-title">{dream.title}</span>
            <DreamStamp status={dream.status} />
            {current.length > 0 && (
                <span className="dream-folder-people">
                    {current.map((p) => <span key={p.characterId} className={`dream-person ${p.mine ? 'is-mine' : ''}`}>{p.characterName}</span>)}
                </span>
            )}
            {dream.rewardSummary && <span className="dream-folder-reward">Награда: {dream.rewardSummary}</span>}
        </Link>
    )
}
