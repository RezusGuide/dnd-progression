import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

const GROUPS = [
    { type: 'SOCIAL', labelKey: 'mediaGroupSocial' },
    { type: 'BOOSTY', labelKey: 'mediaGroupBoosty' },
    { type: 'PARTNER', labelKey: 'mediaGroupPartner' },
]

export default function Media() {
    const { hasSection } = useAuth()
    const { t } = useLang()
    const canEdit = hasSection('*')

    const [profile, setProfile] = useState(null)
    const [links, setLinks] = useState([])
    const [editingDesc, setEditingDesc] = useState(false)
    const [descDraft, setDescDraft] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ type: 'SOCIAL', label: '', url: '', description: '' })

    useEffect(() => {
        api.get('/api/media/profile').then((res) => setProfile(res.data)).catch(() => {})
        api.get('/api/media/links').then((res) => setLinks(res.data)).catch(() => setLinks([]))
    }, [])

    const startEditDesc = () => {
        setDescDraft(profile?.description || '')
        setEditingDesc(true)
    }

    const saveDesc = async (e) => {
        e.preventDefault()
        const res = await api.put('/api/media/profile', { description: descDraft })
        setProfile(res.data)
        setEditingDesc(false)
    }

    const handleCreateLink = async (e) => {
        e.preventDefault()
        const res = await api.post('/api/media/links', form)
        setLinks([...links, res.data])
        setForm({ type: 'SOCIAL', label: '', url: '', description: '' })
        setShowForm(false)
    }

    const handleDeleteLink = async (id) => {
        await api.delete(`/api/media/links/${id}`)
        setLinks(links.filter((l) => l.id !== id))
    }

    return (
        <div className="hub-page">
            <div className="hub-hero">
                <p className="hub-kicker">{t('mediaKicker')}</p>
                <h1 className="hub-name">{t('mediaTitle')}</h1>
            </div>

            <div className="hub-section">
                <p className="hub-section-label">{t('mediaAbout')}</p>
                {profile && !editingDesc && (
                    <div className="hub-card">
                        <p className="hub-text">{profile.description}</p>
                    </div>
                )}
                {canEdit && !editingDesc && (
                    <button className="hub-btn-ghost" style={{ marginTop: '0.9rem' }} onClick={startEditDesc}>
                        {t('mediaEditDesc')}
                    </button>
                )}
                {editingDesc && (
                    <form onSubmit={saveDesc} className="hub-card">
                        <textarea className="hub-textarea" rows={4} value={descDraft} onChange={(e) => setDescDraft(e.target.value)} style={{ marginBottom: '0.9rem' }} />
                        <div>
                            <button type="submit" className="hub-btn">{t('mediaSaveDesc')}</button>{' '}
                            <button type="button" className="hub-btn-ghost" onClick={() => setEditingDesc(false)}>✕</button>
                        </div>
                    </form>
                )}
            </div>

            <hr className="hub-divider" />

            <div className="hub-section">
                {canEdit && (
                    <div style={{ marginBottom: '1rem' }}>
                        <button className="hub-btn-ghost" onClick={() => setShowForm((v) => !v)}>{t('mediaAddLink')}</button>
                    </div>
                )}

                {showForm && (
                    <form onSubmit={handleCreateLink} className="hub-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="hub-form-row">
                            <div className="hub-form-field">
                                <label className="hub-label">{t('mediaLinkType')}</label>
                                <select className="hub-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                    {GROUPS.map((g) => <option key={g.type} value={g.type}>{t(g.labelKey)}</option>)}
                                </select>
                            </div>
                            <div className="hub-form-field">
                                <label className="hub-label">{t('mediaLinkLabel')}</label>
                                <input className="hub-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
                            </div>
                        </div>
                        <div className="hub-form-field" style={{ marginBottom: '0.9rem' }}>
                            <label className="hub-label">{t('mediaLinkUrl')}</label>
                            <input className="hub-input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
                        </div>
                        <div className="hub-form-field" style={{ marginBottom: '0.9rem' }}>
                            <label className="hub-label">{t('mediaLinkDesc')}</label>
                            <input className="hub-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <button type="submit" className="hub-btn">{t('save')}</button>
                    </form>
                )}

                {GROUPS.map((group) => {
                    const groupLinks = links.filter((l) => l.type === group.type)
                    return (
                        <div key={group.type} style={{ marginBottom: '1.75rem' }}>
                            <p className="hub-section-label">{t(group.labelKey)}</p>
                            {groupLinks.length === 0 && <p className="hub-empty">{t('mediaEmpty')}</p>}
                            {groupLinks.length > 0 && (
                                <div className="hub-card">
                                    {groupLinks.map((l) => (
                                        <div key={l.id} className="hub-link-row">
                                            <div>
                                                <div className="hub-link-label">{l.label}</div>
                                                {l.description && <div className="hub-link-desc">{l.description}</div>}
                                            </div>
                                            <div className="hub-link-row-actions">
                                                <a href={l.url} target="_blank" rel="noreferrer" className="hub-link-url">{l.url}</a>
                                                {canEdit && (
                                                    <button className="hub-btn-danger" onClick={() => handleDeleteLink(l.id)}>✕</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
