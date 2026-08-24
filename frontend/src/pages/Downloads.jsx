import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

const KIND_ICON = { DRIVE: '💾', FILE: '📦', LINK: '🔗' }

export default function Downloads() {
    const { user, hasSection } = useAuth()
    const { t } = useLang()
    const canEdit = hasSection('*')

    const [links, setLinks] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ label: '', description: '', url: '', kind: 'LINK', section: '' })

    useEffect(() => {
        const endpoint = user ? '/api/downloads' : '/api/downloads/public'
        api.get(endpoint).then((res) => setLinks(res.data)).catch(() => setLinks([]))
    }, [user])

    const handleCreate = async (e) => {
        e.preventDefault()
        const res = await api.post('/api/downloads', { ...form, section: form.section || null })
        setLinks([...links, res.data])
        setForm({ label: '', description: '', url: '', kind: 'LINK', section: '' })
        setShowForm(false)
    }

    const handleDelete = async (id) => {
        await api.delete(`/api/downloads/${id}`)
        setLinks(links.filter((l) => l.id !== id))
    }

    return (
        <div className="parchment-page">
            <div className="tome-header">
                <h1 className="tome-title">{t('downloadsTitle')}</h1>
                {canEdit && (
                    <button className="tome-btn-ghost" onClick={() => setShowForm((v) => !v)}>
                        {t('downloadsAdd')}
                    </button>
                )}
            </div>
            <p className="tome-subtitle" style={{ marginBottom: '1.5rem' }}>{t('downloadsSubtitle')}</p>

            {showForm && (
                <form onSubmit={handleCreate} className="tome-form codex-form">
                    <div className="tome-row">
                        <div className="tome-field">
                            <label>{t('downloadsLabel')}</label>
                            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
                        </div>
                        <div className="tome-field">
                            <label>{t('downloadsKind')}</label>
                            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                                <option value="LINK">Link</option>
                                <option value="DRIVE">Google Drive</option>
                                <option value="FILE">File</option>
                            </select>
                        </div>
                    </div>
                    <div className="tome-field">
                        <label>{t('downloadsUrl')}</label>
                        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
                    </div>
                    <div className="tome-field">
                        <label>{t('downloadsSection')}</label>
                        <input
                            placeholder="dnd, minecraft..."
                            value={form.section}
                            onChange={(e) => setForm({ ...form, section: e.target.value })}
                        />
                    </div>
                    <div className="tome-btn-row">
                        <button type="submit" className="tome-btn">{t('save')}</button>
                    </div>
                </form>
            )}

            {links.length === 0 && !showForm && <p className="tome-empty">{t('downloadsEmpty')}</p>}

            <div className="vault-list">
                {links.map((l) => (
                    <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="vault-entry">
                        <span className="vault-icon">{KIND_ICON[l.kind] || '🔗'}</span>
                        <span className="vault-entry-body">
                            <span className="character-name">{l.label}</span>
                            {l.description && <span className="tome-subtitle" style={{ margin: 0 }}>{l.description}</span>}
                        </span>
                        {l.section && <span className="meta-tag level-tag">{l.section}</span>}
                        {canEdit && (
                            <button
                                className="tome-btn-danger"
                                onClick={(e) => { e.preventDefault(); handleDelete(l.id) }}
                            >✕</button>
                        )}
                    </a>
                ))}
            </div>
        </div>
    )
}
