import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'
import '../styles/terminal.css'

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
        <div className="term-page">
            <div className="term-window">
                <div className="term-titlebar">
                    <span className="term-dot red" />
                    <span className="term-dot yellow" />
                    <span className="term-dot green" />
                    <span className="term-titlebar-label">guest@{profile.name?.toLowerCase().replace(/\s+/g, '-') || 'portfolio'}:~</span>
                </div>
                <div className="term-body">
                    <div className="term-section">
                        <span className="term-prompt" /><span className="term-cmd">{t('portfolioTitle')}</span>
                        <span className="term-cursor" />
                        {profile.photoUrl && <img src={profile.photoUrl} alt={profile.name} className="term-photo" />}
                        <h1 className="term-heading">{profile.name}</h1>
                        <p className="term-sub">{pick(profile.tagline, profile.taglineRu)}</p>
                        {(profile.location || profile.contactEmail) && (
                            <p className="term-comment">
                                {profile.location && <>location: {profile.location}  </>}
                                {profile.contactEmail && <>contact: {profile.contactEmail}</>}
                            </p>
                        )}
                    </div>

                    {notice && <div className="term-notice">{notice}</div>}

                    {canEdit && !editing && (
                        <button className="term-btn" style={{ marginBottom: '1.5rem' }} onClick={startEditing}>
                            {t('termEdit')}
                        </button>
                    )}

                    {editing && profileForm && (
                        <form onSubmit={handleSaveProfile} className="term-form" style={{ marginBottom: '2rem' }}>
                            <span className="term-comment"># {t('termEditing')}</span>
                            <div className="term-row">
                                <div>
                                    <label className="term-label">{t('termName')}</label>
                                    <input className="term-input" value={profileForm.name || ''} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="term-label">{t('termTagline')}</label>
                                    <input className="term-input" value={profileForm.tagline || ''} onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })} />
                                </div>
                                <div>
                                    <label className="term-label">{t('termTaglineRu')}</label>
                                    <input className="term-input" value={profileForm.taglineRu || ''} onChange={(e) => setProfileForm({ ...profileForm, taglineRu: e.target.value })} />
                                </div>
                            </div>
                            <div className="term-row">
                                <div style={{ flex: 1 }}>
                                    <label className="term-label">{t('termBio')}</label>
                                    <textarea className="term-textarea" rows={4} value={profileForm.bio || ''} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="term-label">{t('termBioRu')}</label>
                                    <textarea className="term-textarea" rows={4} value={profileForm.bioRu || ''} onChange={(e) => setProfileForm({ ...profileForm, bioRu: e.target.value })} />
                                </div>
                            </div>
                            <div className="term-row">
                                <div style={{ flex: 1 }}>
                                    <label className="term-label">{t('termEducation')}</label>
                                    <textarea className="term-textarea" rows={3} value={profileForm.education || ''} onChange={(e) => setProfileForm({ ...profileForm, education: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="term-label">{t('termEducationRu')}</label>
                                    <textarea className="term-textarea" rows={3} value={profileForm.educationRu || ''} onChange={(e) => setProfileForm({ ...profileForm, educationRu: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="term-label">{t('termSkills')}</label>
                                <input className="term-input" value={profileForm.skills || ''} onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })} />
                            </div>
                            <div className="term-row">
                                <div>
                                    <label className="term-label">{t('termPhotoUrl')}</label>
                                    <input className="term-input" value={profileForm.photoUrl || ''} onChange={(e) => setProfileForm({ ...profileForm, photoUrl: e.target.value })} />
                                </div>
                                <div>
                                    <label className="term-label">{t('termLocation')}</label>
                                    <input className="term-input" value={profileForm.location || ''} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} />
                                </div>
                                <div>
                                    <label className="term-label">{t('termContactEmail')}</label>
                                    <input className="term-input" value={profileForm.contactEmail || ''} onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <button type="submit" className="term-btn">{t('termSaveProfile')}</button>{' '}
                                <button type="button" className="term-btn" onClick={() => setEditing(false)}>{t('termDone')}</button>
                            </div>
                        </form>
                    )}

                    <div className="term-section">
                        <span className="term-prompt" /><span className="term-cmd">{t('termCatBio')}</span>
                        <p className="term-text" style={{ marginTop: '0.6rem' }}>{pick(profile.bio, profile.bioRu)}</p>
                    </div>

                    <div className="term-section">
                        <span className="term-prompt" /><span className="term-cmd">{t('termCatEdu')}</span>
                        <p className="term-text" style={{ marginTop: '0.6rem' }}>{pick(profile.education, profile.educationRu)}</p>
                    </div>

                    {profile.skills?.length > 0 && (
                        <div className="term-section">
                            <span className="term-prompt" /><span className="term-cmd">{t('termLsSkills')}</span>
                            <div className="term-tags" style={{ marginTop: '0.6rem' }}>
                                {profile.skills.map((skill) => <span key={skill} className="term-tag">{skill}</span>)}
                            </div>
                        </div>
                    )}

                    <div className="term-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><span className="term-prompt" /><span className="term-cmd">{t('termLsProjects')}</span></div>
                            {canEdit && (
                                <button className="term-btn" onClick={() => setShowProjectForm((v) => !v)}>{t('termNewProject')}</button>
                            )}
                        </div>

                        {showProjectForm && (
                            <form onSubmit={handleCreateProject} className="term-form">
                                <div className="term-row">
                                    <div>
                                        <label className="term-label">{t('portfolioFormTitle')}</label>
                                        <input className="term-input" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="term-label">{t('portfolioFormUrl')}</label>
                                        <input className="term-input" value={projectForm.url} onChange={(e) => setProjectForm({ ...projectForm, url: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="term-label">{t('portfolioFormBlurb')}</label>
                                    <textarea className="term-textarea" rows={2} value={projectForm.blurb} onChange={(e) => setProjectForm({ ...projectForm, blurb: e.target.value })} />
                                </div>
                                <div>
                                    <label className="term-label">{t('portfolioFormTags')}</label>
                                    <input className="term-input" value={projectForm.tags} onChange={(e) => setProjectForm({ ...projectForm, tags: e.target.value })} />
                                </div>
                                <button type="submit" className="term-btn">{t('termAddProject')}</button>
                            </form>
                        )}

                        {projects.length === 0 && !showProjectForm && (
                            <p className="term-empty" style={{ marginTop: '0.6rem' }}>{t('termNoProjects')}</p>
                        )}

                        <div className="term-projects" style={{ marginTop: '1rem' }}>
                            {projects.map((p) => (
                                <div key={p.id} className="term-card">
                                    {canEdit && (
                                        <button className="term-btn-danger" onClick={() => handleDeleteProject(p.id)}>✕</button>
                                    )}
                                    <h3 className="term-card-title">{p.title}</h3>
                                    {p.tags?.length > 0 && (
                                        <div className="term-tags">
                                            {p.tags.map((tag) => <span key={tag} className="term-tag">{tag}</span>)}
                                        </div>
                                    )}
                                    <p className="term-card-body">{p.blurb}</p>
                                    {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="term-link">{p.url}</a>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
