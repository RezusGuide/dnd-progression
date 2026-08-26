import { useState, useEffect } from 'react'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

// Initiative tracker for a campaign - one encounter per campaign, found or
// created server-side on first fetch (see CombatController/CombatService).
// Any signed-in account can run it, same "no separate DM role" model as
// the rest of the D&D area (SecurityConfig permits GET publicly, requires
// login for everything else).
export default function CombatTracker({ campaignId, rosterCharacters }) {
    const { t } = useLang()
    const [encounter, setEncounter] = useState(null)
    const [error, setError] = useState('')
    const [manualForm, setManualForm] = useState({ name: '', initiative: '', maxHp: '' })
    const [rosterChoice, setRosterChoice] = useState('')

    const fetchEncounter = () => {
        api.get(`/api/campaigns/${campaignId}/combat`).then((res) => setEncounter(res.data)).catch(() => {})
    }

    useEffect(() => {
        fetchEncounter()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaignId])

    if (!encounter) return null

    const handleAddManual = async (e) => {
        e.preventDefault()
        setError('')
        if (!manualForm.name.trim()) return
        try {
            const res = await api.post(`/api/campaigns/${campaignId}/combat/combatants`, {
                name: manualForm.name.trim(),
                initiative: Number(manualForm.initiative) || 0,
                maxHp: manualForm.maxHp ? Number(manualForm.maxHp) : null,
                currentHp: manualForm.maxHp ? Number(manualForm.maxHp) : null,
            })
            setEncounter(res.data)
            setManualForm({ name: '', initiative: '', maxHp: '' })
        } catch (err) {
            setError(err.response?.data?.message || t('combatAddFailed'))
        }
    }

    const handleAddFromRoster = async () => {
        const character = rosterCharacters.find((c) => String(c.id) === rosterChoice)
        if (!character) return
        setError('')
        try {
            const res = await api.post(`/api/campaigns/${campaignId}/combat/combatants`, {
                name: character.name,
                initiative: 0,
                maxHp: character.hpMax ?? null,
                currentHp: character.hpCurrent ?? character.hpMax ?? null,
                characterId: character.id,
            })
            setEncounter(res.data)
            setRosterChoice('')
        } catch (err) {
            setError(err.response?.data?.message || t('combatAddFailed'))
        }
    }

    const handleUpdate = async (combatant, patch) => {
        const next = { ...combatant, ...patch }
        try {
            const res = await api.put(`/api/campaigns/${campaignId}/combat/combatants/${combatant.id}`, {
                name: next.name,
                initiative: Number(next.initiative) || 0,
                maxHp: next.maxHp === '' || next.maxHp === null ? null : Number(next.maxHp),
                currentHp: next.currentHp === '' || next.currentHp === null ? null : Number(next.currentHp),
                conditions: next.conditions || '',
            })
            setEncounter(res.data)
        } catch (err) {
            setError(err.response?.data?.message || t('combatUpdateFailed'))
        }
    }

    const handleRemove = async (combatantId) => {
        try {
            const res = await api.delete(`/api/campaigns/${campaignId}/combat/combatants/${combatantId}`)
            setEncounter(res.data)
        } catch (err) {
            setError(err.response?.data?.message || t('combatUpdateFailed'))
        }
    }

    const handleStart = async () => {
        const res = await api.post(`/api/campaigns/${campaignId}/combat/start`)
        setEncounter(res.data)
    }

    const handleNextTurn = async () => {
        const res = await api.post(`/api/campaigns/${campaignId}/combat/next-turn`)
        setEncounter(res.data)
    }

    const handleReset = async () => {
        if (!window.confirm(t('combatResetConfirm'))) return
        const res = await api.post(`/api/campaigns/${campaignId}/combat/reset`)
        setEncounter(res.data)
    }

    const availableRoster = rosterCharacters.filter(
        (c) => !encounter.combatants.some((cb) => cb.characterId === c.id)
    )

    return (
        <div className="campaign-char-card" style={{ marginBottom: '1.5rem' }}>
            <div className="campaign-char-top">
                <h2 className="character-name">{t('combatTrackerTitle')}</h2>
                {encounter.active && (
                    <span className="meta-tag level-tag">{t('combatRound')} {encounter.round}</span>
                )}
            </div>

            {error && <div className="tome-error">{error}</div>}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.75rem 0' }}>
                <button type="button" className="tome-btn" onClick={handleStart} disabled={encounter.combatants.length === 0}>
                    {encounter.active ? t('combatRestart') : t('combatStart')}
                </button>
                {encounter.active && (
                    <button type="button" className="tome-btn" onClick={handleNextTurn}>{t('combatNextTurn')}</button>
                )}
                <button type="button" className="tome-btn-danger" onClick={handleReset}>{t('combatReset')}</button>
            </div>

            <div className="combat-list">
                {encounter.combatants.length === 0 && <p className="tome-empty">{t('combatEmpty')}</p>}
                {encounter.combatants.map((c, i) => (
                    <div key={c.id} className={`combat-row ${encounter.active && i === encounter.currentTurn ? 'active-turn' : ''}`}>
                        <input
                            className="materials-input combat-init-input"
                            type="number"
                            value={c.initiative}
                            onChange={(e) => handleUpdate(c, { initiative: e.target.value })}
                            title={t('combatInitiative')}
                        />
                        <span className="combat-name">{c.name}{c.characterId && <span className="meta-tag" style={{ marginLeft: '0.4rem' }}>{t('combatFromRoster')}</span>}</span>
                        <input
                            className="materials-input combat-hp-input"
                            type="number"
                            value={c.currentHp ?? ''}
                            onChange={(e) => handleUpdate(c, { currentHp: e.target.value })}
                            title={t('combatCurrentHp')}
                        />
                        <span className="combat-hp-sep">/</span>
                        <input
                            className="materials-input combat-hp-input"
                            type="number"
                            value={c.maxHp ?? ''}
                            onChange={(e) => handleUpdate(c, { maxHp: e.target.value })}
                            title={t('combatMaxHp')}
                        />
                        <input
                            className="materials-input combat-conditions-input"
                            value={c.conditions || ''}
                            onChange={(e) => handleUpdate(c, { conditions: e.target.value })}
                            placeholder={t('combatConditionsPlaceholder')}
                        />
                        <button type="button" className="tome-btn-danger" onClick={() => handleRemove(c.id)}>✕</button>
                    </div>
                ))}
            </div>

            <div className="combat-add-row">
                {availableRoster.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <select value={rosterChoice} onChange={(e) => setRosterChoice(e.target.value)}>
                            <option value="">{t('combatChooseCharacter')}</option>
                            {availableRoster.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button type="button" className="tome-btn" onClick={handleAddFromRoster} disabled={!rosterChoice}>{t('combatAddFromRoster')}</button>
                    </div>
                )}
                <form onSubmit={handleAddManual} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <input className="materials-input" style={{ flex: 2 }} placeholder={t('combatName')} value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} />
                    <input className="materials-input" style={{ width: '5rem' }} type="number" placeholder={t('combatInitiative')} value={manualForm.initiative} onChange={(e) => setManualForm({ ...manualForm, initiative: e.target.value })} />
                    <input className="materials-input" style={{ width: '5rem' }} type="number" placeholder={t('combatMaxHp')} value={manualForm.maxHp} onChange={(e) => setManualForm({ ...manualForm, maxHp: e.target.value })} />
                    <button type="submit" className="tome-btn">{t('combatAddManual')}</button>
                </form>
            </div>
        </div>
    )
}
