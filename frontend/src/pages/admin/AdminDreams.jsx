import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import { Button, EmptyState, Field, Modal } from '../../components/ui'
import { RewardForm } from './AdminChest'
import { MAX_STAGE, STATUS, caseNumber, stageLabel, useStageLabels } from '../../lib/dreams'
import { OPTION_STATUS_LABELS } from '../../lib/refData'
import '../../styles/dreams.css'
import '../../styles/chest.css'

// Панель ГМ → «Сны»: cases, who is inside, immersion and form, trophies and
// closing a case. GM notes stay here; players never receive them.

const emptyCase = () => ({ id: null, title: '', summary: '', status: 'ANNOUNCED', campaignId: '', rewardSummary: '', gmNotes: '' })

export default function AdminDreams() {
    const [dreams, setDreams] = useState(null)
    const [characters, setCharacters] = useState([])
    const [campaigns, setCampaigns] = useState([])
    const [templates, setTemplates] = useState([])
    const [races, setRaces] = useState([])
    const [editing, setEditing] = useState(null)
    const [closing, setClosing] = useState(null)
    const [trophy, setTrophy] = useState(null)
    const [error, setError] = useState('')
    const labels = useStageLabels()

    const refresh = useCallback(() => {
        api.get('/api/admin/dreams').then((res) => setDreams(res.data)).catch(() => setDreams([]))
    }, [])
    useEffect(() => {
        refresh()
        api.get('/api/characters').then((res) => setCharacters(res.data)).catch(() => {})
        api.get('/api/campaigns').then((res) => setCampaigns(Array.isArray(res.data) ? res.data : [])).catch(() => {})
        api.get('/api/admin/item-templates').then((res) => setTemplates(res.data)).catch(() => {})
        api.get('/api/admin/options').then((res) => setRaces(res.data.races || [])).catch(() => {})
    }, [refresh])

    // Every change returns the whole case; swap it in place.
    const call = async (fn, fallback = 'Не подшилось. Повторите.') => {
        setError('')
        try {
            const res = await fn()
            if (res?.data?.id) setDreams((list) => list.map((d) => (d.id === res.data.id ? res.data : d)))
            return true
        } catch (err) {
            setError(err.response?.data?.message || fallback)
            return false
        }
    }

    return (
        <section id="dreams" className="sheet-section admin-section">
            <div className="admin-section-head">
                <h2 className="sheet-section-title">Сны</h2>
                <Button onClick={() => setEditing(emptyCase())}>+ Новое дело</Button>
            </div>
            {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
            {dreams && dreams.length === 0 && <EmptyState>Дел нет.</EmptyState>}
            <div className="dream-admin-list">
                {(dreams || []).map((d) => (
                    <CaseCard key={d.id} dream={d} characters={characters} races={races} labels={labels} call={call}
                        onEdit={() => setEditing({ ...emptyCase(), ...d, campaignId: d.campaignId ?? '', summary: d.summary || '', rewardSummary: d.rewardSummary || '', gmNotes: d.gmNotes || '' })}
                        onClose={() => setClosing(d)} onTrophy={() => setTrophy(d)} />
                ))}
            </div>

            {editing && <CaseForm initial={editing} campaigns={campaigns} onCancel={() => setEditing(null)}
                onSaved={() => { setEditing(null); refresh() }} />}
            {closing && <CloseCase dream={closing} onCancel={() => setClosing(null)}
                onClosed={(d) => { setClosing(null); setDreams((list) => list.map((x) => (x.id === d.id ? d : x))) }} />}
            {trophy && (
                <Modal title={`Выдать трофей: Дело ${caseNumber(trophy.number)}`} onClose={() => setTrophy(null)} wide
                    actions={<Button variant="ghost" onClick={() => setTrophy(null)}>Закрыть</Button>}>
                    <RewardForm characters={characters} campaigns={campaigns} templates={templates} onSent={() => {}}
                        trophy={{
                            dreamId: trophy.id, caseNo: caseNumber(trophy.number),
                            participants: trophy.participants.filter((p) => !p.leftAt).map((p) => ({ characterId: p.characterId, characterName: p.characterName })),
                        }} />
                </Modal>
            )}
        </section>
    )
}

function CaseCard({ dream, characters, races, labels, call, onEdit, onClose, onTrophy }) {
    const [adding, setAdding] = useState('')
    const inside = dream.participants.filter((p) => !p.leftAt)
    const free = characters.filter((c) => !inside.some((p) => p.characterId === c.id))
    const closed = dream.status === 'CLEARED' || dream.status === 'DISTORTED'
    const base = `/api/admin/dreams/${dream.id}`

    const add = async (id) => {
        setAdding('')
        if (id) await call(() => api.post(`${base}/participants`, { characterId: Number(id) }))
    }
    const update = (p, body) => call(() => api.put(`${base}/participants/${p.id}`, body))

    return (
        <article className="dream-admin-card ui-dossier">
            <header className="dream-admin-head">
                <span className="dream-folder-tab">Дело {caseNumber(dream.number)}</span>
                <h3 className="dream-admin-title">{dream.title}</h3>
                <span className={`dream-stamp is-${dream.status.toLowerCase()}`}>{STATUS[dream.status]}</span>
            </header>
            <p className="calendar-help">{[dream.campaignName && `Кампания «${dream.campaignName}»`, dream.rewardSummary && `Награда: ${dream.rewardSummary}`].filter(Boolean).join(' · ') || 'Без кампании'}</p>
            {dream.gmNotes && <p className="dream-gm-notes"><span className="sheet-label">Заметки ГМ</span><span className="dream-text">{dream.gmNotes}</span></p>}

            <ul className="dream-admin-people">
                {inside.length === 0 && <li className="research-note">В деле никого.</li>}
                {inside.map((p) => (
                    <li key={p.id} className="dream-admin-person">
                        <span className="dream-admin-name">{p.characterName}{p.ownerName && <span className="calendar-help"> · {p.ownerName}</span>}</span>
                        <span className="dream-stage-ctl" aria-label={`Стадия погружения ${p.characterName}`}>
                            <Button variant="secondary" disabled={p.immersionStage <= 0} aria-label="Стадия меньше"
                                onClick={() => update(p, { immersionStage: p.immersionStage - 1 })}>−</Button>
                            <span className="dream-stage-value" title={stageLabel(labels, p.immersionStage)}>{p.immersionStage}</span>
                            <Button variant="secondary" disabled={p.immersionStage >= MAX_STAGE} aria-label="Стадия больше"
                                onClick={() => update(p, { immersionStage: p.immersionStage + 1 })}>+</Button>
                            <span className="calendar-help">{stageLabel(labels, p.immersionStage)}</span>
                        </span>
                        <select className="sheet-input" aria-label={`Форма во сне: ${p.characterName}`} value={p.dreamForm || ''}
                            onChange={(e) => update(p, { dreamForm: e.target.value })}>
                            <option value="">Своя форма</option>
                            {races.map((r) => <option key={r.key} value={r.key}>{r.nameRu} · {OPTION_STATUS_LABELS[r.effectiveStatus] || r.effectiveStatus}</option>)}
                        </select>
                        <input className="sheet-input dream-note-input" aria-label={`Что изменилось: ${p.characterName}`} placeholder="Что изменилось (видит игрок)"
                            defaultValue={p.stageNote || ''} key={`${p.id}-${p.stageNote || ''}`}
                            onBlur={(e) => { if (e.target.value !== (p.stageNote || '')) update(p, { stageNote: e.target.value }) }} />
                        <Button variant="ghost" onClick={() => call(() => api.delete(`${base}/participants/${p.id}`))}>Вывести из сна</Button>
                    </li>
                ))}
            </ul>

            <div className="dream-admin-actions">
                <select className="sheet-input" aria-label="Добавить участника" value={adding} onChange={(e) => add(e.target.value)}>
                    <option value="">+ Добавить участника…</option>
                    {free.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button variant="secondary" onClick={onEdit}>Править</Button>
                <Button variant="secondary" onClick={onTrophy} disabled={inside.length === 0}>Выдать трофей</Button>
                {!closed && <Button variant="danger" onClick={onClose}>Закрыть дело</Button>}
            </div>
        </article>
    )
}

function CaseForm({ initial, campaigns, onCancel, onSaved }) {
    const [form, setForm] = useState(initial)
    const [error, setError] = useState('')
    const set = (patch) => setForm((f) => ({ ...f, ...patch }))
    const save = async () => {
        setError('')
        const body = { ...form, campaignId: form.campaignId ? Number(form.campaignId) : null }
        try {
            if (form.id) await api.put(`/api/admin/dreams/${form.id}`, body)
            else await api.post('/api/admin/dreams', body)
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || 'Не подшилось. Повторите.')
        }
    }
    return (
        <Modal title={form.id ? `Дело ${caseNumber(form.number)}` : 'Новое дело'} onClose={onCancel}
            actions={<><Button variant="ghost" onClick={onCancel}>Отмена</Button><Button onClick={save} disabled={!form.title.trim()}>Подшить</Button></>}>
            <Field label="Название дела" value={form.title} onChange={(e) => set({ title: e.target.value })}
                hint="Только внутриигровое название. Не называйте произведение, на котором основан сон." />
            <Field label="Что известно сотрудникам" as="textarea" rows={4} value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
            <div className="calendar-fields">
                <Field label="Статус" as="select" value={form.status} onChange={(e) => set({ status: e.target.value })}>
                    {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Field>
                <Field label="Кампания" as="select" value={form.campaignId} onChange={(e) => set({ campaignId: e.target.value })}>
                    <option value="">— Без кампании —</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Field>
            </div>
            <Field label="Награда (текст для игроков)" value={form.rewardSummary} onChange={(e) => set({ rewardSummary: e.target.value })} />
            <Field label="Заметки ГМ" as="textarea" rows={3} value={form.gmNotes} onChange={(e) => set({ gmNotes: e.target.value })}
                hint="Видите только вы." />
            {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
        </Modal>
    )
}

function CloseCase({ dream, onCancel, onClosed }) {
    const [outcome, setOutcome] = useState('CLEARED')
    const [reward, setReward] = useState(dream.rewardSummary || '')
    const [error, setError] = useState('')
    const close = async () => {
        setError('')
        try {
            const res = await api.post(`/api/admin/dreams/${dream.id}/close`, { outcome, rewardSummary: reward })
            onClosed(res.data)
        } catch (err) {
            setError(err.response?.data?.message || 'Не закрылось. Повторите.')
        }
    }
    return (
        <Modal title={`Закрыть дело ${caseNumber(dream.number)}`} onClose={onCancel}
            actions={<><Button variant="ghost" onClick={onCancel}>Отмена</Button><Button variant="danger" onClick={close}>Закрыть дело</Button></>}>
            <fieldset className="calendar-modes">
                <legend className="sheet-label">Итог</legend>
                <label className="wiz-skill"><input type="radio" name="outcome" checked={outcome === 'CLEARED'} onChange={() => setOutcome('CLEARED')} /> <span>Зачищено</span></label>
                <label className="wiz-skill"><input type="radio" name="outcome" checked={outcome === 'DISTORTED'} onChange={() => setOutcome('DISTORTED')} /> <span>Искажено (сон откроется снова)</span></label>
            </fieldset>
            <Field label="Награда (текст для игроков)" value={reward} onChange={(e) => setReward(e.target.value)} />
            {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
        </Modal>
    )
}
