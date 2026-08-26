import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

// D&D is publicly viewable now (see SecurityConfig) - only logged-in
// accounts can create/edit/delete, so the "new character" tile and the
// per-card delete button only show up once someone's signed in.

const CLASSES = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Monk', 'Paladin', 'Bard', 'Druid', 'Sorcerer', 'Warlock', 'Barbarian']
const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc', 'Half-Elf', 'Tiefling', 'Dragonborn']

export default function Characters() {
    const { user, logout } = useAuth()
    const { t } = useLang()
    const navigate = useNavigate()
    const [characters, setCharacters] = useState([])
    const [campaigns, setCampaigns] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', characterClass: '', race: '', backstory: '', campaignId: '' })
    const [error, setError] = useState('')

    useEffect(() => {
        fetchCharacters()
        fetchCampaigns()
    }, [])

    const fetchCharacters = async () => {
        try {
            const res = await api.get('/api/characters')
            setCharacters(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            console.error(err)
            setCharacters([])
        }
    }

    const fetchCampaigns = async () => {
        try {
            const res = await api.get('/api/campaigns')
            setCampaigns(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            console.error(err)
            setCampaigns([])
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        setError('')
        try {
            await api.post('/api/characters', {
                ...form,
                campaignId: form.campaignId ? Number(form.campaignId) : null
            })
            setForm({ name: '', characterClass: '', race: '', backstory: '', campaignId: '' })
            setShowForm(false)
            fetchCharacters()
        } catch (err) {
            setError(t('failedCreate'))
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm(t('eraseConfirm'))) return
        try {
            await api.delete(`/api/characters/${id}`)
            fetchCharacters()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="parchment-page">

            <div className="tome-header">
                <h1 className="tome-title">{t('adventurersVault')}</h1>
                <div className="tome-header-right">
                    <Link to="/campaigns" className="tome-btn-ghost">⚔ {t('campaignChronicles')}</Link>
                    {user && <span className="tome-username">{user.username}</span>}
                    {user && <button className="tome-btn-ghost" onClick={logout}>{t('leave')}</button>}
                </div>
            </div>

            <div className="characters-grid">
                {characters.map((char) => (
                    <div
                        key={char.id}
                        className="character-card"
                        onClick={() => navigate(`/characters/${char.id}`)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="character-card-top">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                <span className="character-portrait">
                                    {char.portraitData ? <img src={char.portraitData} alt="" /> : '🗡'}
                                </span>
                                <h2 className="character-name">{char.name}</h2>
                            </div>
                            {user && (
                                <button
                                    className="tome-btn-danger"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(char.id) }}
                                >✕</button>
                            )}
                        </div>
                        <div className="character-meta">
                            <span className="meta-tag">{char.characterClass || '—'}</span>
                            <span className="meta-tag">{char.race || '—'}</span>
                            <span className="meta-tag level-tag">{t('level')} {char.level}</span>
                            {char.campaign && (
                                <span className="meta-tag campaign-tag">⚔ {char.campaign.name}</span>
                            )}
                        </div>
                        {char.backstory && (
                            <p className="character-backstory">{char.backstory}</p>
                        )}
                    </div>
                ))}

                {user && (
                    <div className="character-card new-card" onClick={() => setShowForm(true)}>
                        <span className="new-card-icon">✦</span>
                        <span className="new-card-label">{t('forgeNewCharacter')}</span>
                    </div>
                )}
            </div>

            {showForm && (
                <div className="tome-overlay">
                    <div className="tome-modal">
                        <h2 className="tome-title">{t('forgeALegend')}</h2>
                        {error && <div className="tome-error">{error}</div>}
                        <form onSubmit={handleCreate} className="tome-form">
                            <div className="tome-field">
                                <label>{t('characterName')}</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder={t('nameYourHero')}
                                    required
                                />
                            </div>
                            <div className="tome-row">
                                <div className="tome-field">
                                    <label>{t('class')}</label>
                                    <select
                                        value={form.characterClass}
                                        onChange={(e) => setForm({ ...form, characterClass: e.target.value })}
                                    >
                                        <option value="">{t('choose')}</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="tome-field">
                                    <label>{t('race')}</label>
                                    <select
                                        value={form.race}
                                        onChange={(e) => setForm({ ...form, race: e.target.value })}
                                    >
                                        <option value="">{t('choose')}</option>
                                        {RACES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="tome-field">
                                <label>{t('campaign')}</label>
                                <select
                                    value={form.campaignId}
                                    onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
                                >
                                    <option value="">{t('noCampaign')}</option>
                                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="tome-field">
                                <label>{t('backstory')}</label>
                                <textarea
                                    value={form.backstory}
                                    onChange={(e) => setForm({ ...form, backstory: e.target.value })}
                                    placeholder={t('backstoryPlaceholder')}
                                    rows={3}
                                />
                            </div>
                            <div className="tome-btn-row">
                                <button type="button" className="tome-btn-ghost" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                                <button type="submit" className="tome-btn">{t('sealInBlood')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}