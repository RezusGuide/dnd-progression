import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { Button, EmptyState, Field, Loader, Modal } from '../../components/ui'
import { className, raceName } from '../../constants/dnd-ru'
import { caseNumber } from '../../lib/dreams'
import { APPROVAL_LABEL } from '../../lib/gm'
import '../../styles/chest.css'

// «Сотрудники»: every character in one table. Pick rows for group actions:
// experience, inspiration, a parcel. A row opens the sheet.
export default function Staff() {
    const navigate = useNavigate()
    const [rows, setRows] = useState(null)
    const [campaign, setCampaign] = useState('')
    const [status, setStatus] = useState('')
    const [picked, setPicked] = useState([])
    const [xpOpen, setXpOpen] = useState(false)
    const [notice, setNotice] = useState('')
    const [error, setError] = useState('')

    const refresh = useCallback(() => {
        api.get('/api/admin/staff').then((res) => setRows(res.data)).catch(() => setRows([]))
    }, [])
    useEffect(() => { refresh() }, [refresh])

    if (!rows) return <section className="gm-section"><Loader /></section>
    const campaigns = [...new Map(rows.filter((r) => r.campaignId).map((r) => [r.campaignId, r.campaignName])).entries()]
    const shown = rows.filter((r) => (!campaign || String(r.campaignId) === campaign || (campaign === 'none' && !r.campaignId))
        && (!status || r.approvalStatus === status))
    const allPicked = shown.length > 0 && shown.every((r) => picked.includes(r.id))
    const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    const toggleAll = () => setPicked(allPicked ? picked.filter((id) => !shown.some((r) => r.id === id)) : [...new Set([...picked, ...shown.map((r) => r.id)])])

    const group = async (url, body, message) => {
        setError('')
        setNotice('')
        try {
            const res = await api.post(url, { characterIds: picked, ...body })
            setRows(res.data)
            setNotice(message)
            return true
        } catch (err) {
            setError(err.response?.data?.message || 'Не подшилось. Повторите.')
            return false
        }
    }

    return (
        <section className="gm-section">
            <h1 className="gm-title">Сотрудники</h1>
            <div className="admin-filters">
                <select className="sheet-input" aria-label="Кампания" value={campaign} onChange={(e) => setCampaign(e.target.value)}>
                    <option value="">Все кампании</option>
                    {campaigns.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    <option value="none">Без кампании</option>
                </select>
                <select className="sheet-input" aria-label="Статус дела" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Все статусы</option>
                    {Object.entries(APPROVAL_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
            </div>

            <div className={`gm-actions-bar ${picked.length ? 'is-active' : ''}`} role="toolbar" aria-label="Групповые действия">
                <span className="gm-picked">Выбрано: {picked.length}</span>
                <Button disabled={!picked.length} onClick={() => setXpOpen(true)}>Начислить опыт</Button>
                <Button variant="secondary" disabled={!picked.length} onClick={() => group('/api/admin/staff/inspiration', { value: true }, 'Вдохновение выдано.')}>Вдохновение: выдать</Button>
                <Button variant="secondary" disabled={!picked.length} onClick={() => group('/api/admin/staff/inspiration', { value: false }, 'Вдохновение снято.')}>Снять</Button>
                <Button variant="secondary" disabled={!picked.length} onClick={() => navigate(`/gm/chest?to=${picked.join(',')}`)}>Отправить посылку</Button>
                {picked.length > 0 && <Button variant="ghost" onClick={() => setPicked([])}>Снять выбор</Button>}
            </div>
            {notice && <p className="tome-notice" role="status">{notice}</p>}
            {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}

            {shown.length === 0 ? <EmptyState>Никого не нашлось.</EmptyState> : (
                <div className="chest-table-wrap">
                    <table className="chest-table gm-staff-table">
                        <thead>
                            <tr>
                                <th scope="col"><input type="checkbox" aria-label="Выбрать всех" checked={allPicked} onChange={toggleAll} /></th>
                                <th scope="col">Сотрудник</th><th scope="col">Игрок</th><th scope="col">Класс и раса</th>
                                <th scope="col">Уровень</th><th scope="col">Дело</th><th scope="col">Кампания</th>
                                <th scope="col">Хиты</th><th scope="col">Опыт</th><th scope="col">Сон</th><th scope="col">Аспекты</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((r) => (
                                <tr key={r.id} className={`gm-row ${picked.includes(r.id) ? 'is-picked' : ''}`} onClick={() => navigate(`/characters/${r.id}`)}>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <input type="checkbox" aria-label={`Выбрать ${r.name}`} checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />
                                    </td>
                                    <th scope="row"><Link to={`/characters/${r.id}`} onClick={(e) => e.stopPropagation()}>{r.name}</Link>{r.inspiration && <span className="gm-insp" title="Вдохновение"> ✦</span>}</th>
                                    <td>{r.player || '—'}</td>
                                    <td>{className(r.characterClass)}, {raceName(r.race)}</td>
                                    <td className="chest-num">{r.level} / {r.levelCap}</td>
                                    <td className="gm-nowrap"><span className={`gm-approval is-${r.approvalStatus.toLowerCase()}`}>{APPROVAL_LABEL[r.approvalStatus]}</span></td>
                                    <td>{r.campaignName || '—'}</td>
                                    <td className="chest-num">{r.hpCurrent ?? '—'} / {r.hpMax ?? '—'}</td>
                                    <td className="chest-num">{r.experiencePoints.toLocaleString('ru-RU')}</td>
                                    <td className="gm-nowrap" title={r.dreamNumber ? `Дело ${caseNumber(r.dreamNumber)}, стадия ${r.dreamStage}` : undefined}>{r.dreamNumber ? `${caseNumber(r.dreamNumber)}, ст. ${r.dreamStage}` : '—'}</td>
                                    <td className="chest-num">{r.aspects}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {xpOpen && <XpDialog count={picked.length} onClose={() => setXpOpen(false)}
                onSubmit={async (amount, comment) => {
                    if (await group('/api/admin/staff/xp', { amount, comment }, `Опыт начислен: ${amount > 0 ? '+' : ''}${amount} × ${picked.length}.`)) setXpOpen(false)
                }} />}
        </section>
    )
}

export function XpDialog({ count, onClose, onSubmit }) {
    const [amount, setAmount] = useState('')
    const [comment, setComment] = useState('')
    const n = parseInt(amount, 10)
    return (
        <Modal title="Начислить опыт" onClose={onClose}
            actions={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button disabled={!n} onClick={() => onSubmit(n, comment)}>Начислить</Button></>}>
            <p>Каждому из выбранных: {count}.</p>
            <Field label="Сколько опыта" type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                hint="Отрицательное число — поправка. Ниже нуля опыт не опустится." />
            <Field label="Комментарий" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Сессия 13: Латунная дверь" />
        </Modal>
    )
}
