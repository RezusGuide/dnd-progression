import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'
import '../styles/media.css'

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
        <div className="bw-page">
            <div className="bw-wrap">
                <p className="bw-kicker">{t('mediaKicker')}</p>
                <h1 className="bw-title">{t('mediaTitle')}</h1>

                <p className="bw-group-label" style={{ marginTop: 0 }}>{t('mediaAbout')}</p>
                {profile && !editingDesc && <p className="bw-desc">{profile.description}</p>}
                {canEdit && !editingDesc && (
                    <button className="bw-btn-ghost" style={{ marginTop: '0.75rem' }} onClick={startEditDesc}>
                        {t('mediaEditDesc')}
                    </button>
                )}
                {editingDesc && (
                    <form onSubmit={saveDesc} className="bw-form">
                        <textarea className="bw-textarea" rows={4} value={descDraft} onChange={(e) => setDescDraft(e.target.value)} />
                        <div>
                            <button type="submit" className="bw-btn">{t('mediaSaveDesc')}</button>{' '}
                            <button type="button" className="bw-btn-ghost" onClick={() => setEditingDesc(false)}>✕</button>
                        </div>
                    </form>
                )}

                <hr className="bw-divider" />

                {canEdit && (
                    <div style={{ marginBottom: '1rem' }}>
                        <button className="bw-btn-ghost" onClick={() => setShowForm((v) => !v)}>{t('mediaAddLink')}</button>
                    </div>
                )}

                {showForm && (
                    <form onSubmit={handleCreateLink} className="bw-form">
                        <div className="bw-row">
                            <div>
                                <label className="bw-label">{t('mediaLinkType')}</label>
                                <select className="bw-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                    {GROUPS.map((g) => <option key={g.type} value={g.type}>{t(g.labelKey)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="bw-label">{t('mediaLinkLabel')}</label>
                                <input className="bw-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
                            </div>
                        </div>
                        <div>
                            <label className="bw-label">{t('mediaLinkUrl')}</label>
                            <input className="bw-input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
                        </div>
                        <div>
                            <label className="bw-label">{t('mediaLinkDesc')}</label>
                            <input className="bw-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <button type="submit" className="bw-btn">{t('save')}</button>
                    </form>
                )}

                {GROUPS.map((group) => {
                    const groupLinks = links.filter((l) => l.type === group.type)
                    return (
                        <div key={group.type}>
                            <p className="bw-group-label">{t(group.labelKey)}</p>
                            {groupLinks.length === 0 && <p className="bw-empty">{t('mediaEmpty')}</p>}
                            {groupLinks.map((l) => (
                                <div key={l.id} className="bw-link-row">
                                    <div>
                                        <div className="bw-link-label">{l.label}</div>
                                        {l.description && <div className="bw-link-desc">{l.description}</div>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <a href={l.url} target="_blank" rel="noreferrer" className="bw-link-url">{l.url}</a>
                                        {canEdit && (
                                            <button className="bw-btn-danger" onClick={() => handleDeleteLink(l.id)}>✕</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
