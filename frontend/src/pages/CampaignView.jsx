import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import api from '../api/axios'
import { EmptyState, Loader, PageHeader } from '../components/ui'
import { className, raceName } from '../constants/dnd-ru'

export default function CampaignView() {
    const { id } = useParams()
    const { t } = useLang()
    const [campaign, setCampaign] = useState(null)
    const [characters, setCharacters] = useState([])

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
        } catch (err) {
            console.error(err)
        }
    }

    if (!campaign) return (
        <div className="parchment-page">
            <Loader />
        </div>
    )

    return (
        <div className="parchment-page">

            <PageHeader title={campaign.name} subtitle={campaign.description} back="/campaigns" />

            <div className="campaigns-list">
                {characters.length === 0 ? (
                    <EmptyState>{t('noCharacters')}</EmptyState>
                ) : (
                    characters.map((char) => (
                        <div key={char.id} className="campaign-char-card">
                            <div className="campaign-char-top">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span className="character-portrait">
                                        {char.portraitData ? <img src={char.portraitData} alt="" /> : '🗡'}
                                    </span>
                                    <div>
                                        <h2 className="character-name">{char.name}</h2>
                                        <div className="character-meta" style={{ marginTop: '0.4rem' }}>
                                        <span className="meta-tag">{className(char.characterClass) || '—'}</span>
                                        <span className="meta-tag">{raceName(char.race) || '—'}</span>
                                        <span className="meta-tag level-tag">{t('level')} {char.level}</span>
                                        {char.approvalStatus === 'PENDING' && <span className="meta-tag pending-tag">На рассмотрении</span>}
                                        <span className="meta-tag">{char.user?.username}</span>
                                    </div>
                                    </div>
                                </div>
                            </div>

                            {char.backstory && (
                                <p className="character-backstory">{char.backstory}</p>
                            )}

                            {/* Read-only - materials are DM-granted only now (Admin.jsx's
                                Grant Material), appended so nothing here can be
                                accidentally overwritten by a player editing this page. */}
                            {char.materials && (
                                <div className="materials-section">
                                    <label className="tome-field-label">⚗ {t('materials')}</label>
                                    <p className="character-backstory" style={{ whiteSpace: 'pre-line' }}>{char.materials}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}