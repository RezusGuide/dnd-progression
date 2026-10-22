import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { Button, EmptyState, Field, Loader, Modal } from '../../components/ui'
import { durationText, useMyAvailability } from '../../lib/calendar'

// «Подбор сессии»: the polls I take part in (all of them for the GM), and
// the GM's «Новый подбор».

const STATUS = { OPEN: 'Идёт подбор', SCHEDULED: 'Назначено', CANCELLED: 'Отменён' }
const DURATIONS = Array.from({ length: 16 }, (_, i) => (i + 2) * 30) // 1 h ... 8 h 30

const isoDate = (d) => d.toISOString().slice(0, 10)

export default function PollsTab() {
    const { hasSection } = useAuth()
    const gm = hasSection('*')
    const [polls, setPolls] = useState(null)
    const [creating, setCreating] = useState(false)
    const refresh = () => api.get('/api/polls').then((res) => setPolls(res.data)).catch(() => setPolls([]))
    useEffect(() => { refresh() }, [])

    if (!polls) return <Loader />
    const dateText = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    return (
        <div className="calendar-polls">
            {gm && <div className="calendar-actions"><Button onClick={() => setCreating(true)}>Новый подбор</Button></div>}
            {polls.length === 0 && <EmptyState>Подборов нет. ГМ позовёт, когда пора.</EmptyState>}
            <ul className="calendar-poll-list">
                {polls.map((p) => (
                    <li key={p.id} className={`calendar-poll is-${p.status.toLowerCase()}`}>
                        <div>
                            <p className="calendar-poll-title">{p.title}</p>
                            <p className="calendar-poll-meta">
                                {dateText(p.dateFrom)} — {dateText(p.dateTo)} · {durationText(p.durationMinutes)} · участников {p.participants.length}
                                {p.campaignName && ` · ${p.campaignName}`}
                            </p>
                        </div>
                        <span className={`calendar-status is-${p.status.toLowerCase()}`}>{STATUS[p.status]}</span>
                        <Button variant="secondary" to={`/calendar/polls/${p.id}`}>Открыть</Button>
                    </li>
                ))}
            </ul>
            {creating && <NewPoll onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refresh() }} />}
        </div>
    )
}

function NewPoll({ onClose, onCreated }) {
    const { user } = useAuth()
    const { zone } = useMyAvailability()
    const [users, setUsers] = useState([])
    const [campaigns, setCampaigns] = useState([])
    const [characters, setCharacters] = useState([])
    const today = new Date()
    const [form, setForm] = useState({
        title: '', campaignId: '', participantIds: [user.userId],
        dateFrom: isoDate(today), dateTo: isoDate(new Date(today.getTime() + 13 * 86400000)),
        durationMinutes: 180, minParticipants: '',
    })
    const [error, setError] = useState('')
    useEffect(() => {
        api.get('/api/admin/users').then((res) => setUsers(res.data)).catch(() => {})
        api.get('/api/campaigns').then((res) => setCampaigns(Array.isArray(res.data) ? res.data : [])).catch(() => {})
        api.get('/api/characters').then((res) => setCharacters(res.data)).catch(() => {})
    }, [])
    const set = (patch) => setForm((f) => ({ ...f, ...patch }))

    // A campaign fills in its players (owners of its characters) and the GM.
    const pickCampaign = (id) => {
        const owners = characters.filter((c) => String(c.campaign?.id) === id).map((c) => c.ownerId).filter(Boolean)
        set({ campaignId: id, participantIds: id ? [...new Set([user.userId, ...owners])] : form.participantIds })
    }
    const toggle = (id) => set({
        participantIds: form.participantIds.includes(id) ? form.participantIds.filter((x) => x !== id) : [...form.participantIds, id],
    })

    const submit = async () => {
        setError('')
        try {
            await api.post('/api/polls', {
                title: form.title, campaignId: form.campaignId ? Number(form.campaignId) : null,
                participantIds: form.participantIds, dateFrom: form.dateFrom, dateTo: form.dateTo, gmTimezone: zone,
                durationMinutes: Number(form.durationMinutes), minParticipants: form.minParticipants ? Number(form.minParticipants) : null,
            })
            onCreated()
        } catch (err) {
            setError(err.response?.data?.message || 'Подбор не создался. Повторите.')
        }
    }

    return (
        <Modal title="Новый подбор" onClose={onClose}
            actions={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button onClick={submit} disabled={!form.title.trim() || form.participantIds.length === 0}>Начать подбор</Button></>}>
            <Field label="Название" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Сессия 13: Латунная дверь" />
            <Field label="Кампания (подставит участников)" as="select" value={form.campaignId} onChange={(e) => pickCampaign(e.target.value)}>
                <option value="">— Без кампании —</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Field>
            <fieldset className="calendar-people">
                <legend className="sheet-label">Участники: {form.participantIds.length}</legend>
                {users.map((u) => (
                    <label key={u.id} className="wiz-skill">
                        <input type="checkbox" checked={form.participantIds.includes(u.id)} onChange={() => toggle(u.id)} />
                        <span>{u.username}{u.id === user.userId ? ' (вы)' : ''}</span>
                    </label>
                ))}
            </fieldset>
            <div className="calendar-fields">
                <Field label="С" type="date" value={form.dateFrom} onChange={(e) => set({ dateFrom: e.target.value })} />
                <Field label="По" type="date" value={form.dateTo} onChange={(e) => set({ dateTo: e.target.value })} />
            </div>
            <div className="calendar-fields">
                <Field label="Длительность" as="select" value={form.durationMinutes} onChange={(e) => set({ durationMinutes: e.target.value })}>
                    {DURATIONS.map((d) => <option key={d} value={d}>{durationText(d)}</option>)}
                </Field>
                <Field label="Минимум участников" type="number" min="1" max={form.participantIds.length} placeholder={`все (${form.participantIds.length})`}
                    value={form.minParticipants} onChange={(e) => set({ minParticipants: e.target.value })} />
            </div>
            <p className="calendar-help">Даты — по вашему поясу ({zone}). Окна каждый увидит в своём.</p>
            {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
        </Modal>
    )
}
