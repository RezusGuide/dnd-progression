import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { classifyApiError } from '../../api/apiErrors'
import { proficiencyBonus } from '../../lib/dnd-rules'

function safeParseJson(raw, fallback) {
    if (!raw) return fallback
    try {
        return JSON.parse(raw)
    } catch {
        return fallback
    }
}

// Every character fetched from the API may have nulls on any sheet field -
// either it predates this sheet, or a field was never filled in. This
// coalesces those into safe, editable defaults once, on load.
export function hydrate(c) {
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
        hitDiceUsed: c.hitDiceUsed ?? 0,
        deathSaveSuccesses: c.deathSaveSuccesses ?? 0,
        deathSaveFailures: c.deathSaveFailures ?? 0,
        inspiration: !!c.inspiration,

        attacks: c.attacks && c.attacks.length ? c.attacks : [],
        spellNotes: c.spellNotes || '',
        // Stored as a JSON string (Character#spellSlotsJson); edited as an
        // object keyed "1".."9" and sent back as that object
        // (CharacterSheetRequest#spellSlots is a Map).
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

// Loading, permissions and debounced autosave for one character sheet.
// API calls are the same as the old CharacterSheet.jsx: GET the character,
// PUT the whole sheet 700 ms after the last change.
export default function useCharacterSheet(id) {
    const navigate = useNavigate()
    const { user, hasSection } = useAuth()

    const [character, setCharacter] = useState(null)
    const [form, setForm] = useState(null)
    const [loadError, setLoadError] = useState(null)
    const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
    const [knownSpells, setKnownSpells] = useState([])
    const [catalog, setCatalog] = useState([])
    const [requests, setRequests] = useState([])

    // D&D is public to view; only the character's creator or the GM can
    // edit it (CharacterService#updateSheet enforces the same server-side).
    const canEdit = !!user && !!character && (hasSection('*') || character.ownerId === user.userId)

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
            .catch((err) => {
                if (cancelled) return
                // Unknown id -> "no such document"; server down / offline ->
                // the matching error screen; anything else -> back to the list.
                const kind = err.response?.status === 404 ? 404 : classifyApiError(err)
                if (kind) setLoadError(kind)
                else navigate('/characters')
            })
        return () => { cancelled = true }
    }, [id, navigate])

    // Admission requests for this character (owner / GM only; [] otherwise).
    const refreshRequests = useCallback(() => {
        api.get(`/api/characters/${id}/requests`).then((res) => setRequests(Array.isArray(res.data) ? res.data : [])).catch(() => setRequests([]))
    }, [id])

    useEffect(() => { refreshRequests() }, [refreshRequests])

    // Returns an error message, or null on success.
    const requestLevelUp = useCallback(async (playerComment) => {
        try {
            await api.post(`/api/characters/${id}/level-up-request`, { playerComment })
            refreshRequests()
            return null
        } catch (err) {
            return err.response?.data?.message || 'Допуск отклонён. Обратитесь в приёмную.'
        }
    }, [id, refreshRequests])

    const refreshKnownSpells = useCallback(() => {
        api.get(`/api/characters/${id}/known-spells`).then((res) => setKnownSpells(res.data)).catch(() => {})
    }, [id])

    useEffect(() => {
        refreshKnownSpells()
        // The full catalog also carries casting time / range / components /
        // duration, which known-spells doesn't - joined by id in MagicTab.
        api.get('/api/spells').then((res) => setCatalog(Array.isArray(res.data) ? res.data : [])).catch(() => setCatalog([]))
    }, [refreshKnownSpells])

    // Autosave. skipNextSave swallows the setForm right after a load. The
    // proficiency bonus is always derived from the level and written back,
    // so the stored field never disagrees with what the sheet shows.
    useEffect(() => {
        if (!form || !canEdit) return
        if (skipNextSave.current) { skipNextSave.current = false; return }
        setSaveState('saving')
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(async () => {
            try {
                const res = await api.put(`/api/characters/${id}/sheet`, {
                    ...form,
                    proficiencyBonus: proficiencyBonus(form.level),
                })
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

    // Merge a partial update into the sheet (ignored when read-only).
    const update = useCallback((patch) => {
        if (!canEdit) return
        setForm((f) => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }))
    }, [canEdit])

    const addCantrip = useCallback(async (spellId) => {
        if (!spellId) return
        try {
            await api.post(`/api/characters/${id}/cantrips/${spellId}`)
            refreshKnownSpells()
        } catch (err) {
            console.error(err)
        }
    }, [id, refreshKnownSpells])

    return { character, form, update, canEdit, saveState, loadError, knownSpells, catalog, addCantrip, requests, requestLevelUp }
}
