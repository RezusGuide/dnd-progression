import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'
import '../styles/beyond.css'

// 5e reference data - governing ability per skill, per the PHB. Kept as a
// frontend-only constant; the backend just stores whichever skill/ability
// keys show up in the proficiency sets, no validation needed there.
const ABILITIES = [
    { key: 'STR', field: 'strength', label: 'Strength' },
    { key: 'DEX', field: 'dexterity', label: 'Dexterity' },
    { key: 'CON', field: 'constitution', label: 'Constitution' },
    { key: 'INT', field: 'intelligence', label: 'Intelligence' },
    { key: 'WIS', field: 'wisdom', label: 'Wisdom' },
    { key: 'CHA', field: 'charisma', label: 'Charisma' },
]

const SKILLS = [
    { key: 'ACROBATICS', label: 'Acrobatics', ability: 'DEX' },
    { key: 'ANIMAL_HANDLING', label: 'Animal Handling', ability: 'WIS' },
    { key: 'ARCANA', label: 'Arcana', ability: 'INT' },
    { key: 'ATHLETICS', label: 'Athletics', ability: 'STR' },
    { key: 'DECEPTION', label: 'Deception', ability: 'CHA' },
    { key: 'HISTORY', label: 'History', ability: 'INT' },
    { key: 'INSIGHT', label: 'Insight', ability: 'WIS' },
    { key: 'INTIMIDATION', label: 'Intimidation', ability: 'CHA' },
    { key: 'INVESTIGATION', label: 'Investigation', ability: 'INT' },
    { key: 'MEDICINE', label: 'Medicine', ability: 'WIS' },
    { key: 'NATURE', label: 'Nature', ability: 'INT' },
    { key: 'PERCEPTION', label: 'Perception', ability: 'WIS' },
    { key: 'PERFORMANCE', label: 'Performance', ability: 'CHA' },
    { key: 'PERSUASION', label: 'Persuasion', ability: 'CHA' },
    { key: 'RELIGION', label: 'Religion', ability: 'INT' },
    { key: 'SLEIGHT_OF_HAND', label: 'Sleight of Hand', ability: 'DEX' },
    { key: 'STEALTH', label: 'Stealth', ability: 'DEX' },
    { key: 'SURVIVAL', label: 'Survival', ability: 'WIS' },
]

