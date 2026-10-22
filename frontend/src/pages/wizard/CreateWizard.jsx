import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { Button, Dossier, Loader, PageHeader, Stamp } from '../../components/ui'
import ErrorScreen from '../../components/errors/ErrorScreen'
import { ABILITIES, SKILLS, className } from '../../constants/dnd-ru'
import { spellName } from '../../constants/spellText'
import { ABILITY_KEYS, abilityMod, formatMod, startingHp } from '../../lib/dnd-rules'
import { useRefData } from '../../lib/refData'
import {
    AbilitiesStep, AdmissionStep, BackgroundStep, CantripsStep, ClassStep, GearStep, IdentityStep,
    RaceStep, SkillsStep,
} from './steps'
import {
    CUSTOM, abilitiesValid, cantripLimit, clearDraft, finalScores, loadDraft, lockedSkills, saveDraft,
    selectedBackground, selectedClass, selectedRace, toPayload,
} from './wizardModel'
import '../../styles/sheet.css'
import '../../styles/wizard.css'

// Steps in order. `skip` hides a step (cantrips for non-casters);
// `ready` decides whether "Далее" is allowed.
const STEPS = [
    { key: 'race', title: 'Раса', Component: RaceStep,
        ready: (d, x) => {
            if (d.raceKey === CUSTOM) {
                const total = Object.values(d.customRaceBonuses).reduce((a, b) => a + (b || 0), 0)
                return d.customRaceName.trim() !== '' && total <= 3
            }
            const race = selectedRace(d, x.races)
            return !!race && (!race.bonusChoice || d.raceBonusChoice.length === race.bonusChoice.count)
        } },
    { key: 'class', title: 'Класс', Component: ClassStep, ready: (d, x) => !!selectedClass(d, x.classes) },
    { key: 'background', title: 'Предыстория', Component: BackgroundStep,
        ready: (d, x) => (d.backgroundKey === CUSTOM
            ? d.customBackgroundName.trim() !== '' && d.customBackgroundSkills.length === 2
            : !!selectedBackground(d, x.backgrounds)) },
    { key: 'abilities', title: 'Характеристики', Component: AbilitiesStep, ready: (d) => abilitiesValid(d) },
    { key: 'skills', title: 'Навыки и владения', Component: SkillsStep,
        ready: (d, x) => {
            const cls = selectedClass(d, x.classes)
            const race = selectedRace(d, x.races)
            const raceOk = !race?.skillChoice || d.raceSkills.length === race.skillChoice.count
            return !!cls && d.classSkills.length === cls.skillChoice.count && raceOk
        } },
    { key: 'cantrips', title: 'Заговоры', Component: CantripsStep,
        skip: (d, x) => cantripLimit(d, x.classes) === 0,
        ready: (d, x) => d.cantrips.length === cantripLimit(d, x.classes) },
    { key: 'gear', title: 'Снаряжение', Component: GearStep, ready: () => true },
    { key: 'identity', title: 'Имя и портрет', Component: IdentityStep, ready: (d) => d.name.trim() !== '' },
    { key: 'admission', title: 'Заявка на допуск', Component: AdmissionStep, ready: (d) => d.startLevel >= 1 },
]

