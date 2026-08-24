import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

export default function CharacterSheet() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { t } = useLang()
    const [character, setCharacter] = useState(null)

    useEffect(() => {
        fetchCharacter()
    }, [id])

    const fetchCharacter = async () => {
        try {
            const res = await api.get(`/api/characters/${id}`)
            setCharacter(res.data)
        } catch (err) {
            console.error(err)
            navigate('/characters')
        }
    }

    if (!character) return (
        <div className="parchment-page">
            <p className="tome-empty">Loading...</p>
        </div>
    )

    const skills = character.skills ? JSON.parse(character.skills) : []

    return (
        <div className="parchment-page">

            <div className="sheet-wrapper">

                {/* ── HEADER ── */}
                <div className="sheet-header">
                    <button className="tome-btn-ghost" onClick={() => navigate('/characters')}>
                        {t('backToVault')}
                    </button>
                    <div className="sheet-title-block">
                        <h1 className="sheet-name">{character.name}</h1>
                        <div className="sheet-meta">
                            <span className="meta-tag">{character.characterClass || '—'}</span>
                            <span className="meta-tag">{character.race || '—'}</span>
                            <span className="meta-tag level-tag">{t('level')} {character.level}</span>
                            {character.campaign && (
                                <span className="meta-tag campaign-tag">⚔ {character.campaign.name}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── BACKSTORY ── */}
                {character.backstory && (
                    <div className="sheet-section">
                        <div className="sheet-section-inner">
                            <p className="sheet-backstory">"{character.backstory}"</p>
                        </div>
                    </div>
                )}

                {/* ── THREE COLUMNS ── */}
                <div className="sheet-columns">

                    {/* SPELLBOOK */}
                    <div className="sheet-column">
                        <h2 className="sheet-column-title">✦ {t('spellbook')}</h2>
                        <div className="sheet-column-body">
                            {!character.knownSpells || character.knownSpells.length === 0 ? (
                                <p className="sheet-empty">Заклинания ещё не исследованы.</p>
                            ) : (
                                character.knownSpells.map((spell, i) => (
                                    <div key={i} className="spell-entry" style={{ borderBottom: '1px dashed #8b5a2b', paddingBottom: '8px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="spell-name" style={{ fontFamily: 'Cinzel', fontWeight: 'bold', textTransform: 'uppercase' }}>{spell.spellId}</span>
                                            <span className="spell-accuracy" style={{ fontSize: '0.9em', color: spell.accuracyPercentage === 100 ? 'green' : '#8b5a2b' }}>{spell.accuracyPercentage}%</span>
                                        </div>
                                        <div style={{ fontSize: '0.8em', marginTop: '4px', fontStyle: 'italic' }}>
                                            {spell.accuracyPercentage === 100 ? 'Perfect Mastery' : `Damage: ${spell.modifiedDice || 'Normal'} | Penalty: +${spell.additionalSlotCost || 0} Slot`}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* SKILLS */}
                    <div className="sheet-column">
                        <h2 className="sheet-column-title">⚔ {t('skills')}</h2>
                        <div className="sheet-column-body">
                            {skills.length === 0 ? (
                                <p className="sheet-empty">{t('noSkills')}</p>
                            ) : (
                                skills.map((skill, i) => (
                                    <div key={i} className="skill-entry">
                                        <span className="skill-name">{skill.name}</span>
                                        <span className="skill-badge">{skill.tier}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* INVENTORY */}
                    <div className="sheet-column">
                        <h2 className="sheet-column-title">⚗ {t('inventory')}</h2>
                        <div className="sheet-column-body">
                            {!character.aspectInventory || Object.keys(character.aspectInventory).length === 0 ? (
                                <p className="sheet-empty">{t('noMaterials')}</p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {Object.entries(character.aspectInventory).map(([aspect, count]) => (
                                        <div key={aspect} className="material-entry" style={{ padding: '4px 8px', border: '1px solid #8b5a2b', borderRadius: '4px', background: 'rgba(139, 90, 43, 0.1)' }}>
                                            <span style={{ fontFamily: 'Cinzel', fontWeight: 'bold' }}>{aspect}: {count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}