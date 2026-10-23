import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Button, EmptyState, Loader } from '../../components/ui'
import { ACTION_LABEL, journalLink } from '../../lib/gm'
import { formatDateTime } from '../../constants/dnd-ru'
import '../../styles/chest.css'

// «Журнал»: who did what to whom, newest first, by pages.
export default function Journal() {
    const [action, setAction] = useState('')
    const [page, setPage] = useState(0)
    const [data, setData] = useState(null)
    useEffect(() => {
        api.get('/api/admin/log', { params: { action: action || undefined, page, size: 30 } })
            .then((res) => setData(res.data)).catch(() => setData({ items: [], page: 0, pages: 0, total: 0 }))
    }, [action, page])

    return (
        <section className="gm-section">
            <h1 className="gm-title">Журнал</h1>
            <div className="admin-filters">
                <select className="sheet-input" aria-label="Действие" value={action} onChange={(e) => { setAction(e.target.value); setPage(0) }}>
                    <option value="">Все действия</option>
                    {Object.entries(ACTION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                {data && <span className="calendar-help">Записей: {data.total}</span>}
            </div>
            {!data && <Loader />}
            {data && data.items.length === 0 && <EmptyState>Журнал пуст.</EmptyState>}
            {data && data.items.length > 0 && (
                <div className="chest-table-wrap">
                    <table className="chest-table gm-journal-table">
                        <thead>
                            <tr><th scope="col">Когда</th><th scope="col">Кто</th><th scope="col">Действие</th><th scope="col">Над кем</th><th scope="col">Что</th></tr>
                        </thead>
                        <tbody>
                            {data.items.map((e) => {
                                const to = journalLink(e)
                                return (
                                    <tr key={e.id}>
                                        <td className="chest-origin">{formatDateTime(e.at)}</td>
                                        <td>{e.actor || 'система'}</td>
                                        <td>{ACTION_LABEL[e.action] || e.action}</td>
                                        <td>{to ? <Link to={to}>{e.targetName}</Link> : (e.targetName || '—')}</td>
                                        <td>{e.summary}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {data && data.pages > 1 && (
                <div className="gm-pager">
                    <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>← Новее</Button>
                    <span className="calendar-help">Страница {page + 1} из {data.pages}</span>
                    <Button variant="secondary" disabled={page + 1 >= data.pages} onClick={() => setPage(page + 1)}>Старее →</Button>
                </div>
            )}
        </section>
    )
}
