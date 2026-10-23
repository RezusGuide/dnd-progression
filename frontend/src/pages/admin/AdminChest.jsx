import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/axios'
import { Button, EmptyState, Field, Modal } from '../../components/ui'
import AspectIcon from '../../components/aspects/AspectIcon'
import ChestContentsList, { RarityTag } from '../../components/chest/ChestContentsList'
import { COINS, PENALTIES, RARITIES, RARITY_LABEL, isEmptyContents } from '../../lib/chest'
import { useMagicData } from '../../lib/magic'
import { formatDateTime } from '../../constants/dnd-ru'
import '../../styles/chest.css'

// Пульт ГМ → «Сундучок»: build a reward (with a preview of what the player
// sees), the list of sent parcels, and the item library. The riddle answer
// goes to the server once and is never shown again.

const emptyItem = () => ({ name: '', rarity: 'COMMON', description: '', quantity: 1, disassembleInto: {} })
const emptyForm = (trophy, recipients = []) => ({
    mode: 'characters', characterIds: trophy ? trophy.participants.map((p) => p.characterId) : recipients, campaignId: '',
    title: trophy ? `Трофей из Дела ${trophy.caseNo}` : '', gmNote: '',
    aspects: {}, coins: {}, items: [],
    riddleQuestion: '', riddleAnswer: '', penalty: 'NONE',
})

export default function AdminChest() {
    // /gm/chest?to=1,2: «Отправить посылку» from «Сотрудники».
    const [params] = useSearchParams()
    const recipients = (params.get('to') || '').split(',').map(Number).filter((n) => n > 0)
    const [characters, setCharacters] = useState([])
    const [campaigns, setCampaigns] = useState([])
    const [templates, setTemplates] = useState([])
    const [sent, setSent] = useState(null)

    const refresh = useCallback(() => {
        api.get('/api/admin/chest').then((res) => setSent(res.data)).catch(() => setSent([]))
        api.get('/api/admin/item-templates').then((res) => setTemplates(res.data)).catch(() => setTemplates([]))
    }, [])
    useEffect(() => {
        api.get('/api/characters').then((res) => setCharacters(res.data)).catch(() => {})
        api.get('/api/campaigns').then((res) => setCampaigns(Array.isArray(res.data) ? res.data : [])).catch(() => {})
        refresh()
    }, [refresh])

    return (
        <section id="chest" className="sheet-section admin-section">
            <h2 className="sheet-section-title" style={{ marginBottom: '0.75rem' }}>Сундучок</h2>
            <RewardForm key={recipients.join(',')} characters={characters} campaigns={campaigns} templates={templates} onSent={refresh} initialRecipients={recipients} />
            <SentList sent={sent} characters={characters} onChanged={refresh} />
            <Library templates={templates} onChanged={refresh} />
        </section>
    )
}

