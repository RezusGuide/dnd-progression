import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { ASPECTS, ASPECT_RECIPES, aspectLabel } from '../constants/aspects'
import api from '../api/axios'
import { PageHeader, Loader } from '../components/ui'

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
        return <div className="parchment-page" data-theme="night"><Loader /></div>
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
        <div className="parchment-page" data-theme="night">
            <PageHeader
                title={`${t('craftTitle')}: ${character.name}`}
                subtitle={t('craftSubtitle')}
                back={`/characters/${characterId}`}
                backLabel={t('researchBackToSheet')}
            />
            <div className="research-container">

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
                    <span style={{ fontFamily: 'var(--font-label)', fontSize: '1.3rem', color: 'var(--accent-text)' }}>+</span>
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

                {/* No discovery gating on recipes - any pair here has always
                    worked, so there's no reason to make players guess blind
                    among 44 possibilities. Ready-to-craft pairs (both
                    components currently held, accounting for needing 2 of
                    the same aspect if a === b) are called out so the pouch
                    stops feeling like an opaque dump. */}
                <div style={{ marginTop: '2rem', width: '100%', maxWidth: '480px' }}>
                    <h3 className="tome-field-label" style={{ marginBottom: '0.25rem' }}>{t('craftCompendiumTitle')}</h3>
                    <p className="tome-subtitle" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>{t('craftCompendiumHint')}</p>
                    <div className="craft-compendium-list">
                        {ASPECT_RECIPES.map((r) => {
                            const stockA = pouch[r.a] || 0
                            const stockB = pouch[r.b] || 0
                            const ready = r.a === r.b ? stockA >= 2 : stockA >= 1 && stockB >= 1
                            return (
                                <div key={r.result} className={`craft-compendium-row${ready ? ' ready' : ''}`} title={ready ? t('craftCompendiumReady') : ''}>
                                    <span>{aspectLabel(r.a)} + {aspectLabel(r.b)}</span>
                                    <span aria-hidden="true">→</span>
                                    <span><strong>{aspectLabel(r.result)}</strong></span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
