import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { ASPECTS, aspectLabel } from '../constants/aspects'
import api from '../api/axios'

const HEX_SIZE = 35
const GRID_RADIUS = 4

// Mirrors ResearchServiceImpl.LEVEL_ASPECT_RANGE / MIN_DISTINCT_ASPECTS /
// MIN_EXOTIC_ASPECTS - kept in sync manually, same as the backend's own
// comment says to do when correcting a mistranscribed aspect pairing.
const LEVEL_ASPECT_RANGE = { 1: [3, 4], 2: [4, 5], 3: [5, 7], 4: [6, 8], 5: [7, 9], 6: [8, 10], 7: [9, 11], 8: [10, 12] }
const MIN_DISTINCT = { 1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 5, 8: 5 }
const MIN_EXOTIC = { 1: 0, 2: 1, 3: 1, 4: 2, 5: 2, 6: 3, 7: 3, 8: 4 }
const PRIMAL_KEYS = new Set(ASPECTS.filter((a) => a.primal).map((a) => a.key))
const RESEARCHABLE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8]

// Mirrors ResearchServiceImpl.HEX_NEIGHBORS.
const HEX_NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]

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

// Flood-fill over placed cells (plus the guide pattern's cells in hinted
// mode) - a client-side mirror of ResearchServiceImpl#requireConnected, so
// the player gets immediate feedback instead of only finding out on submit.
function isConnected(placedKeys, guideKeys) {
    const cells = new Set([...placedKeys, ...guideKeys])
    if (cells.size <= 1) return true
    const start = cells.values().next().value
    const visited = new Set([start])
    const stack = [start]
    while (stack.length) {
        const [q, r] = stack.pop().split(',').map(Number)
        for (const [dq, dr] of HEX_NEIGHBORS) {
            const neighborKey = `${q + dq},${r + dr}`
            if (cells.has(neighborKey) && !visited.has(neighborKey)) {
                visited.add(neighborKey)
                stack.push(neighborKey)
            }
        }
    }
    return visited.size === cells.size
}

export default function Research() {
    const { characterId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { t } = useLang()
    const canResearch = !!user

    const [character, setCharacter] = useState(null)
    const [mode, setMode] = useState('scratch') // 'scratch' | 'hinted'
    const [targetLevel, setTargetLevel] = useState(1)
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
    const placedKeys = Object.keys(placedNodes)
    const guideKeys = mode === 'hinted' ? guidePattern.map((a) => `${a.q},${a.r}`) : []

    const activeLevel = mode === 'hinted'
        ? (hintedSpells.find((s) => s.id === selectedSpellId)?.level ?? null)
        : targetLevel
    const range = activeLevel ? LEVEL_ASPECT_RANGE[activeLevel] : null
    const countInRange = range ? placedKeys.length >= range[0] && placedKeys.length <= range[1] : false
    const connected = isConnected(placedKeys, guideKeys)

    const placedAspectValues = Object.values(placedNodes)
    const distinctCount = new Set(placedAspectValues).size
    const exoticCount = placedAspectValues.filter((a) => !PRIMAL_KEYS.has(a)).length
    const minDistinct = activeLevel ? MIN_DISTINCT[activeLevel] : 0
    const minExotic = activeLevel ? MIN_EXOTIC[activeLevel] : 0
    const varietyMet = distinctCount >= minDistinct
    const exoticMet = exoticCount >= minExotic

    const canSubmit = canResearch && !submitting && placedKeys.length > 0 && countInRange && connected
        && varietyMet && exoticMet && (mode === 'scratch' || !!selectedSpellId)

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
                targetLevel: mode === 'scratch' ? targetLevel : undefined,
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

                {mode === 'scratch' && (
                    <select
                        className="research-spell-select"
                        value={targetLevel}
                        onChange={(e) => setTargetLevel(Number(e.target.value))}
                    >
                        {RESEARCHABLE_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                                {t('level')} {lvl} ({LEVEL_ASPECT_RANGE[lvl][0]}-{LEVEL_ASPECT_RANGE[lvl][1]} {t('researchAspectCost')})
                            </option>
                        ))}
                    </select>
                )}

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

                <select
                    className="research-spell-select"
                    value={activeAspect}
                    onChange={(e) => setActiveAspect(e.target.value)}
                >
                    {ASPECTS.map((a) => {
                        const remaining = Math.max(0, (pouch[a.key] || 0) - (usage[a.key] || 0))
                        return (
                            <option key={a.key} value={a.key} disabled={remaining === 0}>
                                {aspectLabel(a.key)} ({remaining})
                            </option>
                        )
                    })}
                </select>

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
                                                {aspectLabel(placedAspect || guideAspect).slice(0, 4)}
                                            </text>
                                        )}
                                    </g>
                                )
                            })}
                        </svg>

                        <div className="research-cost-row" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                            <div>
                                <h3 className="tome-field-label">{t('researchAspectCost')}</h3>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem', justifyContent: 'center' }}>
                                    {Object.keys(usage).length === 0 && <span className="beyond-readonly-empty">—</span>}
                                    {Object.entries(usage).map(([aspect, count]) => (
                                        <span key={aspect} className="meta-tag">{aspectLabel(aspect)}: {count}</span>
                                    ))}
                                </div>
                            </div>
                            {range && (
                                <p style={{ textAlign: 'center', margin: 0, color: countInRange ? 'var(--ink)' : 'var(--crimson)' }}>
                                    {t('researchAspectsPlaced')}: {placedKeys.length} / {range[0]}-{range[1]}
                                </p>
                            )}
                            {activeLevel && (
                                <p style={{ textAlign: 'center', margin: 0, color: varietyMet ? 'var(--ink)' : 'var(--crimson)' }}>
                                    {t('researchDistinctPlaced')}: {distinctCount} / {minDistinct}+
                                </p>
                            )}
                            {activeLevel && minExotic > 0 && (
                                <p style={{ textAlign: 'center', margin: 0, color: exoticMet ? 'var(--ink)' : 'var(--crimson)' }}>
                                    {t('researchExoticPlaced')}: {exoticCount} / {minExotic}+
                                </p>
                            )}
                            {placedKeys.length > 0 && !connected && (
                                <p style={{ textAlign: 'center', margin: 0, color: 'var(--crimson)' }}>{t('researchNotConnected')}</p>
                            )}
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
                                disabled={!canSubmit}
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
