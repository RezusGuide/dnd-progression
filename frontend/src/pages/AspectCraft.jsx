import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { ASPECTS, aspectLabel } from '../constants/aspects'
import api from '../api/axios'

// Separate minigame from Research.jsx - combining two held aspects into a
// new one per the backend's AspectRecipe table. No "discovery" state: any
// valid pair works the first time it's tried (see the aspect-crafting
// prompt), so this is just two picker slots and a submit button.
export default function AspectCraft() {
    const { characterId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { t } = useLang()
    const canCraft = !!user

    const [character, setCharacter] = useState(null)
    const [aspectA, setAspectA] = useState('')
    const [aspectB, setAspectB] = useState('')
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const fetchCharacter = () => {
        api.get(`/api/characters/${characterId}`).then((res) => setCharacter(res.data)).catch(() => navigate('/characters'))
    }

    useEffect(() => {
        fetchCharacter()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [characterId])

    if (!character) {
        return <div className="parchment-page"><p className="tome-empty">Loading...</p></div>
    }

    const pouch = character.aspects || {}
    const held = ASPECTS.filter((a) => (pouch[a.key] || 0) > 0)

    // A picking itself twice needs at least 2 in stock, not just 1.
    const bothPicked = !!aspectA && !!aspectB
    const enoughStock = bothPicked && (aspectA !== aspectB
        ? (pouch[aspectA] || 0) >= 1 && (pouch[aspectB] || 0) >= 1
        : (pouch[aspectA] || 0) >= 2)

    const handleCombine = async () => {
        if (!enoughStock) return
        setSubmitting(true)
        setError('')
        setResult(null)
        try {
            const res = await api.post(`/api/characters/${characterId}/aspects/craft`, { aspectA, aspectB })
            setResult(res.data)
            fetchCharacter()
            setAspectA('')
            setAspectB('')
        } catch (err) {
            setError(err.response?.data?.message || t('craftFailed'))
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
                <h1 className="tome-title">{t('craftTitle')} — {character.name}</h1>
                <p className="tome-subtitle" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>{t('craftSubtitle')}</p>

                {!canCraft && <div className="tome-notice">{t('readOnlyNotice')}</div>}
                {error && <div className="tome-error">{error}</div>}

                <div className="tome-row" style={{ justifyContent: 'center', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="tome-field">
                        <label>{t('craftSlotA')}</label>
                        <select value={aspectA} onChange={(e) => setAspectA(e.target.value)} disabled={!canCraft}>
                            <option value="">{t('choose')}</option>
                            {held.map((a) => <option key={a.key} value={a.key}>{aspectLabel(a.key)} ({pouch[a.key]})</option>)}
                        </select>
                    </div>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: 'var(--gold)' }}>+</span>
                    <div className="tome-field">
                        <label>{t('craftSlotB')}</label>
                        <select value={aspectB} onChange={(e) => setAspectB(e.target.value)} disabled={!canCraft}>
                            <option value="">{t('choose')}</option>
                            {held.map((a) => <option key={a.key} value={a.key}>{aspectLabel(a.key)} ({pouch[a.key]})</option>)}
                        </select>
                    </div>
                </div>

                {held.length === 0 && <p className="tome-subtitle">{t('craftPouchEmpty')}</p>}

                <button
                    type="button"
                    className="aspect-btn active"
                    onClick={handleCombine}
                    disabled={!canCraft || submitting || !enoughStock}
                >{t('craftCombine')}</button>

                {result && (
                    <div className={`tome-notice research-result ${result.success ? '' : 'tome-error'}`}>
                        {result.success
                            ? <p><strong>{t('craftSuccess')}:</strong> {aspectLabel(result.resultAspect)}</p>
                            : <p>{t('craftNoMatch')}</p>}
                    </div>
                )}

                <div style={{ marginTop: '2rem', width: '100%', maxWidth: '480px' }}>
                    <h3 className="tome-field-label" style={{ marginBottom: '0.5rem' }}>⚗ {t('sheetMaterialPouch')}</h3>
                    {held.length === 0 && <p className="beyond-readonly-empty">{t('sheetPouchEmpty')}</p>}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {held.map((a) => (
                            <span key={a.key} className="meta-tag" title={t(a.descKey)}>{aspectLabel(a.key)}: {pouch[a.key]}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
