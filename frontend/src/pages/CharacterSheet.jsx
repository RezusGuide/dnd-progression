import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { spellName } from '../constants/spellText'
import { isNonCaster, isSpellEligible } from '../constants/casterClasses'
import { ASPECTS, aspectLabel } from '../constants/aspects'
import api from '../api/axios'
import '../styles/beyond.css'

// 5e reference data - governing ability per skill, per the PHB. Kept as a
// frontend-only constant; the backend just stores whichever skill/ability
// keys show up in the proficiency sets, no validation needed there.
// labelKey/short are translation keys resolved with t() at render time.
const ABILITIES = [
    { key: 'STR', field: 'strength', labelKey: 'abilityStrength' },
    { key: 'DEX', field: 'dexterity', labelKey: 'abilityDexterity' },
    { key: 'CON', field: 'constitution', labelKey: 'abilityConstitution' },
    { key: 'INT', field: 'intelligence', labelKey: 'abilityIntelligence' },
    { key: 'WIS', field: 'wisdom', labelKey: 'abilityWisdom' },
    { key: 'CHA', field: 'charisma', labelKey: 'abilityCharisma' },
]

const SKILLS = [
    { key: 'ACROBATICS', labelKey: 'skillAcrobatics', ability: 'DEX' },
    { key: 'ANIMAL_HANDLING', labelKey: 'skillAnimalHandling', ability: 'WIS' },
    { key: 'ARCANA', labelKey: 'skillArcana', ability: 'INT' },
    { key: 'ATHLETICS', labelKey: 'skillAthletics', ability: 'STR' },
    { key: 'DECEPTION', labelKey: 'skillDeception', ability: 'CHA' },
    { key: 'HISTORY', labelKey: 'skillHistory', ability: 'INT' },
    { key: 'INSIGHT', labelKey: 'skillInsight', ability: 'WIS' },
    { key: 'INTIMIDATION', labelKey: 'skillIntimidation', ability: 'CHA' },
    { key: 'INVESTIGATION', labelKey: 'skillInvestigation', ability: 'INT' },
    { key: 'MEDICINE', labelKey: 'skillMedicine', ability: 'WIS' },
    { key: 'NATURE', labelKey: 'skillNature', ability: 'INT' },
    { key: 'PERCEPTION', labelKey: 'skillPerception', ability: 'WIS' },
    { key: 'PERFORMANCE', labelKey: 'skillPerformance', ability: 'CHA' },
    { key: 'PERSUASION', labelKey: 'skillPersuasion', ability: 'CHA' },
    { key: 'RELIGION', labelKey: 'skillReligion', ability: 'INT' },
    { key: 'SLEIGHT_OF_HAND', labelKey: 'skillSleightOfHand', ability: 'DEX' },
    { key: 'STEALTH', labelKey: 'skillStealth', ability: 'DEX' },
    { key: 'SURVIVAL', labelKey: 'skillSurvival', ability: 'WIS' },
]