// trophy: { dreamId, caseNo, participants: [{ characterId, characterName }] }
// turns the form into «Выдать трофей»: recipients are the dream's
// participants and items get «Разбирается на».
export function RewardForm({ characters, campaigns, templates, onSent, trophy, initialRecipients }) {
    const [magic] = useMagicData()
    const [form, setForm] = useState(() => emptyForm(trophy, initialRecipients))
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const set = (patch) => setForm((f) => ({ ...f, ...patch }))

    const contents = {
        aspects: Object.fromEntries(Object.entries(form.aspects).filter(([, n]) => Number(n) > 0).map(([k, n]) => [k, Number(n)])),
        coins: Object.fromEntries(Object.entries(form.coins).filter(([, n]) => Number(n) > 0).map(([k, n]) => [k, Number(n)])),
        items: form.items.filter((i) => i.name.trim()).map((i) => ({
            ...i, name: i.name.trim(), quantity: Number(i.quantity) || 1,
            disassembleInto: Object.fromEntries(Object.entries(i.disassembleInto || {}).filter(([, n]) => Number(n) > 0).map(([k, n]) => [k, Number(n)])),
        })),
    }
    const recipients = form.mode === 'campaign' ? (form.campaignId ? 1 : 0) : form.characterIds.length
    const ready = form.title.trim() && !isEmptyContents(contents) && recipients > 0
        && (!form.riddleQuestion.trim() || form.riddleAnswer.trim())

    const toggleCharacter = (id) => set({
        characterIds: form.characterIds.includes(id) ? form.characterIds.filter((x) => x !== id) : [...form.characterIds, id],
    })
    const setItem = (i, patch) => set({ items: form.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })
    const addTemplate = (id) => {
        const t = templates.find((x) => String(x.id) === id)
        if (t) set({ items: [...form.items, { name: t.name, rarity: t.rarity, description: t.description || '', quantity: 1, disassembleInto: {} }] })
    }

    const submit = async (e) => {
        e.preventDefault()
        setBusy(true)
        setError('')
        setNotice('')
        try {
            const res = await api.post(trophy ? `/api/admin/dreams/${trophy.dreamId}/trophy` : '/api/admin/chest', {
                characterIds: form.mode === 'characters' ? form.characterIds : [],
                campaignId: form.mode === 'campaign' ? Number(form.campaignId) : null,
                title: form.title, gmNote: form.gmNote, contents,
                riddleQuestion: form.riddleQuestion, riddleAnswer: form.riddleAnswer,
                penalty: form.riddleQuestion.trim() ? form.penalty : 'NONE',
            })
            setNotice(trophy ? `Трофей отправлен: ${res.data.length}. Сундучок принял.` : `Посылки отправлены: ${res.data.length}. Сундучок принял.`)
            setForm(emptyForm(trophy))
            onSent()
        } catch (err) {
            setError(err.response?.data?.message || 'Посылка не ушла. Повторите.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="chest-gm-layout">
            <form className="tome-form codex-form chest-gm-form" onSubmit={submit}>
                {!trophy && <h3 className="tome-field-label">Новая посылка</h3>}

                <fieldset className="chest-fieldset">
                    <legend className="sheet-label">Получатели</legend>
                    {trophy ? (
                        <div className="chest-recipients">
                            {trophy.participants.length === 0 && <p className="research-note">В деле никого нет.</p>}
                            {trophy.participants.map((p) => (
                                <label key={p.characterId} className="wiz-skill">
                                    <input type="checkbox" checked={form.characterIds.includes(p.characterId)} onChange={() => toggleCharacter(p.characterId)} />
                                    <span>{p.characterName}</span>
                                </label>
                            ))}
                        </div>
                    ) : (<>
                    <div className="chest-mode">
                        <label className="wiz-skill"><input type="radio" name="chest-mode" checked={form.mode === 'characters'} onChange={() => set({ mode: 'characters' })} /> <span>Персонажи</span></label>
                        <label className="wiz-skill"><input type="radio" name="chest-mode" checked={form.mode === 'campaign'} onChange={() => set({ mode: 'campaign' })} /> <span>Кампания (всем одобренным)</span></label>
                    </div>
                    {form.mode === 'characters' ? (
                        <div className="chest-recipients">
                            {characters.map((c) => (
                                <label key={c.id} className="wiz-skill">
                                    <input type="checkbox" checked={form.characterIds.includes(c.id)} onChange={() => toggleCharacter(c.id)} />
                                    <span>{c.name}</span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <select className="sheet-input" aria-label="Кампания" value={form.campaignId} onChange={(e) => set({ campaignId: e.target.value })}>
                            <option value="">— Выбрать кампанию —</option>
                            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                    </>)}
                </fieldset>

                <Field label="Название" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Латунный ключ" />
                <Field label="Записка ГМ (игрок увидит при открытии)" as="textarea" rows={2} value={form.gmNote} onChange={(e) => set({ gmNote: e.target.value })} />

                <fieldset className="chest-fieldset">
                    <legend className="sheet-label">Аспекты</legend>
                    <div className="chest-aspect-grid">
                        {magic?.aspects.map((a) => (
                            <label key={a.key} className="chest-aspect-cell" title={a.hint}>
                                <AspectIcon aspect={a} size={26} />
                                <span>{a.nameRu}</span>
                                <input type="number" min="0" max="99" className="sheet-input sheet-input-num" aria-label={`${a.nameRu}, сколько`}
                                    value={form.aspects[a.key] || ''} onChange={(e) => set({ aspects: { ...form.aspects, [a.key]: e.target.value } })} />
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset className="chest-fieldset">
                    <legend className="sheet-label">Монеты</legend>
                    <div className="chest-coins">
                        {COINS.map(([k, label]) => (
                            <label key={k} className="chest-coin-cell">
                                <span>{label}</span>
                                <input type="number" min="0" className="sheet-input sheet-input-num" value={form.coins[k] || ''}
                                    onChange={(e) => set({ coins: { ...form.coins, [k]: e.target.value } })} />
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset className="chest-fieldset">
                    <legend className="sheet-label">Предметы</legend>
                    {form.items.map((item, i) => (
                        <div key={i} className="chest-item-row">
                            <input className="sheet-input" aria-label="Название предмета" placeholder="Название" value={item.name} onChange={(e) => setItem(i, { name: e.target.value })} />
                            <select className="sheet-input" aria-label="Редкость" value={item.rarity} onChange={(e) => setItem(i, { rarity: e.target.value })}>
                                {RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
                            </select>
                            <input type="number" min="1" className="sheet-input sheet-input-num" aria-label="Количество" value={item.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                            <Button variant="ghost" onClick={() => set({ items: form.items.filter((_, j) => j !== i) })}>Убрать</Button>
                            <textarea className="sheet-input sheet-textarea chest-item-desc" rows={2} aria-label="Описание предмета" placeholder="Описание"
                                value={item.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                            {trophy && magic && (
                                <AspectPicker label="Разбирается на" aspects={magic.aspects} value={item.disassembleInto || {}}
                                    onChange={(v) => setItem(i, { disassembleInto: v })} />
                            )}
                        </div>
                    ))}
                    <div className="chest-item-add">
                        <select className="sheet-input" aria-label="Из библиотеки" value="" onChange={(e) => addTemplate(e.target.value)}>
                            <option value="">+ Из библиотеки…</option>
                            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({RARITY_LABEL[t.rarity]})</option>)}
                        </select>
                        <Button variant="secondary" onClick={() => set({ items: [...form.items, emptyItem()] })}>+ Вручную</Button>
                    </div>
                </fieldset>

                <fieldset className="chest-fieldset">
                    <legend className="sheet-label">Загадка (необязательно)</legend>
                    <Field label="Вопрос" value={form.riddleQuestion} onChange={(e) => set({ riddleQuestion: e.target.value })} />
                    <Field label="Ответ (регистр, пробелы по краям и ё не важны)" value={form.riddleAnswer} autoComplete="off"
                        onChange={(e) => set({ riddleAnswer: e.target.value })}
                        hint="После отправки ответ хранится только в виде отпечатка. Посмотреть его снова нельзя." />
                    <Field label="Если ответ неверный" as="select" value={form.penalty} onChange={(e) => set({ penalty: e.target.value })}>
                        {Object.entries(PENALTIES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </Field>
                </fieldset>

                {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                {notice && <p className="tome-notice" role="status">{notice}</p>}
                <div className="tome-btn-row">
                    <Button type="submit" disabled={!ready || busy}>{trophy ? 'Выдать трофей' : 'Отправить в Сундучок'}</Button>
                </div>
            </form>

            <aside className="chest-preview" aria-label="Так увидит игрок">
                <p className="sheet-label">Так увидит игрок</p>
                <div className="chest-parcel">
                    <span className="chest-seal" aria-hidden="true">С</span>
                    <div className="chest-parcel-body">
                        <p className="chest-parcel-kicker">Вам посылка от конторы</p>
                        <p className="chest-parcel-title">{form.title || 'Без названия'}</p>
                        <p className="chest-parcel-meta">{form.riddleQuestion.trim() && <span className="chest-riddle-mark">С загадкой</span>}</p>
                    </div>
                </div>
                {form.riddleQuestion.trim() && (
                    <div className="chest-preview-block">
                        <p className="chest-riddle-kicker">Сундучок спрашивает:</p>
                        <p className="chest-riddle-question">{form.riddleQuestion}</p>
                    </div>
                )}
                <div className="chest-preview-block">
                    <p className="chest-received-kicker">Сундучок открыт. Опись приложена.</p>
                    {isEmptyContents(contents) ? <p className="research-note">Посылка пока пуста.</p> : <ChestContentsList contents={contents} />}
                    {form.gmNote.trim() && <p className="chest-gm-note">Записка ГМ: {form.gmNote}</p>}
                </div>
            </aside>
        </div>
    )
}

// «Разбирается на»: aspects and amounts. The player learns them only by
// breaking the item.
function AspectPicker({ label, aspects, value, onChange }) {
    const [key, setKey] = useState('')
    const chosen = Object.entries(value).filter(([, n]) => Number(n) > 0)
    const byKey = Object.fromEntries(aspects.map((a) => [a.key, a]))
    return (
        <div className="chest-disassemble">
            <span className="sheet-label">{label}</span>
            {chosen.length === 0 && <span className="research-note">ничего (кнопки «Разобрать» не будет)</span>}
            {chosen.map(([k, n]) => (
                <span key={k} className="chest-disassemble-chip">
                    <AspectIcon aspect={byKey[k]} size={20} /> {byKey[k]?.nameRu || k}
                    <input type="number" min="1" max="99" className="sheet-input sheet-input-num" aria-label={`${byKey[k]?.nameRu || k}, сколько`}
                        value={n} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
                    <button type="button" className="chest-chip-x" aria-label={`Убрать ${byKey[k]?.nameRu || k}`}
                        onClick={() => onChange(Object.fromEntries(chosen.filter(([x]) => x !== k)))}>✕</button>
                </span>
            ))}
            <select className="sheet-input" aria-label="Добавить аспект" value={key}
                onChange={(e) => { if (e.target.value) onChange({ ...value, [e.target.value]: value[e.target.value] || 1 }); setKey('') }}>
                <option value="">+ Аспект…</option>
                {aspects.filter((a) => !(Number(value[a.key]) > 0)).map((a) => <option key={a.key} value={a.key}>{a.nameRu}</option>)}
            </select>
        </div>
    )
}

function SentList({ sent, characters, onChanged }) {
    const [status, setStatus] = useState('')
    const [openId, setOpenId] = useState(null) // reward whose wrong answers are shown
    const [who, setWho] = useState('')
    const [error, setError] = useState('')
    if (!sent) return null
    const shown = sent.filter((r) => (!status || r.status === status) && (!who || String(r.characterId) === who))
    const remove = async (id) => {
        setError('')
        try {
            await api.delete(`/api/admin/chest/${id}`)
            onChanged()
        } catch (err) {
            setError(err.response?.data?.message || 'Не удалилось. Повторите.')
        }
    }
    return (
        <div className="chest-gm-block">
            <h3 className="reception-section-title">Отправленные</h3>
            <div className="chest-filters">
                <select className="sheet-input" aria-label="Статус" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Все</option>
                    <option value="SEALED">Запечатаны</option>
                    <option value="OPENED">Открыты</option>
                </select>
                <select className="sheet-input" aria-label="Получатель" value={who} onChange={(e) => setWho(e.target.value)}>
                    <option value="">Все получатели</option>
                    {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
            {shown.length === 0 ? <EmptyState>Посылок нет.</EmptyState> : (
                <div className="chest-table-wrap">
                    <table className="chest-table">
                        <thead>
                            <tr><th scope="col">Посылка</th><th scope="col">Получатель</th><th scope="col">Статус</th><th scope="col">Загадка</th><th scope="col">Неверных</th><th scope="col">Дата</th><th scope="col"><span className="visually-hidden">Действия</span></th></tr>
                        </thead>
                        {shown.map((r) => (
                            <tbody key={r.id}>
                                <tr>
                                    <th scope="row">{r.title}</th>
                                    <td>{r.characterName}</td>
                                    <td><span className={`chest-status chest-status-${r.status.toLowerCase()}`}>{r.status === 'SEALED' ? 'Запечатана' : 'Открыта'}</span></td>
                                    <td>{r.hasRiddle ? PENALTIES[r.penalty] : '—'}</td>
                                    <td className="chest-num">
                                        {r.wrongAnswers?.length > 0 ? (
                                            <button type="button" className="chest-item-name" aria-expanded={openId === r.id}
                                                onClick={() => setOpenId(openId === r.id ? null : r.id)}>{r.wrongAttempts}</button>
                                        ) : r.wrongAttempts}
                                    </td>
                                    <td className="chest-origin">{formatDateTime(r.openedAt || r.createdAt)}</td>
                                    <td className="chest-actions">{r.status === 'SEALED' && <Button variant="ghost" onClick={() => remove(r.id)}>Отозвать</Button>}</td>
                                </tr>
                                {openId === r.id && (
                                    <tr className="chest-item-details">
                                        <td colSpan={7}>
                                            <p className="sheet-label">Неверные ответы (последние {r.wrongAnswers.length}, видны только вам)</p>
                                            <ul className="chest-wrong-list">
                                                {r.wrongAnswers.map((w, i) => (
                                                    <li key={i}><span className="chest-origin">{formatDateTime(w.at)}</span> «{w.answer}»</li>
                                                ))}
                                            </ul>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        ))}
                    </table>
                </div>
            )}
        </div>
    )
}

function Library({ templates, onChanged }) {
    const [editing, setEditing] = useState(null) // template or a new one
    const [error, setError] = useState('')
    const save = async () => {
        setError('')
        try {
            if (editing.id) await api.put(`/api/admin/item-templates/${editing.id}`, editing)
            else await api.post('/api/admin/item-templates', editing)
            setEditing(null)
            onChanged()
        } catch (err) {
            setError(err.response?.data?.message || 'Не подшилось. Повторите.')
        }
    }
    const remove = async (id) => {
        await api.delete(`/api/admin/item-templates/${id}`).catch(() => {})
        onChanged()
    }
    return (
        <div className="chest-gm-block">
            <div className="chest-gm-head">
                <h3 className="reception-section-title">Библиотека предметов</h3>
                <Button variant="secondary" onClick={() => setEditing({ name: '', rarity: 'COMMON', description: '', tags: '' })}>+ Новый предмет</Button>
            </div>
            <p className="research-note">Только в базе, в репозиторий не попадает. Можно писать спойлеры.</p>
            {templates.length === 0 ? <EmptyState>Библиотека пуста.</EmptyState> : (
                <ul className="chest-library">
                    {templates.map((t) => (
                        <li key={t.id} className="chest-library-row">
                            <div>
                                <p className="chest-parcel-title">{t.name} <RarityTag rarity={t.rarity} /></p>
                                {t.description && <p className="chest-library-desc">{t.description}</p>}
                                {t.tags && <p className="chest-parcel-meta">{t.tags}</p>}
                            </div>
                            <span className="chest-actions">
                                <Button variant="ghost" onClick={() => setEditing(t)}>Править</Button>
                                <Button variant="ghost" onClick={() => remove(t.id)}>Удалить</Button>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {editing && (
                <Modal title={editing.id ? 'Предмет библиотеки' : 'Новый предмет'} onClose={() => setEditing(null)}
                    actions={<><Button variant="ghost" onClick={() => setEditing(null)}>Отмена</Button><Button onClick={save} disabled={!editing.name.trim()}>Сохранить</Button></>}>
                    <Field label="Название" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                    <Field label="Редкость" as="select" value={editing.rarity} onChange={(e) => setEditing({ ...editing, rarity: e.target.value })}>
                        {RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
                    </Field>
                    <Field label="Описание" as="textarea" rows={3} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                    <Field label="Метки (через запятую)" value={editing.tags || ''} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} />
                    {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                </Modal>
            )}
        </div>
    )
}
