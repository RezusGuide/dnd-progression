import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

export default function Announcements() {
    const { hasSection } = useAuth()
    const { t } = useLang()
    const canEdit = hasSection('*')

    const [posts, setPosts] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ title: '', body: '' })

    useEffect(() => {
        api.get('/api/announcements').then((res) => setPosts(res.data)).catch(() => setPosts([]))
    }, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        const res = await api.post('/api/announcements', form)
        setPosts([res.data, ...posts])
        setForm({ title: '', body: '' })
        setShowForm(false)
    }

    const handleDelete = async (id) => {
        await api.delete(`/api/announcements/${id}`)
        setPosts(posts.filter((p) => p.id !== id))
    }

    return (
        <div className="parchment-page">
            <div className="tome-header">
                <h1 className="tome-title">{t('announcementsTitle')}</h1>
                {canEdit && (
                    <button className="tome-btn-ghost" onClick={() => setShowForm((v) => !v)}>
                        {t('announcementsPost')}
                    </button>
                )}
            </div>
            <p className="tome-subtitle" style={{ marginBottom: '1.5rem' }}>{t('announcementsSubtitle')}</p>

            {showForm && (
                <form onSubmit={handleCreate} className="tome-form codex-form">
                    <div className="tome-field">
                        <label>{t('announcementsFormTitle')}</label>
                        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </div>
                    <div className="tome-field">
                        <label>{t('announcementsFormBody')}</label>
                        <textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
                    </div>
                    <div className="tome-btn-row">
                        <button type="submit" className="tome-btn">{t('save')}</button>
                    </div>
                </form>
            )}

            {posts.length === 0 && !showForm && <p className="tome-empty">{t('announcementsEmpty')}</p>}

            <div className="herald-feed">
                {posts.map((post) => (
                    <article key={post.id} className="herald-entry">
                        {canEdit && (
                            <button className="tome-btn-danger herald-delete" onClick={() => handleDelete(post.id)}>✕</button>
                        )}
                        <div className="herald-entry-top">
                            <h3 className="character-name">{post.title}</h3>
                            <span className="meta-tag">{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="character-backstory">{post.body}</p>
                        {post.authorName && <span className="tome-username">— {post.authorName}</span>}
                    </article>
                ))}
            </div>
        </div>
    )
}