const abilityMod = (score) => Math.floor(((score ?? 10) - 10) / 2)
const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`)
const numOrNull = (raw) => (raw === '' ? null : Number(raw))

// Downscales/recompresses an uploaded image client-side before it ever
// reaches the server - there's no file-storage service here, portraits are
// stored as a data URI directly on the character row (see
// Character#portraitData), so keeping each one small matters. 256x256 cap,
// JPEG at 0.85 quality; typically lands well under 50KB.
const MAX_PORTRAIT_DIMENSION = 256
function resizeImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error)
        reader.onload = () => {
            const img = new Image()
            img.onerror = () => reject(new Error('Could not read image'))
            img.onload = () => {
                const scale = Math.min(1, MAX_PORTRAIT_DIMENSION / Math.max(img.width, img.height))
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.width * scale)
                canvas.height = Math.round(img.height * scale)
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                resolve(canvas.toDataURL('image/jpeg', 0.85))
            }
            img.src = reader.result
        }
        reader.readAsDataURL(file)
    })
}

function safeParseJson(raw, fallback) {
    if (!raw) return fallback
    try {
        return JSON.parse(raw)
    } catch {
        return fallback
    }
}

const SPELL_SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

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
        portraitData: c.portraitData || '',

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
        // Stored on the entity as a JSON string (Character#spellSlotsJson);
        // parsed here into a plain object keyed "1".."9" for editing, and
        // sent back as that same object - CharacterSheetRequest#spellSlots
        // is a proper Map, no re-stringifying needed on the way out.
        spellSlots: safeParseJson(c.spellSlotsJson, {}),
        spellPointsMax: c.spellPointsMax ?? null,
        spellPointsCurrent: c.spellPointsCurrent ?? null,

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
    const { user, hasSection } = useAuth()
    const { t, lang } = useLang()

    const [character, setCharacter] = useState(null)
    // D&D is public to view; only the character's own creator, or an
    // OWNER-role/DM account, can edit it - see CharacterService#updateSheet.
    // character starts null until the fetch below resolves, so this is
    // false during the initial load; that's fine, nothing reads it before
    // the "!character" loading guard further down returns early.
    const canEdit = !!user && (hasSection('*') || character?.ownerId === user.userId)
    const [form, setForm] = useState(null)
    const [tab, setTab] = useState('main')
    const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
    const [linkCopied, setLinkCopied] = useState(false)

    const handleShareLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            setLinkCopied(true)
            setTimeout(() => setLinkCopied(false), 1500)
        } catch { /* clipboard not available - ignore */ }
    }

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const [knownSpells, setKnownSpells] = useState([])
    const [cantripCatalog, setCantripCatalog] = useState([])
    const [cantripChoice, setCantripChoice] = useState('')

    const refreshKnownSpells = () => {
        api.get(`/api/characters/${id}/known-spells`).then((res) => setKnownSpells(res.data)).catch(() => {})
    }

    useEffect(() => {
        refreshKnownSpells()
        api.get('/api/spells').then((res) => setCantripCatalog(res.data.filter((s) => s.level === 0))).catch(() => setCantripCatalog([]))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const handleAddCantrip = async () => {
        if (!cantripChoice) return
        try {
            await api.post(`/api/characters/${id}/cantrips/${cantripChoice}`)
            setCantripChoice('')
            refreshKnownSpells()
        } catch (err) {
            console.error(err)
        }
    }

    if (!character || !form) {
        return <div className="beyond-page"><div className="beyond-loading">{t('sheetLoading')}</div></div>
    }

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
    const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: numOrNull(e.target.value) }))

    const setSpellSlot = (level, field) => (e) => {
        const raw = e.target.value
        const value = raw === '' ? null : Math.max(0, Number(raw))
        setForm((f) => {
            const existing = f.spellSlots[level] || {}
            const updated = { ...existing, [field]: value }
            // A max of 0 (or unset) with no current in use isn't worth
            // keeping a row for - drop it so an empty sheet doesn't grow a
            // spellSlots object full of {max:0,current:0} noise.
            const isEmpty = !updated.max && !updated.current
            const nextLevels = { ...f.spellSlots }
            if (isEmpty) delete nextLevels[level]
            else nextLevels[level] = updated
            return { ...f, spellSlots: nextLevels }
        })
    }

    const handleLongRest = () => {
        setForm((f) => {
            const rested = {}
            for (const [level, slot] of Object.entries(f.spellSlots)) {
                rested[level] = { ...slot, current: slot.max ?? 0 }
            }
            return {
                ...f,
                spellSlots: rested,
                spellPointsCurrent: f.spellPointsMax ?? f.spellPointsCurrent,
            }
        })
    }

    const handlePortraitChange = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = '' // let re-selecting the same file re-fire onChange
        if (!file) return
        try {
            const dataUri = await resizeImageFile(file)
            setForm((f) => ({ ...f, portraitData: dataUri }))
        } catch (err) {
            console.error(err)
        }
    }

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

    function skillTitle(skillKey) {
        if (form.expertiseSkills.includes(skillKey)) return t('profExpertise')
        if (form.proficientSkills.includes(skillKey)) return t('profProficient')
        return t('profNotProficient')
    }

    const dexMod = abilityMod(form.dexterity)
    const initiative = form.initiativeOverride !== null && form.initiativeOverride !== undefined
        ? form.initiativeOverride
        : dexMod
    const passivePerception = 10 + skillBonus('PERCEPTION')

    const saveLabel = { idle: '', saving: t('sheetSaving'), saved: t('sheetSaved'), error: t('sheetSaveFailed') }[saveState]

    return (
        <div className="beyond-page">
            <div className="beyond-topbar">
                <button className="beyond-back" onClick={() => navigate('/characters')}>{t('backToVault')}</button>
                {canEdit && saveLabel && (
                    <span className={`beyond-save-status ${saveState}`}>{saveLabel}</span>
                )}
                {/* GET /api/characters/{id} is already public/unauthenticated
                    (see SecurityConfig) - this page has always been viewable
                    by anyone with the URL, read-only. This button just makes
                    that shareable link easy to grab. */}
                <button type="button" className="beyond-back" style={{ marginLeft: 'auto' }} onClick={handleShareLink}>
                    🔗 {linkCopied ? t('sheetLinkCopied') : t('sheetShareLink')}
                </button>
            </div>

            {/* ── HEADER ── */}
            <div className="beyond-header">
                <div className="beyond-header-top">
                    <label className={`beyond-portrait ${canEdit ? 'editable' : ''}`}>
                        {form.portraitData
                            ? <img src={form.portraitData} alt="" className="beyond-portrait-img" />
                            : <span className="beyond-portrait-placeholder">🗡</span>}
                        {canEdit && <input type="file" accept="image/*" onChange={handlePortraitChange} hidden />}
                    </label>
                    <input
                        className="beyond-name-input"
                        value={form.name}
                        onChange={set('name')}
                        disabled={!canEdit}
                        placeholder={t('sheetNamePlaceholder')}
                    />
                </div>
                <div className="beyond-header-grid">
                    <div className="beyond-field">
                        <span className="beyond-field-label">{t('class')}</span>
                        <input className="beyond-input" value={form.characterClass} onChange={set('characterClass')} disabled={!canEdit} placeholder={t('sheetClassPlaceholder')} />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">{t('level')}</span>
                        <input className="beyond-input beyond-input-num" type="number" min="1" max="20" value={form.level ?? ''} onChange={setNum('level')} disabled={!canEdit} />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">{t('race')}</span>
                        <input className="beyond-input" value={form.race} onChange={set('race')} disabled={!canEdit} placeholder={t('sheetRacePlaceholder')} />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">{t('sheetBackground')}</span>
                        <input className="beyond-input" value={form.background} onChange={set('background')} disabled={!canEdit} />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">{t('sheetAlignment')}</span>
                        <input className="beyond-input" value={form.alignment} onChange={set('alignment')} disabled={!canEdit} />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">{t('sheetPlayerName')}</span>
                        <input className="beyond-input" value={form.playerName} onChange={set('playerName')} disabled={!canEdit} />
                    </div>
                    <div className="beyond-field">
                        <span className="beyond-field-label">{t('sheetXp')}</span>
                        <input className="beyond-input beyond-input-num" type="number" min="0" value={form.experiencePoints ?? ''} onChange={setNum('experiencePoints')} disabled={!canEdit} />
                    </div>
                    {character.campaign && (
                        <div className="beyond-field">
                            <span className="beyond-field-label">{t('campaign')}</span>
                            <input className="beyond-input" value={character.campaign.name} disabled />
                        </div>
                    )}
                </div>
            </div>

            {/* ── TABS ── */}
            <div className="beyond-tabs">
                <button className={`beyond-tab ${tab === 'main' ? 'active' : ''}`} onClick={() => setTab('main')}>{t('sheetTabMain')}</button>
                <button className={`beyond-tab ${tab === 'background' ? 'active' : ''}`} onClick={() => setTab('background')}>{t('sheetTabBackground')}</button>
                <button className={`beyond-tab ${tab === 'notes' ? 'active' : ''}`} onClick={() => setTab('notes')}>{t('sheetTabNotes')}</button>
            </div>

            {/* ── MAIN TAB ── */}
            {tab === 'main' && (
                <div className="beyond-main-grid">
                    <div>
                        {/* Abilities */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">{t('sheetAbilityScores')}</h2>
                            <div className="beyond-abilities">
                                {ABILITIES.map((a) => (
                                    <div key={a.key} className="beyond-ability" title={t(a.labelKey)}>
                                        <span className="beyond-ability-abbr">{a.key}</span>
                                        <span className="beyond-ability-mod">{fmt(abilityMod(form[a.field]))}</span>
                                        <span className="beyond-ability-score-row">
                                            <input
                                                className="beyond-ability-score"
                                                type="number" min="1" max="30"
                                                value={form[a.field] ?? ''}
                                                onChange={setNum(a.field)}
                                                disabled={!canEdit}
                                            />
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="beyond-passive">
                                <span>{t('sheetProficiencyBonus')}</span>
                                <input
                                    className="beyond-input beyond-input-sm beyond-input-num"
                                    style={{ width: '3.5rem' }}
                                    type="number"
                                    value={form.proficiencyBonus ?? ''}
                                    onChange={setNum('proficiencyBonus')}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>

                        {/* Saving throws */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">{t('sheetSavingThrows')}</h2>
                            {ABILITIES.map((a) => (
                                <div key={a.key} className="beyond-prof-row">
                                    <div className="beyond-prof-left">
                                        <button
                                            type="button"
                                            className={`beyond-dot ${form.proficientSaves.includes(a.key) ? 'proficient' : ''}`}
                                            onClick={() => toggleSave(a.key)}
                                            disabled={!canEdit}
                                            aria-label={t(a.labelKey)}
                                        />
                                        <span className="beyond-prof-name">{t(a.labelKey)}</span>
                                    </div>
                                    <span className="beyond-prof-bonus">{fmt(saveBonus(a.key))}</span>
                                </div>
                            ))}
                        </div>

                        {/* Skills */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">{t('sheetSkills')}</h2>
                            {SKILLS.map((s) => (
                                <div key={s.key} className="beyond-prof-row">
                                    <div className="beyond-prof-left">
                                        <button
                                            type="button"
                                            className={`beyond-dot ${form.expertiseSkills.includes(s.key) ? 'expertise' : form.proficientSkills.includes(s.key) ? 'proficient' : ''}`}
                                            onClick={() => cycleSkill(s.key)}
                                            disabled={!canEdit}
                                            title={skillTitle(s.key)}
                                            aria-label={t(s.labelKey)}
                                        />
                                        <span className="beyond-prof-name">{t(s.labelKey)}</span>
                                        <span className="beyond-prof-ability">({s.ability})</span>
                                    </div>
                                    <span className="beyond-prof-bonus">{fmt(skillBonus(s.key))}</span>
                                </div>
                            ))}
                            <div className="beyond-passive">
                                <span>{t('sheetPassivePerception')}</span>
                                <strong>{passivePerception}</strong>
                            </div>
                        </div>
                    </div>

                    <div>
                        {/* Combat stats */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">{t('sheetCombat')}</h2>
                            <div className="beyond-combat-row">
                                <div className="beyond-ac-wrap">
                                    <div className="beyond-ac-shield">
                                        <input
                                            className="beyond-ac-value"
                                            type="number"
                                            value={form.armorClass ?? ''}
                                            onChange={setNum('armorClass')}
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    <span className="beyond-ac-label">{t('sheetArmorClass')}</span>
                                </div>
                                <div className="beyond-stat-box">
                                    <span className="beyond-field-label">{t('sheetInitiative')}</span>
                                    <input
                                        className="beyond-stat-value"
                                        type="number"
                                        value={initiative}
                                        onChange={(e) => setForm((f) => ({ ...f, initiativeOverride: numOrNull(e.target.value) }))}
                                        disabled={!canEdit}
                                        title={t('sheetInitiativeHint')}
                                    />
                                </div>
                                <div className="beyond-stat-box">
                                    <span className="beyond-field-label">{t('sheetSpeed')}</span>
                                    <input className="beyond-stat-value" type="number" value={form.speed ?? ''} onChange={setNum('speed')} disabled={!canEdit} />
                                </div>
                                <div className="beyond-inspiration">
                                    <span className="beyond-field-label">{t('sheetInspiration')}</span>
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
                                    <input className="beyond-hp-current" type="number" value={form.hpCurrent ?? ''} onChange={setNum('hpCurrent')} disabled={!canEdit} />
                                    <span className="beyond-hp-slash">/</span>
                                    <input className="beyond-hp-max" type="number" value={form.hpMax ?? ''} onChange={setNum('hpMax')} disabled={!canEdit} />
                                </div>
                                <div className="beyond-hp-sub">
                                    <span>{t('sheetHitPoints')}</span>
                                    <span>· {t('sheetTemp')}</span>
                                    <input className="beyond-hp-temp" type="number" value={form.hpTemp ?? ''} onChange={setNum('hpTemp')} disabled={!canEdit} />
                                </div>
                            </div>

                            <div className="beyond-hitdice-death" style={{ marginTop: '0.75rem' }}>
                                <div className="beyond-stat-box">
                                    <span className="beyond-field-label">{t('sheetHitDice')}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <input className="beyond-stat-value" style={{ width: '2.2rem', fontSize: '1.1rem' }} type="number" value={form.hitDiceTotal ?? ''} onChange={setNum('hitDiceTotal')} disabled={!canEdit} />
                                        <input className="beyond-input beyond-input-sm" style={{ width: '3rem' }} value={form.hitDiceType} onChange={set('hitDiceType')} disabled={!canEdit} />
                                    </div>
                                </div>
                                <div className="beyond-death-saves">
                                    <div className="beyond-death-row success">
                                        <span>{t('sheetSuccesses')}</span>
                                        <div className="beyond-death-dots">
                                            {[0, 1, 2].map((i) => (
                                                <button key={i} type="button" className={`beyond-death-dot ${i < form.deathSaveSuccesses ? 'filled' : ''}`} onClick={() => toggleDeathDot('success', i)} disabled={!canEdit} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="beyond-death-row failure">
                                        <span>{t('sheetFailures')}</span>
                                        <div className="beyond-death-dots">
                                            {[0, 1, 2].map((i) => (
                                                <button key={i} type="button" className={`beyond-death-dot ${i < form.deathSaveFailures ? 'filled' : ''}`} onClick={() => toggleDeathDot('failure', i)} disabled={!canEdit} />
                                            ))}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--bey-text-faint)' }}>{t('sheetDeathSaves')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attacks & spellcasting */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">{t('sheetAttacksSpellcasting')}</h2>
                            {form.attacks.length > 0 && (
                                <div className="beyond-attack-header">
                                    <span className="beyond-field-label">{t('sheetAttackName')}</span>
                                    <span className="beyond-field-label">{t('sheetAttackBonus')}</span>
                                    <span className="beyond-field-label">{t('sheetDamageType')}</span>
                                    <span />
                                </div>
                            )}
                            {form.attacks.map((atk, i) => (
                                <div key={i} className="beyond-attack-row">
                                    <input className="beyond-input beyond-input-sm" value={atk.name || ''} onChange={(e) => updateAttack(i, 'name', e.target.value)} disabled={!canEdit} />
                                    <input className="beyond-input beyond-input-sm" value={atk.attackBonus || ''} onChange={(e) => updateAttack(i, 'attackBonus', e.target.value)} disabled={!canEdit} placeholder="+5" />
                                    <input className="beyond-input beyond-input-sm" value={atk.damageType || ''} onChange={(e) => updateAttack(i, 'damageType', e.target.value)} disabled={!canEdit} placeholder="1d8+3" />
                                    {canEdit && <button type="button" className="beyond-remove-btn" onClick={() => removeAttack(i)}>✕</button>}
                                </div>
                            ))}
                            {form.attacks.length === 0 && !canEdit && <p className="beyond-readonly-empty">{t('sheetNoAttacks')}</p>}
                            {canEdit && <button type="button" className="beyond-add-btn" onClick={addAttack}>{t('sheetAddAttack')}</button>}

                            <div style={{ marginTop: '0.9rem' }}>
                                <span className="beyond-field-label">{t('sheetSpellNotes')}</span>
                                <textarea className="beyond-textarea" rows={4} value={form.spellNotes} onChange={set('spellNotes')} disabled={!canEdit} style={{ marginTop: '0.3rem' }} />
                            </div>
                        </div>

                        {/* Spell slots + optional spell-points variant */}
                        <div className="beyond-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 className="beyond-card-title" style={{ margin: 0, border: 0, padding: 0 }}>{t('sheetSpellSlots')}</h2>
                                {canEdit && <button type="button" className="beyond-add-btn" onClick={handleLongRest}>🌙 {t('sheetLongRest')}</button>}
                            </div>
                            <div className="beyond-spell-slots" style={{ marginTop: '0.6rem' }}>
                                {SPELL_SLOT_LEVELS.map((level) => {
                                    const slot = form.spellSlots[level] || {}
                                    return (
                                        <div key={level} className="beyond-spell-slot-row">
                                            <span className="beyond-spell-slot-level">{t('level')} {level}</span>
                                            <input
                                                className="beyond-input beyond-input-sm beyond-input-num"
                                                type="number" min="0"
                                                value={slot.current ?? ''}
                                                onChange={setSpellSlot(level, 'current')}
                                                disabled={!canEdit}
                                                title={t('sheetSlotsCurrent')}
                                            />
                                            <span className="beyond-hp-slash">/</span>
                                            <input
                                                className="beyond-input beyond-input-sm beyond-input-num"
                                                type="number" min="0"
                                                value={slot.max ?? ''}
                                                onChange={setSpellSlot(level, 'max')}
                                                disabled={!canEdit}
                                                title={t('sheetSlotsMax')}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="beyond-spell-slot-row" style={{ marginTop: '0.75rem', borderTop: '1px solid var(--bey-border)', paddingTop: '0.6rem' }}>
                                <span className="beyond-spell-slot-level">{t('sheetSpellPoints')}</span>
                                <input
                                    className="beyond-input beyond-input-sm beyond-input-num"
                                    type="number" min="0"
                                    value={form.spellPointsCurrent ?? ''}
                                    onChange={setNum('spellPointsCurrent')}
                                    disabled={!canEdit}
                                    title={t('sheetSlotsCurrent')}
                                />
                                <span className="beyond-hp-slash">/</span>
                                <input
                                    className="beyond-input beyond-input-sm beyond-input-num"
                                    type="number" min="0"
                                    value={form.spellPointsMax ?? ''}
                                    onChange={setNum('spellPointsMax')}
                                    disabled={!canEdit}
                                    title={t('sheetSlotsMax')}
                                />
                            </div>
                        </div>

                        {/* Spells known - cantrips picked freely, level 1-2 only added by a
                            successful research attempt (see Research.jsx). Hidden behind a
                            plain notice for classes with no spellcasting in the base rules
                            (Fighter, Barbarian, Rogue, Monk) - see CasterClasses on the
                            backend for the full reasoning. */}
                        <div className="beyond-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                <h2 className="beyond-card-title" style={{ margin: 0, border: 0, padding: 0 }}>{t('sheetSpellsKnown')}</h2>
                                {!isNonCaster(character.characterClass) && (
                                    <Link to={`/characters/${id}/research`} className="beyond-add-btn" style={{ marginTop: 0, textDecoration: 'none', display: 'inline-block' }}>{t('sheetGoResearch')}</Link>
                                )}
                            </div>
                            {isNonCaster(character.characterClass) ? (
                                <p className="beyond-readonly-empty">{t('sheetNonCasterNotice').replace('{class}', character.characterClass)}</p>
                            ) : (
                                <>
                                    {knownSpells.length === 0 && <p className="beyond-readonly-empty">{t('sheetSpellsEmpty')}</p>}
                                    {knownSpells.map((s) => (
                                        <div key={s.spellId} className="beyond-prof-row">
                                            <div className="beyond-prof-left">
                                                <span className="beyond-prof-name">{spellName(s, lang)}</span>
                                                <span className="beyond-prof-ability">(Lv {s.level})</span>
                                            </div>
                                            <span className="beyond-prof-bonus">{s.accuracyPercentage}%</span>
                                        </div>
                                    ))}
                                    {canEdit && (
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem' }}>
                                            <select className="beyond-select" value={cantripChoice} onChange={(e) => setCantripChoice(e.target.value)}>
                                                <option value="">{t('sheetChooseCantrip')}</option>
                                                {cantripCatalog
                                                    .filter((s) => !knownSpells.some((k) => k.spellId === s.id))
                                                    .filter((s) => isSpellEligible(character.characterClass, s))
                                                    .map((s) => <option key={s.id} value={s.id}>{spellName(s, lang)}</option>)}
                                            </select>
                                            <button type="button" className="beyond-add-btn" style={{ marginTop: 0 }} onClick={handleAddCantrip}>{t('sheetAddCantrip')}</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Material pouch - read-only from the player's side; only a DM
                            grant (Admin.jsx) or a research attempt changes these counts. */}
                        <div className="beyond-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                <h2 className="beyond-card-title" style={{ margin: 0, border: 0, padding: 0 }}>{t('sheetMaterialPouch')}</h2>
                                <Link to={`/characters/${id}/craft`} className="beyond-add-btn" style={{ marginTop: 0, textDecoration: 'none', display: 'inline-block' }}>{t('sheetCraftAspects')}</Link>
                            </div>
                            {Object.values(character.aspects || {}).every((n) => !n) && (
                                <p className="beyond-readonly-empty">{t('sheetPouchEmpty')}</p>
                            )}
                            {ASPECTS.filter((a) => (character.aspects?.[a.key] || 0) > 0).map((a) => (
                                <div key={a.key} className="beyond-prof-row">
                                    <div className="beyond-prof-left">
                                        <span className="beyond-prof-name">{aspectLabel(a.key)}</span>
                                        <span className="beyond-prof-ability">— {t(a.descKey)}</span>
                                    </div>
                                    <span className="beyond-prof-bonus">{character.aspects[a.key]}</span>
                                </div>
                            ))}
                        </div>

                        {/* Equipment */}
                        <div className="beyond-card">
                            <h2 className="beyond-card-title">{t('sheetEquipment')}</h2>
                            <textarea className="beyond-textarea" rows={4} value={form.equipment} onChange={set('equipment')} disabled={!canEdit} />
                            <div className="beyond-currency-row">
                                {['cp', 'sp', 'ep', 'gp', 'pp'].map((cur) => (
                                    <div key={cur} className="beyond-currency-field">
                                        <span className="beyond-field-label">{cur.toUpperCase()}</span>
                                        <input className="beyond-input beyond-input-num" type="number" min="0" value={form[cur] ?? ''} onChange={setNum(cur)} disabled={!canEdit} />
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '0.9rem' }}>
                                <span className="beyond-field-label">{t('sheetOtherProficiencies')}</span>
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
                        <h2 className="beyond-card-title">{t('sheetPersonality')}</h2>
                        <div className="beyond-grid-2">
                            <div className="beyond-field">
                                <span className="beyond-field-label">{t('sheetPersonalityTraits')}</span>
                                <textarea className="beyond-textarea" rows={4} value={form.personalityTraits} onChange={set('personalityTraits')} disabled={!canEdit} />
                            </div>
                            <div className="beyond-field">
                                <span className="beyond-field-label">{t('sheetIdeals')}</span>
                                <textarea className="beyond-textarea" rows={4} value={form.ideals} onChange={set('ideals')} disabled={!canEdit} />
                            </div>
                            <div className="beyond-field">
                                <span className="beyond-field-label">{t('sheetBonds')}</span>
                                <textarea className="beyond-textarea" rows={4} value={form.bonds} onChange={set('bonds')} disabled={!canEdit} />
                            </div>
                            <div className="beyond-field">
                                <span className="beyond-field-label">{t('sheetFlaws')}</span>
                                <textarea className="beyond-textarea" rows={4} value={form.flaws} onChange={set('flaws')} disabled={!canEdit} />
                            </div>
                        </div>
                    </div>

                    <div className="beyond-card">
                        <h2 className="beyond-card-title">{t('sheetFeaturesTraits')}</h2>
                        <textarea className="beyond-textarea" rows={5} value={form.featuresAndTraits} onChange={set('featuresAndTraits')} disabled={!canEdit} placeholder={t('sheetFeaturesPlaceholder')} />
                    </div>

                    <div className="beyond-card">
                        <h2 className="beyond-card-title">{t('sheetCharacterDetails')}</h2>
                        <div className="beyond-grid-6">
                            {[
                                ['age', 'sheetAge'], ['height', 'sheetHeight'], ['weight', 'sheetWeight'],
                                ['eyes', 'sheetEyes'], ['skin', 'sheetSkin'], ['hair', 'sheetHair'],
                            ].map(([key, labelKey]) => (
                                <div key={key} className="beyond-field">
                                    <span className="beyond-field-label">{t(labelKey)}</span>
                                    <input className="beyond-input" value={form[key]} onChange={set(key)} disabled={!canEdit} />
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '0.9rem' }}>
                            <span className="beyond-field-label">{t('sheetAppearance')}</span>
                            <textarea className="beyond-textarea" rows={3} value={form.appearance} onChange={set('appearance')} disabled={!canEdit} style={{ marginTop: '0.3rem' }} />
                        </div>
                        <div className="beyond-grid-2" style={{ marginTop: '0.9rem' }}>
                            <div className="beyond-field">
                                <span className="beyond-field-label">{t('sheetOrganization')}</span>
                                <input className="beyond-input" value={form.organizationName} onChange={set('organizationName')} disabled={!canEdit} />
                            </div>
                            <div className="beyond-field">
                                <span className="beyond-field-label">{t('sheetAlliesOrganizations')}</span>
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
                        <h2 className="beyond-card-title">{t('sheetCharacterBackstory')}</h2>
                        <textarea className="beyond-textarea" rows={12} value={form.backstory} onChange={set('backstory')} disabled={!canEdit} placeholder={t('backstoryPlaceholder')} />
                    </div>
                    <div className="beyond-card">
                        <h2 className="beyond-card-title">{t('sheetAdditionalFeatures')}</h2>
                        <textarea className="beyond-textarea" rows={5} value={form.additionalFeatures} onChange={set('additionalFeatures')} disabled={!canEdit} />
                    </div>
                    <div className="beyond-card">
                        <h2 className="beyond-card-title">{t('sheetTreasure')}</h2>
                        <textarea className="beyond-textarea" rows={4} value={form.treasure} onChange={set('treasure')} disabled={!canEdit} />
                    </div>
                </div>
            )}
        </div>
    )
}