export default function CreateWizard() {
    const navigate = useNavigate()
    const [races, racesError] = useRefData('races')
    const [classes, classesError] = useRefData('classes')
    const [backgrounds, bgError] = useRefData('backgrounds')
    const [runes, runesError] = useRefData('runes')
    const [spells, setSpells] = useState(null)
    const [draft, setDraft] = useState(loadDraft)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [sent, setSent] = useState(null) // created character

    useEffect(() => {
        api.get('/api/spells').then((res) => setSpells(Array.isArray(res.data) ? res.data : [])).catch(() => setSpells([]))
    }, [])

    useEffect(() => { if (!sent) saveDraft(draft) }, [draft, sent])

    const data = useMemo(() => ({ races, classes, backgrounds, runes, spells: spells || [] }), [races, classes, backgrounds, runes, spells])
    const loaded = races && classes && backgrounds && runes && spells
    const loadError = racesError || classesError || bgError || runesError

    if (loadError) return <ErrorScreen code={loadError.response ? 500 : 'offline'} />
    if (!loaded) return <div className="parchment-page"><Loader /></div>

    const visible = STEPS.filter((s) => !s.skip?.(draft, data))
    const index = Math.min(draft.step, visible.length - 1)
    const step = visible[index]
    const ready = step.ready(draft, data)
    const isLast = index === visible.length - 1

    const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
    const goTo = (i) => set({ step: Math.max(0, Math.min(visible.length - 1, i)) })

    // Every step before this one must be complete to jump to it.
    const reachable = (i) => visible.slice(0, i).every((s) => s.ready(draft, data))

    const submit = async () => {
        setSubmitting(true)
        setSubmitError('')
        try {
            const res = await api.post('/api/characters', toPayload(draft))
            clearDraft()
            setSent(res.data)
            setTimeout(() => navigate(`/characters/${res.data.id}`), 1800)
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Допуск отклонён. Обратитесь в приёмную.')
        } finally {
            setSubmitting(false)
        }
    }

    const reset = () => { clearDraft(); setDraft(loadDraft()) }

    if (sent) {
        return (
            <div className="parchment-page">
                <Dossier className="wiz-sent">
                    <Stamp kind="pending" />
                    <p className="wiz-sent-text">Заявка на личное дело «{sent.name}» подана. ГМ рассмотрит её.</p>
                </Dossier>
            </div>
        )
    }

    const StepComponent = step.Component
    return (
        <div className="parchment-page">
            <PageHeader
                title="Заведение личного дела"
                subtitle={`Шаг ${index + 1} из ${visible.length}: ${step.title}`}
                back="/characters"
                actions={<Button variant="ghost" onClick={reset}>Начать заново</Button>}
            />
            <div className="wiz-layout">
                <nav className="wiz-steps" aria-label="Шаги">
                    <ol>
                        {visible.map((s, i) => (
                            <li key={s.key}>
                                <button
                                    type="button"
                                    className={`wiz-step ${i === index ? 'is-current' : ''} ${i < index && s.ready(draft, data) ? 'is-done' : ''}`}
                                    aria-current={i === index ? 'step' : undefined}
                                    disabled={!reachable(i)}
                                    onClick={() => goTo(i)}
                                >
                                    <span className="wiz-step-no">{i + 1}</span>
                                    <span>{s.title}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </nav>

                <section className="wiz-main" aria-labelledby="wiz-step-title">
                    <h2 id="wiz-step-title" className="sheet-section-title">{step.title}</h2>
                    <StepComponent draft={draft} set={set} data={data} />
                    {isLast && <Summary draft={draft} data={data} full />}
                    {submitError && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {submitError}</p>}
                    <div className="wiz-nav">
                        <Button variant="secondary" onClick={() => goTo(index - 1)} disabled={index === 0}>← Назад</Button>
                        {isLast ? (
                            <Button onClick={submit} disabled={!visible.every((s) => s.ready(draft, data)) || submitting}>Подать заявку</Button>
                        ) : (
                            <Button onClick={() => goTo(index + 1)} disabled={!ready}>Далее →</Button>
                        )}
                    </div>
                </section>

                <aside className="wiz-summary" aria-label="Сводка дела">
                    <Summary draft={draft} data={data} />
                </aside>
            </div>
        </div>
    )
}

// "Сводка дела": what is chosen so far and the final ability scores.
function Summary({ draft, data, full = false }) {
    const race = draft.raceKey === CUSTOM ? draft.customRaceName : selectedRace(draft, data.races)?.nameRu
    const cls = selectedClass(draft, data.classes)
    const bg = draft.backgroundKey === CUSTOM ? draft.customBackgroundName : selectedBackground(draft, data.backgrounds)?.nameRu
    const finals = finalScores(draft, data.races)
    const skills = [...lockedSkills(draft, data.races, data.backgrounds), ...draft.raceSkills, ...draft.classSkills]
    const hp = cls && finals ? startingHp(cls.hitDie, abilityMod(finals.CON), draft.startLevel) : null
    const cantrips = draft.cantrips.map((id) => spellName(data.spells.find((s) => s.id === id) || { name: id }))

    return (
        <Dossier tab="Сводка дела" className={`wiz-summary-card ${full ? 'is-full' : ''}`}>
            <dl className="wiz-dl">
                <dt>Имя</dt><dd>{draft.name || '—'}</dd>
                <dt>Раса</dt><dd>{race || '—'}</dd>
                <dt>Класс</dt><dd>{cls ? className(cls.key) : '—'}</dd>
                <dt>Предыстория</dt><dd>{bg || '—'}</dd>
                {hp != null && <><dt>Хиты</dt><dd>{hp}</dd></>}
                {full && <><dt>Руна, уровень</dt><dd>{data.runes.find((r) => r.key === draft.runeTier)?.nameRu}, {draft.startLevel} уровень</dd></>}
            </dl>
            {finals && (
                <div className="wiz-sum-abilities">
                    {ABILITY_KEYS.map((k) => (
                        <span key={k} className="wiz-sum-ability">
                            <span className="ability-short">{ABILITIES[k].short}</span>
                            <strong>{finals[k]}</strong>
                            <span className="prof-ability">{formatMod(abilityMod(finals[k]))}</span>
                        </span>
                    ))}
                </div>
            )}
            {skills.length > 0 && <p className="wiz-sum-line"><span className="sheet-label">Навыки</span> {[...new Set(skills)].map((s) => SKILLS[s]?.name || s).join(', ')}</p>}
            {cantrips.length > 0 && <p className="wiz-sum-line"><span className="sheet-label">Заговоры</span> {cantrips.join(', ')}</p>}
        </Dossier>
    )
}
