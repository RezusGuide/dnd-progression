import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

export default function Portfolio() {
    const { hasSection } = useAuth()
    const { t, lang } = useLang()
    const canEdit = hasSection('*')

    // Matches the backend's own default AboutProfile shape (see
    // AboutController) so the page renders its real layout immediately
    // instead of going blank while the fetch is in flight - or staying
    // blank forever if the API is briefly unreachable (e.g. Railway
    // cold-starting, or the backend not running yet in local dev).
    const DEFAULT_PROFILE = {
        name: 'Your Name', tagline: 'add a one-line tagline', taglineRu: '',
        bio: 'Add a short bio here.', bioRu: '',
        education: 'Add where you studied.', educationRu: '',
        skills: [], photoUrl: null, location: null, contactEmail: null,
    }

    const [profile, setProfile] = useState(DEFAULT_PROFILE)
    const [projects, setProjects] = useState([])
    const [editing, setEditing] = useState(false)
    const [profileForm, setProfileForm] = useState(null)
    const [showProjectForm, setShowProjectForm] = useState(false)
    const [projectForm, setProjectForm] = useState({ title: '', blurb: '', url: '', tags: '' })
    const [notice, setNotice] = useState('')

    // Falls back to the English copy when a Russian translation hasn't been
    // filled in yet, so switching the site's lang toggle never blanks a
    // section out.
    const pick = (enValue, ruValue) => (lang === 'ru' && ruValue ? ruValue : enValue)

    useEffect(() => {
        api.get('/api/portfolio/profile').then((res) => setProfile(res.data)).catch(() => {})
        api.get('/api/portfolio').then((res) => setProjects(res.data)).catch(() => setProjects([]))
    }, [])

    const startEditing = () => {
        setProfileForm({
            ...profile,
            skills: (profile.skills || []).join(', '),
        })
        setEditing(true)
    }

    const handleSaveProfile = async (e) => {
        e.preventDefault()
        const payload = {
            ...profileForm,
            skills: profileForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
        }
        const res = await api.put('/api/portfolio/profile', payload)
        setProfile(res.data)
        setEditing(false)
        setNotice(t('termDone'))
        setTimeout(() => setNotice(''), 2000)
    }

    const handleCreateProject = async (e) => {
        e.preventDefault()
        const payload = {
            title: projectForm.title,
            blurb: projectForm.blurb,
            url: projectForm.url || null,
            tags: projectForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
        }
        const res = await api.post('/api/portfolio', payload)
        setProjects([...projects, res.data])
        setProjectForm({ title: '', blurb: '', url: '', tags: '' })
        setShowProjectForm(false)
    }

    const handleDeleteProject = async (id) => {
        await api.delete(`/api/portfolio/${id}`)
        setProjects(projects.filter((p) => p.id !== id))
    }

    return (
        <div className="hub-page">
            <div className="hub-hero">
                {profile.photoUrl && <img src={profile.photoUrl} alt={profile.name} className="hub-photo" />}
                <p className="hub-kicker">{t('portfolioTitle')}</p>
                <h1 className="hub-name">{profile.name}</h1>
                <p className="hub-tagline">{pick(profile.tagline, profile.taglineRu)}</p>
                {(profile.location || profile.contactEmail) && (
                    <p className="hub-meta">
                        {profile.location && <>{profile.location}</>}
                        {profile.location && profile.contactEmail && '  ·  '}
                        {profile.contactEmail && <>{profile.contactEmail}</>}
                    </p>
                )}
                {canEdit && !editing && (
                    <button className="hub-btn-ghost" style={{ marginTop: '1.1rem' }} onClick={startEditing}>
                        {t('termEdit')}
                    </button>
                )}
            </div>

            {notice && <p className="hub-notice">{notice}</p>}

            {editing && profileForm && (
                <div className="hub-section">
                    <form onSubmit={handleSaveProfile} className="hub-card">
                        <div className="hub-form-row">
                            <div className="hub-form-field">
                                <label className="hub-label">{t('termName')}</label>
                                <input className="hub-input" value={profileForm.name || ''} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                            </div>
                            <div className="hub-form-field">
                                <label className="hub-label">{t('termTagline')}</label>
                                <input className="hub-input" value={profileForm.tagline || ''} onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })} />
                            </div>
                            <div className="hub-form-field">
                                <label className="hub-label">{t('termTaglineRu')}</label>
                                <input className="hub-input" value={profileForm.taglineRu || ''} onChange={(e) => setProfileForm({ ...profileForm, taglineRu: e.target.value })} />
                            </div>
                        </div>
                        <div className="hub-form-row">
                            <div className="hub-form-field">
                                <label className="hub-label">{t('termBio')}</label>
                                <textarea className="hub-textarea" rows={4} value={profileForm.bio || ''} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
                            </div>
                            <div className="hub-form-field">
                                <label className="hub-label">{t('termBioRu')}</label>
                                <textarea className="hub-textarea" rows={4} value={profileForm.bioRu || ''} onChange={(e) => setProfileForm({ ...profileForm, bioRu: e.target.value })} />
                            </div>
                        </div>
                        <div className="hub-form-row">
                            <div className="hub-form-field">
                                <label className="hub-label">{t('termEducation')}</label>
                                <textarea className="hub-textarea" rows={3} value={profileForm.education || ''} onChange={(e) => setProfileForm({ ...profileForm, education: e.target.value })} />
                            </div>
                            <div className="hub-form-field">
                                <label className="hub-label">{t('termEducationRu')}</label>
                                <textarea className="hub-textarea" rows={3} value={profileForm.educationRu || ''} onChange={(e) => setProfileForm({ ...profileForm, educationRu: e.target.value })} />
                            </div>
                        </div>
                        <div className="hub-form-field" style={{ marginBottom: '0.9rem' }}>
                            <label className="hub-label">{t('termSkills')}</label>
                            <input className="hub-input" value={profileForm.skills || ''} onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })} />
                        </div>
                        <div className="hub-form-row">
                            <div className="hub-form-field">
                                <label className="hub-label">{t('termPhotoUrl')}</label>
                                <input className="hub-input" value={profileForm.photoUrl || ''} onChange={(e) => setProfileForm({ ...profileForm, photoUrl: e.target.value })} />
                            </div>
                            <div className="hub-form-field">
                                <label className="hub-label">{t('termLocation')}</label>
                                <input className="hub-input" value={profileForm.location || ''} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} />
                            </div>
                            <div className="hub-form-field">
                                <label className="hub-label">{t('termContactEmail')}</label>
                                <input className="hub-input" value={profileForm.contactEmail || ''} onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <button type="submit" className="hub-btn">{t('termSaveProfile')}</button>{' '}
                            <button type="button" className="hub-btn-ghost" onClick={() => setEditing(false)}>{t('termDone')}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="hub-section">
                <p className="hub-section-label">{t('termCatBio')}</p>
                <div className="hub-card">
                    <p className="hub-text">{pick(profile.bio, profile.bioRu)}</p>
                </div>
            </div>

            <div className="hub-section">
                <p className="hub-section-label">{t('termCatEdu')}</p>
                <div className="hub-card">
                    <p className="hub-text">{pick(profile.education, profile.educationRu)}</p>
                </div>
            </div>

            {profile.skills?.length > 0 && (
                <div className="hub-section">
                    <p className="hub-section-label">{t('termLsSkills')}</p>
                    <div className="hub-tags">
                        {profile.skills.map((skill) => <span key={skill} className="hub-tag">{skill}</span>)}
                    </div>
                </div>
            )}

            <div className="hub-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className="hub-section-label" style={{ marginBottom: 0 }}>{t('termLsProjects')}</p>
                    {canEdit && (
                        <button className="hub-btn-ghost" onClick={() => setShowProjectForm((v) => !v)}>{t('termNewProject')}</button>
                    )}
                </div>

                {showProjectForm && (
                    <form onSubmit={handleCreateProject} className="hub-card" style={{ marginTop: '1rem' }}>
                        <div className="hub-form-row">
                            <div className="hub-form-field">
                                <label className="hub-label">{t('portfolioFormTitle')}</label>
                                <input className="hub-input" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} required />
                            </div>
                            <div className="hub-form-field">
                                <label className="hub-label">{t('portfolioFormUrl')}</label>
                                <input className="hub-input" value={projectForm.url} onChange={(e) => setProjectForm({ ...projectForm, url: e.target.value })} />
                            </div>
                        </div>
                        <div className="hub-form-field" style={{ marginBottom: '0.9rem' }}>
                            <label className="hub-label">{t('portfolioFormBlurb')}</label>
                            <textarea className="hub-textarea" rows={2} value={projectForm.blurb} onChange={(e) => setProjectForm({ ...projectForm, blurb: e.target.value })} />
                        </div>
                        <div className="hub-form-field" style={{ marginBottom: '0.9rem' }}>
                            <label className="hub-label">{t('portfolioFormTags')}</label>
                            <input className="hub-input" value={projectForm.tags} onChange={(e) => setProjectForm({ ...projectForm, tags: e.target.value })} />
                        </div>
                        <button type="submit" className="hub-btn">{t('termAddProject')}</button>
                    </form>
                )}

                {projects.length === 0 && !showProjectForm && (
                    <p className="hub-empty" style={{ marginTop: '0.9rem' }}>{t('termNoProjects')}</p>
                )}

                <div className="hub-project-grid">
                    {projects.map((p) => (
                        <div key={p.id} className="hub-card hub-project-card">
                            {canEdit && (
                                <button className="hub-btn-danger" onClick={() => handleDeleteProject(p.id)}>✕</button>
                            )}
                            <h3 className="hub-project-title">{p.title}</h3>
                            {p.tags?.length > 0 && (
                                <div className="hub-tags">
                                    {p.tags.map((tag) => <span key={tag} className="hub-tag">{tag}</span>)}
                                </div>
                            )}
                            <p className="hub-project-body">{p.blurb}</p>
                            {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="hub-project-link">{p.url}</a>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
