import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import LangToggle from '../components/LangToggle'
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

    const spells = character.spells ? JSON.parse(character.spells) : []
    const skills = character.skills ? JSON.parse(character.skills) : []
    const materials = character.materials || ''

    return (
        <div className="parchment-page">
            <LangToggle />

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
                            {spells.length === 0 ? (
                                <p className="sheet-empty">{t('noSpells')}</p>
                            ) : (
                                spells.map((spell, i) => (
                                    <div key={i} className="spell-entry">
                                        <span className="spell-name">{spell.name}</span>
                                        <span className="spell-accuracy">{spell.accuracy}%</span>
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
                            {!materials ? (
                                <p className="sheet-empty">{t('noMaterials')}</p>
                            ) : (
                                materials.split('\n').filter(Boolean).map((item, i) => (
                                    <div key={i} className="material-entry">
                                        <span>◆ {item}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}