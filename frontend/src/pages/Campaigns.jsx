import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

export default function Campaigns() {
    const { user, logout } = useAuth()
    const { t } = useLang()
    const navigate = useNavigate()
    const [campaigns, setCampaigns] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', description: '' })
    const [error, setError] = useState('')

    useEffect(() => {
        fetchCampaigns()
    }, [])

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
            await api.post('/api/campaigns', form)
            setForm({ name: '', description: '' })
            setShowForm(false)
            fetchCampaigns()
        } catch (err) {
            setError(t('failedCampaign'))
        }
    }

    return (
        <div className="parchment-page">

            <div className="tome-header">
                <h1 className="tome-title">{t('campaignChronicles')}</h1>
                <div className="tome-header-right">
                    <Link to="/characters" className="tome-btn-ghost">{t('adventurersVault')}</Link>
                    {user && <span className="tome-username">{user.username}</span>}
                    {user && <button className="tome-btn-ghost" onClick={logout}>{t('leave')}</button>}
                </div>
            </div>

            <div className="campaigns-list">
                {user && (
                    <div className="campaign-new-row">
                        <button className="tome-btn" onClick={() => setShowForm(!showForm)}>
                            ✦ {t('newCampaign')}
                        </button>
                    </div>
                )}

                {showForm && (
                    <div className="tome-panel" style={{ maxWidth: '600px', marginBottom: '2rem' }}>
                        {error && <div className="tome-error">{error}</div>}
                        <form onSubmit={handleCreate} className="tome-form">
                            <div className="tome-field">
                                <label>{t('campaignName')}</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="tome-field">
                                <label>{t('campaignDesc')}</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="tome-btn-row">
                                <button type="button" className="tome-btn-ghost" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                                <button type="submit" className="tome-btn">{t('createCampaign')}</button>
                            </div>
                        </form>
                    </div>
                )}

                {campaigns.length === 0 ? (
                    <p className="tome-empty">{t('noCampaigns')}</p>
                ) : (
                    campaigns.map((c) => (
                        <div key={c.id} className="campaign-card">
                            <div className="campaign-card-left">
                                <h2 className="campaign-name">{c.name}</h2>
                                {c.description && <p className="campaign-desc">{c.description}</p>}
                                <span className="campaign-owner">{t('owner')}: {c.owner?.username}</span>
                            </div>
                            <button
                                className="tome-btn"
                                onClick={() => navigate(`/campaigns/${c.id}`)}
                            >
                                {t('viewCampaign')}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}