const abilityMod = (score) => Math.floor(((score ?? 10) - 10) / 2)
const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`)
const numOrNull = (raw) => (raw === '' ? null : Number(raw))

// Every character fetched from the API may have nulls on any sheet field -
// either it predates this rebuild, or a field was just never filled in.
// This coalesces those into safe, editable defaults exactly once, when the
// form is first hydrated from a fetch.
function hydrate(c) {
    return {
        name: c.name || '',
        characterClass: c.characterClass || '',
        level: c.level || 1,
        race: c.race || '',
        background: c.background || '',
        playerName: c.playerName || '',
        alignment: c.alignment || '',
        experiencePoints: c.experiencePoints ?? 0,

        strength: c.strength ?? 10,
        dexterity: c.dexterity ?? 10,
        constitution: c.constitution ?? 10,
        intelligence: c.intelligence ?? 10,
        wisdom: c.wisdom ?? 10,
        charisma: c.charisma ?? 10,
        proficiencyBonus: c.proficiencyBonus ?? 2,

        proficientSaves: c.proficientSaves || [],
        proficientSkills: c.proficientSkills || [],
        expertiseSkills: c.expertiseSkills || [],

        armorClass: c.armorClass ?? 10,
        initiativeOverride: c.initiativeOverride ?? null,
        speed: c.speed ?? 30,
        hpMax: c.hpMax ?? 0,
        hpCurrent: c.hpCurrent ?? 0,
        hpTemp: c.hpTemp ?? 0,
        hitDiceTotal: c.hitDiceTotal ?? (c.level || 1),
        hitDiceType: c.hitDiceType || 'd8',
        deathSaveSuccesses: c.deathSaveSuccesses ?? 0,
        deathSaveFailures: c.deathSaveFailures ?? 0,
        inspiration: !!c.inspiration,

        attacks: c.attacks && c.attacks.length ? c.attacks : [],
        spellNotes: c.spellNotes || '',

        equipment: c.equipment || '',
        cp: c.cp ?? 0, sp: c.sp ?? 0, ep: c.ep ?? 0, gp: c.gp ?? 0, pp: c.pp ?? 0,
        otherProficiencies: c.otherProficiencies || '',

        personalityTraits: c.personalityTraits || '',
        ideals: c.ideals || '',
        bonds: c.bonds || '',
        flaws: c.flaws || '',
        featuresAndTraits: c.featuresAndTraits || '',

        age: c.age || '',
        height: c.height || '',
        weight: c.weight || '',
        eyes: c.eyes || '',
        skin: c.skin || '',
        hair: c.hair || '',
        appearance: c.appearance || '',
        alliesOrganizations: c.alliesOrganizations || '',
        organizationName: c.organizationName || '',
        backstory: c.backstory || '',
        additionalFeatures: c.additionalFeatures || '',
        treasure: c.treasure || '',
    }
}

export default function CharacterSheet() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { t } = useLang()
    // D&D is public to view; any signed-in account can edit (not just the
    // creator) - see CharacterService#updateSheet.
    const canEdit = !!user

    const [character, setCharacter] = useState(null)
    const [form, setForm] = useState(null)
    const [tab, setTab] = useState('main')
    const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error

    const saveTimer = useRef(null)
    const skipNextSave = useRef(true)

    useEffect(() => {
        let cancelled = false
        api.get(`/api/characters/${id}`)
            .then((res) => {
                if (cancelled) return
                setCharacter(res.data)
                skipNextSave.current = true
                setForm(hydrate(res.data))
            })
            .catch(() => navigate('/characters'))
        return () => { cancelled = true }
    }, [id])

    // Autosave: any change to the form queues a debounced PUT of the whole
    // sheet. skipNextSave swallows the setForm that fires right after a
    // fetch/hydrate, so loading a character doesn't immediately re-save it.
    useEffect(() => {
        if (!form || !canEdit) return
        if (skipNextSave.current) { skipNextSave.current = false; return }
        setSaveState('saving')
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(async () => {
            try {
                const res = await api.put(`/api/characters/${id}/sheet`, form)
                setCharacter(res.data)
                setSaveState('saved')
            } catch (err) {
                console.error(err)
                setSaveState('error')
            }
        }, 700)
        return () => clearTimeout(saveTimer.current)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form])

    if (!character || !form) {
        return <div className="beyond-page"><div className="beyond-loading">Loading character…</div></div>
    }

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
    const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: numOrNull(e.target.value) }))

    const toggleSave = (abilityKey) => {
        if (!canEdit) return
        setForm((f) => {
            const s = new Set(f.proficientSaves)
            if (s.has(abilityKey)) s.delete(abilityKey)
            else s.add(abilityKey)
            return { ...f, proficientSaves: [...s] }
        })
    }

    const cycleSkill = (skillKey) => {
        if (!canEdit) return
        setForm((f) => {
            const prof = new Set(f.proficientSkills)
            const exp = new Set(f.expertiseSkills)
            if (exp.has(skillKey)) { exp.delete(skillKey); prof.delete(skillKey) }
            else if (prof.has(skillKey)) { exp.add(skillKey) }
            else { prof.add(skillKey) }
            return { ...f, proficientSkills: [...prof], expertiseSkills: [...exp] }
        })
    }

    const toggleDeathDot = (type, index) => {
        if (!canEdit) return
        const key = type === 'success' ? 'deathSaveSuccesses' : 'deathSaveFailures'
        setForm((f) => {
            const current = f[key] || 0
            const next = current === index + 1 ? index : index + 1
            return { ...f, [key]: Math.max(0, Math.min(3, next)) }
        })
    }

    const addAttack = () => setForm((f) => ({ ...f, attacks: [...f.attacks, { name: '', attackBonus: '', damageType: '' }] }))
    const removeAttack = (idx) => setForm((f) => ({ ...f, attacks: f.attacks.filter((_, i) => i !== idx) }))
    const updateAttack = (idx, key, value) => setForm((f) => ({
        ...f,
        attacks: f.attacks.map((a, i) => (i === idx ? { ...a, [key]: value } : a)),
    }))

    function saveBonus(abilityKey) {
        const ability = ABILITIES.find((a) => a.key === abilityKey)
        const mod = abilityMod(form[ability.field])
        return form.proficientSaves.includes(abilityKey) ? mod + (form.proficiencyBonus || 0) : mod
    }

    function skillBonus(skillKey) {
        const skill = SKILLS.find((s) => s.key === skillKey)
        const mod = abilityMod(form[ABILITIES.find((a) => a.key === skill.ability).field])
        if (form.expertiseSkills.includes(skillKey)) return mod + (form.proficiencyBonus || 0) * 2
        if (form.proficientSkills.includes(skillKey)) return mod + (form.proficiencyBonus || 0)
        return mod
    }

    const dexMod = abilityMod(form.dexterity)
    const initiative = form.initiativeOverride !== null && form.initiativeOverride !== undefined
        ? form.initiativeOverride
        : dexMod
    const passivePerception = 10 + skillBonus('PERCEPTION')

    const saveLabel = { idle: '', saving: 'Saving…', saved: 'Saved', error: 'Save failed' }[saveState]

    return (
        <div className="beyond-page">
            <div className="beyond-topbar">
                <button className="beyond-back" onClick={() => navigate('/characters')}>{t('backToVault')}</button>
                {canEdit && saveLabel && (
                    <span className={`beyond-save-status ${saveState}`}>{saveLabel}</span>
                )}
            </div>

            {/* ── HEADER ── */}
            <div className="beyond-header">
                <input
                    className="beyond-name-input"
                    value={form.name}
                    onChange={set('name')}
                    disabled={!canEdit}
                    placeholder="Character Name"
                />
                <div className="beyond-header-grid">
                    <div className="beyond-field">
                        <span className="beyond-field-label">Class</span>
                        <input className="beyond-input" value={form.characterClass} onChange={set('characterClass')} disabled={!canEdit} placeholder="Wizard" />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">Level</span>
                        <input className="beyond-input beyond-input-num" type="number" min="1" max="20" value={form.level} onChange={setNum('level')} disabled={!canEdit} />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">Race</span>
                        <input className="beyond-input" value={form.race} onChange={set('race')} disabled={!canEdit} placeholder="Human" />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">Background</span>
                        <input className="beyond-input" value={form.background} onChange={set('background')} disabled={!canEdit} />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">Alignment</span>
                        <input className="beyond-input" value={form.alignment} onChange={set('alignment')} disabled={!canEdit} />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">Player Name</span>
                        <input className="beyond-input" value={form.playerName} onChange={set('playerName')} disabled={!canEdit} />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">Experience Points</span>
                        <input className="beyond-input beyond-input-num" type="number" min="0" value={form.experiencePoints} onChange={setNum('experiencePoints')} disabled={!canEdit} />
                    </div>
                    {character.campaign && (
                        <div className="beyond-field">
                            <span className="beyond-field-label">Campaign</span>
                            <input className="beyond-input" value={character.campaign.name} disabled />
                        </div>
                    )}
                </div>
            </div>

            {/* ── TABS ── */}
            <div className="beyond-tabs">
                <button className={`beyond-tab ${tab === 'main' ? 'active' : ''}`} onClick={() => setTab('main')}>Main</button>
                <button className={`beyond-tab ${tab === 'background' ? 'active' : ''}`} onClick={() => setTab('background')}>Background & Personality</button>
                <button className={`beyond-tab ${tab === 'notes' ? 'active' : ''}`} onClick={() => setTab('notes')}>Notes & Backstory</button>
            </div>

            {/* ── MAIN TAB ── */}
            {tab === 'main' && (
                <div className="beyond-main-grid">
                    <div>
                        {/* Abilities */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">Ability Scores</h2>
                            <div className="beyond-abilities">
                                {ABILITIES.map((a) => (
                                    <div key={a.key} className="beyond-ability">
                                        <span className="beyond-ability-abbr">{a.key}</span>
                                        <span className="beyond-ability-mod">{fmt(abilityMod(form[a.field]))}</span>
                                        <span className="beyond-ability-score-row">
                                            <input
                                                className="beyond-ability-score"
                                                type="number" min="1" max="30"
                                                value={form[a.field]}
                                                onChange={setNum(a.field)}
                                                disabled={!canEdit}
                                            />
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="beyond-passive">
                                <span>Proficiency Bonus</span>
                                <input
                                    className="beyond-input beyond-input-sm beyond-input-num"
                                    style={{ width: '3.5rem' }}
                                    type="number"
                                    value={form.proficiencyBonus}
                                    onChange={setNum('proficiencyBonus')}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>

                        {/* Saving throws */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">Saving Throws</h2>
                            {ABILITIES.map((a) => (
                                <div key={a.key} className="beyond-prof-row">
                                    <div className="beyond-prof-left">
                                        <button
                                            type="button"
                                            className={`beyond-dot ${form.proficientSaves.includes(a.key) ? 'proficient' : ''}`}
                                            onClick={() => toggleSave(a.key)}
                                            disabled={!canEdit}
                                            aria-label={`${a.label} save proficiency`}
                                        />
                                        <span className="beyond-prof-name">{a.label}</span>
                                    </div>
                                    <span className="beyond-prof-bonus">{fmt(saveBonus(a.key))}</span>
                                </div>
                            ))}
                        </div>

                        {/* Skills */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">Skills</h2>
                            {SKILLS.map((s) => (
                                <div key={s.key} className="beyond-prof-row">
                                    <div className="beyond-prof-left">
                                        <button
                                            type="button"
                                            className={`beyond-dot ${form.expertiseSkills.includes(s.key) ? 'expertise' : form.proficientSkills.includes(s.key) ? 'proficient' : ''}`}
                                            onClick={() => cycleSkill(s.key)}
                                            disabled={!canEdit}
                                            title={form.expertiseSkills.includes(s.key) ? 'Expertise' : form.proficientSkills.includes(s.key) ? 'Proficient' : 'Not proficient'}
                                            aria-label={`${s.label} proficiency`}
                                        />
                                        <span className="beyond-prof-name">{s.label}</span>
                                        <span className="beyond-prof-ability">({s.ability})</span>
                                    </div>
                                    <span className="beyond-prof-bonus">{fmt(skillBonus(s.key))}</span>
                                </div>
                            ))}
                            <div className="beyond-passive">
                                <span>Passive Wisdom (Perception)</span>
                                <strong>{passivePerception}</strong>
                            </div>
                        </div>
                    </div>

                    <div>
                        {/* Combat stats */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">Combat</h2>
                            <div className="beyond-combat-row">
                                <div className="beyond-ac-shield">
                                    <input
                                        className="beyond-ac-value"
                                        type="number"
                                        value={form.armorClass}
                                        onChange={setNum('armorClass')}
                                        disabled={!canEdit}
                                    />
                                    <span className="beyond-ac-label">ARMOR CLASS</span>
                                </div>
                                <div className="beyond-stat-box">
                                    <span className="beyond-field-label">Initiative</span>
                                    <input
                                        className="beyond-stat-value"
                                        type="number"
                                        value={initiative}
                                        onChange={(e) => setForm((f) => ({ ...f, initiativeOverride: numOrNull(e.target.value) }))}
                                        disabled={!canEdit}
                                        title="Derived from Dex unless you type your own value"
                                    />
                                </div>
                                <div className="beyond-stat-box">
                                    <span className="beyond-field-label">Speed</span>
                                    <input className="beyond-stat-value" type="number" value={form.speed} onChange={setNum('speed')} disabled={!canEdit} />
                                </div>
                                <div className="beyond-inspiration">
                                    <span className="beyond-field-label">Inspiration</span>
                                    <button
                                        type="button"
                                        className={`beyond-inspiration-btn ${form.inspiration ? 'on' : ''}`}
                                        onClick={() => canEdit && setForm((f) => ({ ...f, inspiration: !f.inspiration }))}
                                        disabled={!canEdit}
                                    >✦</button>
                                </div>
                            </div>

                            <div className="beyond-hp-box">
                                <div className="beyond-hp-top">
                                    <input className="beyond-hp-current" type="number" value={form.hpCurrent} onChange={setNum('hpCurrent')} disabled={!canEdit} />
                                    <span className="beyond-hp-slash">/</span>
                                    <input className="beyond-hp-max" type="number" value={form.hpMax} onChange={setNum('hpMax')} disabled={!canEdit} />
                                </div>
                                <div className="beyond-hp-sub">
                                    <span>Hit Points</span>
                                    <span>· Temp</span>
                                    <input className="beyond-hp-temp" type="number" value={form.hpTemp} onChange={setNum('hpTemp')} disabled={!canEdit} />
                                </div>
                            </div>

                            <div className="beyond-hitdice-death" style={{ marginTop: '0.75rem' }}>
                                <div className="beyond-stat-box">
                                    <span className="beyond-field-label">Hit Dice</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <input className="beyond-stat-value" style={{ width: '2.2rem', fontSize: '1.1rem' }} type="number" value={form.hitDiceTotal} onChange={setNum('hitDiceTotal')} disabled={!canEdit} />
                                        <input className="beyond-input beyond-input-sm" style={{ width: '3rem' }} value={form.hitDiceType} onChange={set('hitDiceType')} disabled={!canEdit} />
                                    </div>
                                </div>
                                <div className="beyond-death-saves">
                                    <div className="beyond-death-row success">
                                        <span>Successes</span>
                                        <div className="beyond-death-dots">
                                            {[0, 1, 2].map((i) => (
                                                <button key={i} type="button" className={`beyond-death-dot ${i < form.deathSaveSuccesses ? 'filled' : ''}`} onClick={() => toggleDeathDot('success', i)} disabled={!canEdit} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="beyond-death-row failure">
                                        <span>Failures</span>
                                        <div className="beyond-death-dots">
                                            {[0, 1, 2].map((i) => (
                                                <button key={i} type="button" className={`beyond-death-dot ${i < form.deathSaveFailures ? 'filled' : ''}`} onClick={() => toggleDeathDot('failure', i)} disabled={!canEdit} />
                                            ))}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--bey-text-faint)' }}>Death Saves</span>
                                </div>
                            </div>
                        </div>

                        {/* Attacks & spellcasting */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">Attacks & Spellcasting</h2>
                            {form.attacks.length > 0 && (
                                <div className="beyond-attack-header">
                                    <span className="beyond-field-label">Name</span>
                                    <span className="beyond-field-label">Bonus</span>
                                    <span className="beyond-field-label">Damage / Type</span>
                                    <span />
                                </div>
                            )}
                            {form.attacks.map((atk, i) => (
                                <div key={i} className="beyond-attack-row">
                                    <input className="beyond-input beyond-input-sm" value={atk.name || ''} onChange={(e) => updateAttack(i, 'name', e.target.value)} disabled={!canEdit} />
                                    <input className="beyond-input beyond-input-sm" value={atk.attackBonus || ''} onChange={(e) => updateAttack(i, 'attackBonus', e.target.value)} disabled={!canEdit} placeholder="+5" />
                                    <input className="beyond-input beyond-input-sm" value={atk.damageType || ''} onChange={(e) => updateAttack(i, 'damageType', e.target.value)} disabled={!canEdit} placeholder="1d8+3 slashing" />
                                    {canEdit && <button type="button" className="beyond-remove-btn" onClick={() => removeAttack(i)}>✕</button>}
                                </div>
                            ))}
                            {form.attacks.length === 0 && !canEdit && <p className="beyond-readonly-empty">No attacks recorded.</p>}
                            {canEdit && <button type="button" className="beyond-add-btn" onClick={addAttack}>+ Add Attack</button>}

                            <div style={{ marginTop: '0.9rem' }}>
                                <span className="beyond-field-label">Spell Notes (save DC, attack bonus, prepared spells)</span>
                                <textarea className="beyond-textarea" rows={4} value={form.spellNotes} onChange={set('spellNotes')} disabled={!canEdit} style={{ marginTop: '0.3rem' }} />
                            </div>
                        </div>

                        {/* Equipment */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">Equipment</h2>
                            <textarea className="beyond-textarea" rows={4} value={form.equipment} onChange={set('equipment')} disabled={!canEdit} />
                            <div className="beyond-currency-row">
                                {['cp', 'sp', 'ep', 'gp', 'pp'].map((cur) => (
                                    <div key={cur} className="beyond-currency-field">
                                        <span className="beyond-field-label">{cur.toUpperCase()}</span>
                                        <input className="beyond-input beyond-input-num" type="number" min="0" value={form[cur]} onChange={setNum(cur)} disabled={!canEdit} />
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '0.9rem' }}>
                                <span className="beyond-field-label">Other Proficiencies & Languages</span>
                                <textarea className="beyond-textarea" rows={3} value={form.otherProficiencies} onChange={set('otherProficiencies')} disabled={!canEdit} style={{ marginTop: '0.3rem' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── BACKGROUND & PERSONALITY TAB ── */}
            {tab === 'background' && (
                <div>
                    <div className="beyond-card">
                        <h2 className="beyond-card-title">Personality</h2>
                        <div className="beyond-grid-2">
                            <div className="beyond-field">
                                <span className="beyond-field-label">Personality Traits</span>
                                <textarea className="beyond-textarea" rows={4} value={form.personalityTraits} onChange={set('personalityTraits')} disabled={!canEdit} />
                            </div>
                            <div className="beyond-field">
                                <span className="beyond-field-label">Ideals</span>
                                <textarea className="beyond-textarea" rows={4} value={form.ideals} onChange={set('ideals')} disabled={!canEdit} />
                            </div>
                            <div className="beyond-field">
                                <span className="beyond-field-label">Bonds</span>
                                <textarea className="beyond-textarea" rows={4} value={form.bonds} onChange={set('bonds')} disabled={!canEdit} />
                            </div>
                            <div className="beyond-field">
                                <span className="beyond-field-label">Flaws</span>
                                <textarea className="beyond-textarea" rows={4} value={form.flaws} onChange={set('flaws')} disabled={!canEdit} />
                            </div>
                        </div>
                    </div>

                    <div className="beyond-card">
                        <h2 className="beyond-card-title">Features & Traits</h2>
                        <textarea className="beyond-textarea" rows={5} value={form.featuresAndTraits} onChange={set('featuresAndTraits')} disabled={!canEdit} placeholder="Class/race features, feats…" />
                    </div>

                    <div className="beyond-card">
                        <h2 className="beyond-card-title">Character Details</h2>
                        <div className="beyond-grid-6">
                            {[
                                ['age', 'Age'], ['height', 'Height'], ['weight', 'Weight'],
                                ['eyes', 'Eyes'], ['skin', 'Skin'], ['hair', 'Hair'],
                            ].map(([key, label]) => (
                                <div key={key} className="beyond-field">
                                    <span className="beyond-field-label">{label}</span>
                                    <input className="beyond-input" value={form[key]} onChange={set(key)} disabled={!canEdit} />
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '0.9rem' }}>
                            <span className="beyond-field-label">Character Appearance</span>
                            <textarea className="beyond-textarea" rows={3} value={form.appearance} onChange={set('appearance')} disabled={!canEdit} style={{ marginTop: '0.3rem' }} />
                        </div>
                        <div className="beyond-grid-2" style={{ marginTop: '0.9rem' }}>
                            <div className="beyond-field">
                                <span className="beyond-field-label">Organization / Faction</span>
                                <input className="beyond-input" value={form.organizationName} onChange={set('organizationName')} disabled={!canEdit} />
                            </div>
                            <div className="beyond-field">
                                <span className="beyond-field-label">Allies & Organizations</span>
                                <textarea className="beyond-textarea" rows={3} value={form.alliesOrganizations} onChange={set('alliesOrganizations')} disabled={!canEdit} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── NOTES & BACKSTORY TAB ── */}
            {tab === 'notes' && (
                <div>
                    <div className="beyond-card">
                        <h2 className="beyond-card-title">Character Backstory</h2>
                        <textarea className="beyond-textarea" rows={12} value={form.backstory} onChange={set('backstory')} disabled={!canEdit} placeholder="Who were you before the adventure began…" />
                    </div>
                    <div className="beyond-card">
                        <h2 className="beyond-card-title">Additional Features & Traits</h2>
                        <textarea className="beyond-textarea" rows={5} value={form.additionalFeatures} onChange={set('additionalFeatures')} disabled={!canEdit} />
                    </div>
                    <div className="beyond-card">
                        <h2 className="beyond-card-title">Treasure</h2>
                        <textarea className="beyond-textarea" rows={4} value={form.treasure} onChange={set('treasure')} disabled={!canEdit} />
                    </div>
                </div>
            )}
        </div>
    )
}
