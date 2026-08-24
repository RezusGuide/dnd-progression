import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

export default function CampaignView() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { t } = useLang()
    const [campaign, setCampaign] = useState(null)
    const [characters, setCharacters] = useState([])
    const [editingMaterials, setEditingMaterials] = useState({})

    useEffect(() => {
        fetchCampaign()
        fetchCharacters()
    }, [id])

    const fetchCampaign = async () => {
        try {
            const res = await api.get(`/api/campaigns/${id}`)
            setCampaign(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    const fetchCharacters = async () => {
        try {
            const res = await api.get(`/api/campaigns/${id}/characters`)
            setCharacters(res.data)
            const initial = {}
            res.data.forEach(c => { initial[c.id] = c.materials || '' })
            setEditingMaterials(initial)
        } catch (err) {
            console.error(err)
        }
    }

    const saveMaterials = async (charId) => {
        try {
            await api.patch(`/api/characters/${charId}/materials`, {
                materials: editingMaterials[charId]
            })
        } catch (err) {
            console.error(err)
        }
    }

    if (!campaign) return (
        <div className="parchment-page">
            <p className="tome-empty">Loading...</p>
        </div>
    )

    return (
        <div className="parchment-page">

            <div className="tome-header">
                <div>
                    <button className="tome-btn-ghost" onClick={() => navigate('/campaigns')}>
                        {t('backToCampaigns')}
                    </button>
                    <h1 className="tome-title" style={{ marginTop: '0.5rem' }}>{campaign.name}</h1>
                    {campaign.description && (
                        <p className="tome-subtitle">{campaign.description}</p>
                    )}
                </div>
            </div>

            <div className="campaigns-list">
                {characters.length === 0 ? (
                    <p className="tome-empty">{t('noCharacters')}</p>
                ) : (
                    characters.map((char) => (
                        <div key={char.id} className="campaign-char-card">
                            <div className="campaign-char-top">
                                <div>
                                    <h2 className="character-name">{char.name}</h2>
                                    <div className="character-meta" style={{ marginTop: '0.4rem' }}>
                                        <span className="meta-tag">{char.characterClass || '—'}</span>
                                        <span className="meta-tag">{char.race || '—'}</span>
                                        <span className="meta-tag level-tag">{t('level')} {char.level}</span>
                                        <span className="meta-tag">{char.user?.username}</span>
                                    </div>
                                </div>
                            </div>

                            {char.backstory && (
                                <p className="character-backstory">{char.backstory}</p>
                            )}

                            <div className="materials-section">
                                <label className="tome-field-label">⚗ {t('materials')}</label>
                                <textarea
                                    className="materials-input"
                                    value={editingMaterials[char.id] || ''}
                                    onChange={(e) => setEditingMaterials({
                                        ...editingMaterials,
                                        [char.id]: e.target.value
                                    })}
                                    rows={3}
                                    placeholder="3x Papyrus, 1x Fire Aspect Crystal..."
                                />
                                <button
                                    className="tome-btn"
                                    style={{ marginTop: '0.5rem' }}
                                    onClick={() => saveMaterials(char.id)}
                                >
                                    {t('saveMaterials')}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}