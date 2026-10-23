import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import { Button, EmptyState, Field, Modal } from '../../components/ui'
import Markdown from '../../components/world/Markdown'
import Redacted from '../../components/world/Redacted'
import { CATEGORIES, CATEGORY_LABEL, STATUS_LABEL, matches } from '../../lib/world'
import { formatDateTime } from '../../constants/dnd-ru'
import '../../styles/world.css'

// Пульт ГМ → «Архив»: every article with its status, the editor with a
// preview of what players see, quick status buttons. Everything here lives
// in the database; nothing goes into the public repository.

const emptyArticle = () => ({ id: null, slug: '', category: 'OTHER', title: '', teaser: '', body: '', status: 'HIDDEN', gmNotes: '' })
const QUICK = [['OPEN', 'Открыть игрокам'], ['REDACTED', 'Засекретить'], ['HIDDEN', 'Скрыть']]

export default function AdminWorld() {
    const [articles, setArticles] = useState(null)
    const [status, setStatus] = useState('')
    const [category, setCategory] = useState('')
    const [query, setQuery] = useState('')
    const [editing, setEditing] = useState(null)
    const [error, setError] = useState('')

    const refresh = useCallback(() => {
        api.get('/api/admin/world').then((res) => setArticles(res.data)).catch(() => setArticles([]))
    }, [])
    useEffect(() => { refresh() }, [refresh])

    const quick = async (a, next) => {
        setError('')
        try {
            await api.put(`/api/admin/world/${a.id}/status`, { status: next })
            refresh()
        } catch (err) {
            setError(err.response?.data?.message || 'Не подшилось. Повторите.')
        }
    }

    const shown = (articles || []).filter((a) => (!status || a.status === status) && (!category || a.category === category) && matches(a, query))
    return (
        <section id="world" className="sheet-section admin-section">
            <div className="admin-section-head">
                <h2 className="sheet-section-title">Архив</h2>
                <Button onClick={() => setEditing(emptyArticle())}>+ Новая статья</Button>
            </div>
            <p className="calendar-help">Статьи живут только в базе, в репозиторий не попадают. Скрытые игрок не видит вовсе, у засекреченных видит заголовок и тизер.</p>
            <div className="admin-filters">
                <select className="sheet-input" aria-label="Статус" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Все статусы</option>
                    {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <select className="sheet-input" aria-label="Категория" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Все категории</option>
                    {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <input type="search" className="sheet-input" aria-label="Поиск" placeholder="Поиск" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
            {articles && shown.length === 0 && <EmptyState>Статей нет.</EmptyState>}
            {shown.length > 0 && (
                <div className="chest-table-wrap">
                    <table className="chest-table world-admin-table">
                        <thead>
                            <tr><th scope="col">Статья</th><th scope="col">Категория</th><th scope="col">Статус</th><th scope="col">Обновлено</th><th scope="col"><span className="visually-hidden">Действия</span></th></tr>
                        </thead>
                        <tbody>
                            {shown.map((a) => (
                                <tr key={a.id}>
                                    <th scope="row">{a.title}<span className="world-slug">{a.slug}</span></th>
                                    <td>{CATEGORY_LABEL[a.category]}</td>
                                    <td><span className={`world-status is-${a.status.toLowerCase()}`}>{STATUS_LABEL[a.status]}</span></td>
                                    <td className="chest-origin">{formatDateTime(a.updatedAt)}</td>
                                    <td className="chest-actions">
                                        <Button variant="secondary" onClick={() => setEditing({ ...emptyArticle(), ...a, teaser: a.teaser || '', body: a.body || '', gmNotes: a.gmNotes || '' })}>Править</Button>
                                        {QUICK.filter(([s]) => s !== a.status).map(([s, label]) => (
                                            <Button key={s} variant="ghost" onClick={() => quick(a, s)}>{label}</Button>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {editing && <Editor key={editing.id ?? 'new'} initial={editing} articles={articles || []} onClose={() => setEditing(null)}
                onSaved={() => { setEditing(null); refresh() }} />}
        </section>
    )
}

function Editor({ initial, articles, onClose, onSaved }) {
    const [form, setForm] = useState(initial)
    const [error, setError] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const set = (patch) => setForm((f) => ({ ...f, ...patch }))

    // Links in the preview resolve the way they will for players.
    const visible = articles.filter((a) => a.status !== 'HIDDEN' && a.id !== form.id)
    if (form.status !== 'HIDDEN' && form.slug) visible.push({ slug: form.slug, title: form.title })
    const known = new Set(visible.map((a) => a.slug))
    const titles = Object.fromEntries(visible.map((a) => [a.slug, a.title]))

    const save = async () => {
        setError('')
        const body = { slug: form.slug, category: form.category, title: form.title, teaser: form.teaser, body: form.body, status: form.status, gmNotes: form.gmNotes }
        try {
            if (form.id) await api.put(`/api/admin/world/${form.id}`, body)
            else await api.post('/api/admin/world', body)
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || 'Не подшилось. Повторите.')
        }
    }
    const remove = async () => {
        try {
            await api.delete(`/api/admin/world/${form.id}`)
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || 'Не удалилось. Повторите.')
            setConfirmDelete(false)
        }
    }

    return (
        <div className="world-editor">
            <form className="tome-form codex-form world-editor-form" onSubmit={(e) => { e.preventDefault(); save() }}>
                <h3 className="tome-field-label">{form.id ? 'Статья архива' : 'Новая статья'}</h3>
                <Field label="Заголовок" value={form.title} onChange={(e) => set({ title: e.target.value })} />
                <Field label="Адрес" value={form.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })}
                    hint="Латиница, цифры и дефисы: demon-continent. Ссылка из другой статьи: [[адрес|текст]]." />
                <div className="calendar-fields">
                    <Field label="Категория" as="select" value={form.category} onChange={(e) => set({ category: e.target.value })}>
                        {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </Field>
                    <Field label="Статус" as="select" value={form.status} onChange={(e) => set({ status: e.target.value })}>
                        {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </Field>
                </div>
                <Field label="Тизер" value={form.teaser} onChange={(e) => set({ teaser: e.target.value })} hint="Одна строка. Видна и у засекреченной статьи." />
                <Field label="Текст (Markdown)" as="textarea" rows={12} value={form.body} onChange={(e) => set({ body: e.target.value })}
                    hint="Таблицы, списки, **жирный**. HTML не работает." />
                <Field label="Заметки ГМ" as="textarea" rows={3} value={form.gmNotes} onChange={(e) => set({ gmNotes: e.target.value })}
                    hint="Видите только вы. Игрокам не уходят ни в каком виде." />
                {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                <div className="tome-btn-row">
                    <Button type="submit" disabled={!form.title.trim() || !form.slug.trim()}>Подшить</Button>
                    <Button variant="ghost" onClick={onClose}>Отмена</Button>
                    {form.id && <Button variant="danger" onClick={() => setConfirmDelete(true)}>Удалить</Button>}
                </div>
            </form>
            <aside className="world-preview" aria-label="Как увидит игрок">
                <p className="sheet-label">Как увидит игрок</p>
                {form.status === 'HIDDEN' ? (
                    <p className="research-note">Скрытую статью игрок не видит: ни в списке, ни по ссылке. Ссылки на неё выглядят как «нет в архиве».</p>
                ) : (
                    <div className="world-article ui-dossier">
                        <h4 className="world-preview-title">{form.title || 'Без заголовка'}</h4>
                        {form.teaser && <p className="world-teaser">{form.teaser}</p>}
                        {form.status === 'REDACTED' ? (
                            <>
                                <Redacted lines={4} />
                                <p className="world-card-caption">Документ откроется по ходу дела.</p>
                            </>
                        ) : (
                            <Markdown body={form.body} known={known} titles={titles} />
                        )}
                    </div>
                )}
            </aside>
            {confirmDelete && (
                <Modal title="Удалить статью" onClose={() => setConfirmDelete(false)}
                    actions={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Отмена</Button><Button variant="danger" onClick={remove}>Удалить</Button></>}>
                    <p>Удалить «{form.title}»? Ссылки на неё станут «нет в архиве». Вернуть нельзя.</p>
                </Modal>
            )}
        </div>
    )
}
