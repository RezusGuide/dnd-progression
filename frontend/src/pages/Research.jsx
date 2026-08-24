import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { ASPECTS } from '../constants/aspects'
import api from '../api/axios'

const HEX_SIZE = 35
const GRID_RADIUS = 4

const hexPoints = () => {
    const points = []
    for (let i = 0; i < 6; i++) {
        const angleDeg = 60 * i - 30
        const angleRad = (Math.PI / 180) * angleDeg
        points.push(`${HEX_SIZE * Math.cos(angleRad)},${HEX_SIZE * Math.sin(angleRad)}`)
    }
    return points.join(' ')
}

const axialToPixel = (q, r) => ({
    x: HEX_SIZE * Math.sqrt(3) * (q + r / 2),
    y: HEX_SIZE * (3 / 2) * r,
})

const hexes = []
for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
    const r1 = Math.max(-GRID_RADIUS, -q - GRID_RADIUS)
    const r2 = Math.min(GRID_RADIUS, -q + GRID_RADIUS)
    for (let r = r1; r <= r2; r++) hexes.push({ q, r })
}

const usageOf = (nodes) => {
    const usage = {}
    Object.values(nodes).forEach((a) => { usage[a] = (usage[a] || 0) + 1 })
    return usage
}

export default function Research() {
    const { characterId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { t } = useLang()
    const canResearch = !!user

    const [character, setCharacter] = useState(null)
    const [mode, setMode] = useState('scratch') // 'scratch' | 'hinted'
    const [hintedSpells, setHintedSpells] = useState([])
    const [selectedSpellId, setSelectedSpellId] = useState('')
    const [guidePattern, setGuidePattern] = useState([])
    const [activeAspect, setActiveAspect] = useState(ASPECTS[0].key)
    const [placedNodes, setPlacedNodes] = useState({})
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [draftSaved, setDraftSaved] = useState(false)

    const fetchCharacter = () => {
        api.get(`/api/characters/${characterId}`).then((res) => setCharacter(res.data)).catch(() => navigate('/characters'))
    }

    useEffect(() => {
        fetchCharacter()
        api.get(`/api/characters/${characterId}/hinted-spells`).then((res) => setHintedSpells(res.data)).catch(() => setHintedSpells([]))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [characterId])

    // Switching modes (or picking a different hinted spell) starts fresh -
    // a from-scratch attempt and a hinted one are different submissions.
    useEffect(() => {
        setPlacedNodes({})
        setResult(null)
        setError('')
        setDraftSaved(false)
        if (mode === 'hinted' && selectedSpellId) {
            api.get(`/api/characters/${characterId}/research/${selectedSpellId}/pattern`)
                .then((res) => setGuidePattern(res.data))
                .catch(() => setGuidePattern([]))
            api.get(`/api/characters/${characterId}/research/${selectedSpellId}/draft`)
                .then((res) => {
                    if (Array.isArray(res.data)) setPlacedNodes(Object.fromEntries(res.data.map((a) => [`${a.q},${a.r}`, a.aspect])))
                })
                .catch(() => {})
        } else {
            setGuidePattern([])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, selectedSpellId])

    if (!character) {
        return <div className="parchment-page"><p className="tome-empty">Loading...</p></div>
    }

    const pouch = character.aspects || {}
    const usage = usageOf(placedNodes)

    const handleHexClick = (q, r) => {
        if (!canResearch) return
        const key = `${q},${r}`
        setPlacedNodes((prev) => {
            if (prev[key] === activeAspect) {
                const next = { ...prev }
                delete next[key]
                return next
            }
            const used = usageOf(prev)[activeAspect] || 0
            const stock = pouch[activeAspect] || 0
            if (used >= stock) {
                setError(t('researchNotEnoughAspects'))
                return prev
            }
            setError('')
            return { ...prev, [key]: activeAspect }
        })
    }

    const handleClear = () => {
        setPlacedNodes({})
        setResult(null)
        setError('')
    }

    const handleSaveDraft = async () => {
        if (mode !== 'hinted' || !selectedSpellId) return
        const placements = Object.entries(placedNodes).map(([key, aspect]) => {
            const [q, r] = key.split(',').map(Number)
            return { aspect, q, r }
        })
        try {
            await api.put(`/api/characters/${characterId}/research/${selectedSpellId}/draft`, { gridState: JSON.stringify(placements) })
            setDraftSaved(true)
        } catch (err) {
            console.error(err)
        }
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        setError('')
        setResult(null)
        try {
            const placements = Object.entries(placedNodes).map(([key, aspect]) => {
                const [q, r] = key.split(',').map(Number)
                return { aspect, q, r }
            })
            const res = await api.post(`/api/characters/${characterId}/research/attempt`, {
                spellId: mode === 'hinted' ? selectedSpellId : null,
                placements,
            })
            setResult(res.data)
            setPlacedNodes({})
            fetchCharacter()
        } catch (err) {
            setError(err.response?.data?.message || t('researchAttemptFailed'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="parchment-page">
            <div className="research-container">
                <Link to={`/characters/${characterId}`} className="tome-btn-ghost" style={{ alignSelf: 'flex-start', marginBottom: '1rem' }}>
                    {t('researchBackToSheet')}
                </Link>
                <h1 className="tome-title">{t('researchTitle')} — {character.name}</h1>
                <p className="tome-subtitle" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>{t('researchSubtitle')}</p>

                {!canResearch && <div className="tome-notice">{t('readOnlyNotice')}</div>}
                {error && <div className="tome-error">{error}</div>}

                <div className="research-mode-toggle">
                    <button
                        type="button"
                        className={`aspect-btn ${mode === 'scratch' ? 'active' : ''}`}
                        onClick={() => setMode('scratch')}
                    >{t('researchModeScratch')}</button>
                    <button
                        type="button"
                        className={`aspect-btn ${mode === 'hinted' ? 'active' : ''}`}
                        onClick={() => setMode('hinted')}
                    >{t('researchModeHinted')}</button>
                </div>
                <p className="tome-subtitle research-mode-hint">
                    {mode === 'scratch' ? t('researchScratchHint') : t('researchHintedHint')}
                </p>

                {mode === 'hinted' && (
                    <select
                        className="research-spell-select"
                        value={selectedSpellId}
                        onChange={(e) => setSelectedSpellId(e.target.value)}
                    >
                        <option value="">{t('researchChooseSpell')}</option>
                        {hintedSpells.map((s) => <option key={s.id} value={s.id}>{s.name} (Lv {s.level})</option>)}
                    </select>
                )}
                {mode === 'hinted' && hintedSpells.length === 0 && (
                    <p className="tome-subtitle">{t('researchNoHinted')}</p>
                )}

                <div className="aspect-palette">
                    {ASPECTS.map((a) => (
                        <button
                            key={a.key}
                            type="button"
                            className={`aspect-btn ${activeAspect === a.key ? 'active' : ''}`}
                            onClick={() => setActiveAspect(a.key)}
                            title={t(a.descKey)}
                        >
                            {t(a.labelKey)} ({Math.max(0, (pouch[a.key] || 0) - (usage[a.key] || 0))})
                        </button>
                    ))}
                </div>

                {(mode === 'scratch' || selectedSpellId) && (
                    <>
                        <svg width="600" height="500" viewBox="-300 -250 600 500">
                            {hexes.map(({ q, r }) => {
                                const key = `${q},${r}`
                                const guideAspect = mode === 'hinted' ? guidePattern.find((p) => p.q === q && p.r === r)?.aspect : null
                                const placedAspect = placedNodes[key]
                                const { x, y } = axialToPixel(q, r)

                                let hexClass = 'hex-polygon'
                                if (guideAspect) hexClass += ' guide'
                                if (placedAspect) hexClass += ' placed'

                                return (
                                    <g key={key} transform={`translate(${x}, ${y})`} onClick={() => handleHexClick(q, r)}>
                                        <polygon points={hexPoints()} className={hexClass} />
                                        {(placedAspect || guideAspect) && (
                                            <text textAnchor="middle" alignmentBaseline="middle" fontSize="10" fill="#f4ecd8" fontFamily="Cinzel" pointerEvents="none">
                                                {(placedAspect || guideAspect).slice(0, 3)}
                                            </text>
                                        )}
                                    </g>
                                )
                            })}
                        </svg>

                        <div className="research-cost-row">
                            <div>
                                <h3 className="tome-field-label">{t('researchAspectCost')}</h3>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem', justifyContent: 'center' }}>
                                    {Object.keys(usage).length === 0 && <span className="beyond-readonly-empty">—</span>}
                                    {Object.entries(usage).map(([aspect, count]) => (
                                        <span key={aspect} className="meta-tag">{aspect}: {count}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {mode === 'hinted' && selectedSpellId && (
                                <button type="button" className="aspect-btn" onClick={handleSaveDraft} disabled={!canResearch}>
                                    {draftSaved ? t('researchDraftSaved') : t('researchSaveDraft')}
                                </button>
                            )}
                            <button type="button" className="aspect-btn" onClick={handleClear} disabled={!canResearch}>{t('researchClear')}</button>
                            <button
                                type="button"
                                className="aspect-btn active"
                                onClick={handleSubmit}
                                disabled={!canResearch || submitting || Object.keys(placedNodes).length === 0}
                            >{t('researchSubmit')}</button>
                        </div>
                    </>
                )}

                {result && (
                    <div className="tome-notice research-result">
                        <h2 className="tome-title" style={{ fontSize: '1.2rem' }}>{t('researchResultTitle')}</h2>
                        <p><strong>{result.spellName}</strong> — {result.accuracyPercentage}%</p>
                        <p className="tome-subtitle">{t('researchRecordedAt')}: {result.recordedAccuracyPercentage}%</p>
                    </div>
                )}
            </div>
        </div>
    )
}
