import { useState } from 'react'
import { Button, Dossier, Field, Hint } from '../../components/ui'
import RuneBadge from '../../components/brand/RuneBadge'
import SourceCode from '../../components/SourceCode'
import { ABILITIES, ALIGNMENTS, SKILLS } from '../../constants/dnd-ru'
import { spellDescription, spellName } from '../../constants/spellText'
import {
    ABILITY_KEYS, POINT_BUY_BUDGET, STANDARD_ARRAY, abilityMod, formatMod, isValidFlexibleBonuses, pointBuyCost,
    pointBuySpent, roll4d6,
} from '../../lib/dnd-rules'
import { resizeImageFile } from '../../lib/image'
import {
    CUSTOM, MANUAL_SKILL_LIMIT, baseScores, cantripLimit, customRaceRow, finalScores, isLocked, isManualClass,
    isPickable, isSrdRace, lockedSkills, raceBonuses, selectedClass, selectedRace, usesFlexible,
} from './wizardModel'

const bonusText = (bonuses) => Object.entries(bonuses || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${ABILITIES[k].short} ${formatMod(v)}`)
    .join(', ')

const SKILL_KEYS = Object.keys(SKILLS).sort((a, b) => SKILLS[a].name.localeCompare(SKILLS[b].name, 'ru'))

// A selectable card: the whole card is one button with aria-pressed.
function ChoiceCard({ selected, onSelect, title, children }) {
    return (
        <button type="button" className={`wiz-card ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={onSelect}>
            <span className="wiz-card-title">{title}</span>
            {children}
        </button>
    )
}

// A race or class the campaign will open later: visible, not selectable,
// and without the condition (players never see it).
function LockedCard({ title }) {
    return (
        <div className="wiz-card is-locked" aria-disabled="true">
            <span className="wiz-card-title"><span aria-hidden="true">🔒 </span>{title}</span>
            <span className="wiz-card-meta">Пока закрыто. Откроется по ходу кампании.</span>
        </div>
    )
}

// Search box over the cards; matches the Russian or the English name.
function useSearch() {
    const [query, setQuery] = useState('')
    const q = query.trim().toLowerCase()
    const match = (entry) => !q || entry.nameRu.toLowerCase().includes(q) || entry.key.toLowerCase().includes(q)
    return [query, setQuery, match]
}

function SearchField({ value, onChange, label }) {
    return (
        <div className="wiz-search">
            <Field label={label} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Начните вводить название" />
        </div>
    )
}

// Flexible origin: +2/+1 or +1/+1/+1 to any abilities.
function FlexibleBonuses({ draft, set }) {
    const valid = isValidFlexibleBonuses(draft.flexibleBonuses)
    return (
        <>
            <p className="sheet-label" style={{ marginTop: '0.75rem' }}>Гибкие бонусы: +2 и +1 или +1, +1 и +1 к разным характеристикам</p>
            <div className="wiz-bonus-grid">
                {ABILITY_KEYS.map((k) => (
                    <label key={k} className="wiz-bonus">
                        <span>{ABILITIES[k].short}</span>
                        <select className="sheet-input" value={draft.flexibleBonuses[k] || 0}
                            onChange={(e) => set({ flexibleBonuses: { ...draft.flexibleBonuses, [k]: Number(e.target.value) } })}>
                            {[0, 1, 2].map((v) => <option key={v} value={v}>{formatMod(v)}</option>)}
                        </select>
                    </label>
                ))}
            </div>
            {!valid && <p className="wiz-help" role="status">Сейчас: {bonusText(draft.flexibleBonuses) || 'ничего не выбрано'}.</p>}
        </>
    )
}

function toggle(list, value, limit) {
    if (list.includes(value)) return list.filter((v) => v !== value)
    if (limit != null && list.length >= limit) return list
    return [...list, value]
}

// ── 1. Race ──
export function RaceStep({ draft, set, data }) {
    const [query, setQuery, match] = useSearch()
    const race = selectedRace(draft, data.races)
    const custom = draft.raceKey === CUSTOM
    const customTotal = Object.values(draft.customRaceBonuses).reduce((a, b) => a + (b || 0), 0)
    // "Своя раса" follows its own row's status (hidden unless the GM allows it).
    const customRow = customRaceRow(data.races)
    const listed = data.races.filter((r) => r.key !== CUSTOM)
    const open = listed.filter((r) => isPickable(r) && match(r))
    const locked = listed.filter((r) => isLocked(r) && match(r))
    const customShown = match({ key: 'custom', nameRu: 'Другое' }) && (isPickable(customRow) || isLocked(customRow))
    const flexible = usesFlexible(draft, race)
    const pick = (key) => set({ raceKey: key, raceBonusChoice: [], raceSkills: [], flexible: false })
    return (
        <>
            <SearchField label="Поиск расы" value={query} onChange={setQuery} />
            <div className="wiz-grid">
                {open.map((r) => (
                    <ChoiceCard key={r.key} title={r.nameRu} selected={draft.raceKey === r.key} onSelect={() => pick(r.key)}>
                        {isSrdRace(r) ? (
                            <>
                                <span className="wiz-card-meta">{bonusText(r.bonuses)}{r.bonusChoice ? ', +1 к двум на выбор' : ''} · скорость {r.speed} фт</span>
                                <ul className="wiz-card-list">{r.traits.slice(0, 3).map((t) => <li key={t}>{t}</li>)}</ul>
                            </>
                        ) : (
                            <span className="wiz-card-meta">Гибкие бонусы · черты по книге · <SourceCode code={r.source} /></span>
                        )}
                    </ChoiceCard>
                ))}
                {locked.map((r) => <LockedCard key={r.key} title={r.nameRu} />)}
                {customShown && (isPickable(customRow) ? (
                    <ChoiceCard title="Другое" selected={custom} onSelect={() => pick(CUSTOM)}>
                        <span className="wiz-card-meta">Своя раса: название и бонусы вручную.</span>
                    </ChoiceCard>
                ) : <LockedCard title="Другое" />)}
            </div>
            {open.length + locked.length === 0 && !customShown && <p className="wiz-help">Ничего не нашлось.</p>}

            {race && isSrdRace(race) && (
                <label className="wiz-skill wiz-flex-toggle">
                    <input type="checkbox" checked={draft.flexible}
                        onChange={(e) => set({ flexible: e.target.checked, raceBonusChoice: [] })} />
                    <span>Гибкие бонусы: +2 и +1 или +1, +1 и +1 вместо бонусов расы</span>
                </label>
            )}

            {race?.bonusChoice && !flexible && (
                <Dossier className="wiz-sub">
                    <p className="sheet-label">+1 к двум характеристикам на выбор (кроме Харизмы): {draft.raceBonusChoice.length}/2</p>
                    <div className="wiz-chips">
                        {ABILITY_KEYS.filter((k) => !race.bonusChoice.exclude.includes(k)).map((k) => (
                            <button key={k} type="button" className={`wiz-chip ${draft.raceBonusChoice.includes(k) ? 'is-on' : ''}`}
                                aria-pressed={draft.raceBonusChoice.includes(k)}
                                onClick={() => set({ raceBonusChoice: toggle(draft.raceBonusChoice, k, 2) })}>
                                {ABILITIES[k].full}
                            </button>
                        ))}
                    </div>
                </Dossier>
            )}

            {race && flexible && isSrdRace(race) && (
                <Dossier className="wiz-sub"><FlexibleBonuses draft={draft} set={set} /></Dossier>
            )}

            {race && !isSrdRace(race) && (
                <Dossier className="wiz-sub">
                    <FlexibleBonuses draft={draft} set={set} />
                    <div className="wiz-race-fields">
                        <Field label="Скорость, фт" type="number" min={5} max={60} step={5} value={draft.raceSpeed}
                            onChange={(e) => set({ raceSpeed: Number(e.target.value) || 30 })} />
                        <Field label="Размер" as="select" value={draft.raceSize} onChange={(e) => set({ raceSize: e.target.value })}>
                            <option value="Средний">Средний</option>
                            <option value="Маленький">Маленький</option>
                        </Field>
                    </div>
                    <Field label="Черты расы" as="textarea" rows={4} value={draft.raceTraits}
                        hint={<>См. <SourceCode code={race.source} />. Перепишите черты из книги, они попадут в «Умения и особенности».</>}
                        onChange={(e) => set({ raceTraits: e.target.value })} />
                </Dossier>
            )}

            {custom && isPickable(customRow) && (
                <Dossier className="wiz-sub">
                    <Field label="Название расы" value={draft.customRaceName} onChange={(e) => set({ customRaceName: e.target.value })} />
                    <p className="sheet-label" style={{ marginTop: '0.75rem' }}>Бонусы (обычно +2 и +1, в сумме не больше +3): {customTotal}/3</p>
                    <div className="wiz-bonus-grid">
                        {ABILITY_KEYS.map((k) => (
                            <label key={k} className="wiz-bonus">
                                <span>{ABILITIES[k].short}</span>
                                <select className="sheet-input" value={draft.customRaceBonuses[k] || 0}
                                    onChange={(e) => set({ customRaceBonuses: { ...draft.customRaceBonuses, [k]: Number(e.target.value) } })}>
                                    {[0, 1, 2].map((v) => <option key={v} value={v}>{formatMod(v)}</option>)}
                                </select>
                            </label>
                        ))}
                    </div>
                </Dossier>
            )}
        </>
    )
}

// ── 2. Class ──
export function ClassStep({ draft, set, data }) {
    const [query, setQuery, match] = useSearch()
    const cls = selectedClass(draft, data.classes)
    const open = data.classes.filter((c) => isPickable(c, data.gm) && match(c))
    const locked = data.classes.filter((c) => isLocked(c) && match(c))
    return (
        <>
            <Hint>Не знаете, кого выбрать? Воин прост в освоении, волшебник — для любителей читать.</Hint>
            <SearchField label="Поиск класса" value={query} onChange={setQuery} />
            <div className="wiz-grid">
                {open.map((c) => (
                    <ChoiceCard key={c.key} title={c.nameRu} selected={draft.classKey === c.key}
                        onSelect={() => set({ classKey: c.key, classSkills: [], cantrips: [], equipmentOption: 0 })}>
                        {c.status === 'npc_only' && <span className="wiz-card-tag">Только для НИП</span>}
                        {isManualClass(c) ? (
                            <span className="wiz-card-meta">Механика по книге · <SourceCode code={c.source} /></span>
                        ) : (
                            <>
                                <span className="wiz-card-meta">
                                    Кость хитов к{c.hitDie} · {c.spellAbility ? `заклинатель (${ABILITIES[c.spellAbility].short})` : 'без магии'}
                                </span>
                                <span className="wiz-card-meta">Спасброски: {(c.saves || []).map((s) => ABILITIES[s].short).join(', ')}</span>
                            </>
                        )}
                    </ChoiceCard>
                ))}
                {locked.map((c) => <LockedCard key={c.key} title={c.nameRu} />)}
            </div>
            {open.length + locked.length === 0 && <p className="wiz-help">Ничего не нашлось.</p>}

            {isManualClass(cls) && (
                <Dossier className="wiz-sub">
                    <p className="wiz-help">Заполните по книге, ГМ проверит при одобрении. См. <SourceCode code={cls.source} />.</p>
                    <div className="wiz-race-fields">
                        <Field label="Кость хитов" as="select" value={draft.customHitDie ?? ''}
                            onChange={(e) => set({ customHitDie: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">—</option>
                            {[6, 8, 10, 12].map((d) => <option key={d} value={d}>к{d}</option>)}
                        </Field>
                        <Field label="Базовая характеристика заклинаний" as="select" value={draft.customSpellAbility}
                            onChange={(e) => set({ customSpellAbility: e.target.value, cantrips: e.target.value ? draft.cantrips : [] })}>
                            <option value="">без магии</option>
                            {ABILITY_KEYS.map((k) => <option key={k} value={k}>{ABILITIES[k].full}</option>)}
                        </Field>
                    </div>
                    <p className="sheet-label" style={{ marginTop: '0.75rem' }}>Спасброски класса: {draft.customSaves.length}/2</p>
                    <div className="wiz-chips">
                        {ABILITY_KEYS.map((k) => (
                            <button key={k} type="button" className={`wiz-chip ${draft.customSaves.includes(k) ? 'is-on' : ''}`}
                                aria-pressed={draft.customSaves.includes(k)}
                                onClick={() => set({ customSaves: toggle(draft.customSaves, k, 2) })}>
                                {ABILITIES[k].full}
                            </button>
                        ))}
                    </div>
                    <Field label="Владения класса" as="textarea" rows={2} value={draft.customProficiencies}
                        onChange={(e) => set({ customProficiencies: e.target.value })} />
                </Dossier>
            )}
        </>
    )
}

// ── 3. Background ──
export function BackgroundStep({ draft, set, data }) {
    const custom = draft.backgroundKey === CUSTOM
    return (
        <>
            <div className="wiz-grid">
                {data.backgrounds.map((b) => (
                    <ChoiceCard key={b.key} title={b.nameRu} selected={draft.backgroundKey === b.key}
                        onSelect={() => set({ backgroundKey: b.key, classSkills: draft.classSkills.filter((s) => !b.skills.includes(s)) })}>
                        <span className="wiz-card-meta">{b.skills.map((s) => SKILLS[s].name).join(', ')}</span>
                        <span className="wiz-card-desc">{b.description}</span>
                    </ChoiceCard>
                ))}
                <ChoiceCard title="Своя" selected={custom} onSelect={() => set({ backgroundKey: CUSTOM })}>
                    <span className="wiz-card-meta">Название, два навыка, владения и языки.</span>
                </ChoiceCard>
            </div>
            {custom && (
                <Dossier className="wiz-sub">
                    <Field label="Название предыстории" value={draft.customBackgroundName} onChange={(e) => set({ customBackgroundName: e.target.value })} />
                    <p className="sheet-label" style={{ marginTop: '0.75rem' }}>Два навыка: {draft.customBackgroundSkills.length}/2</p>
                    <div className="wiz-chips">
                        {SKILL_KEYS.map((k) => (
                            <button key={k} type="button" className={`wiz-chip ${draft.customBackgroundSkills.includes(k) ? 'is-on' : ''}`}
                                aria-pressed={draft.customBackgroundSkills.includes(k)}
                                onClick={() => set({
                                    customBackgroundSkills: toggle(draft.customBackgroundSkills, k, 2),
                                    classSkills: draft.classSkills.filter((s) => s !== k),
                                })}>
                                {SKILLS[k].name}
                            </button>
                        ))}
                    </div>
                    <Field label="Владения и языки" as="textarea" rows={2} value={draft.customBackgroundProficiencies}
                        onChange={(e) => set({ customBackgroundProficiencies: e.target.value })} />
                </Dossier>
            )}
        </>
    )
}

// ── 4. Abilities ──
const METHODS = [['STANDARD', 'Стандартный набор'], ['POINT_BUY', 'Покупка очков'], ['ROLL', 'Броски']]

export function AbilitiesStep({ draft, set, data }) {
    const bonuses = raceBonuses(draft, data.races)
    const finals = finalScores(draft, data.races)
    const used = Object.values(draft.standard).filter((v) => v != null)
    const spent = pointBuySpent(draft.pointBuy)
    const anyRolled = ABILITY_KEYS.some((k) => draft.rolls[k])

    return (
        <>
            <div className="sheet-tabs wiz-method-tabs" role="tablist" aria-label="Способ распределения">
                {METHODS.map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={draft.abilityMethod === key}
                        className={`sheet-tab ${draft.abilityMethod === key ? 'is-active' : ''}`}
                        onClick={() => set({ abilityMethod: key })}>{label}</button>
                ))}
            </div>

            {draft.abilityMethod === 'STANDARD' && (
                <p className="wiz-help">Раздайте 15, 14, 13, 12, 10 и 8 — каждое значение один раз.</p>
            )}
            {draft.abilityMethod === 'POINT_BUY' && (
                <p className="wiz-help" role="status">Осталось очков: <strong>{spent === null ? '—' : POINT_BUY_BUDGET - spent}</strong> из {POINT_BUY_BUDGET}. Значения от 8 до 15.</p>
            )}
            {draft.abilityMethod === 'ROLL' && (
                <p className="wiz-help">Для каждой характеристики бросьте 4к6, меньший кубик отбрасывается. Перебросить можно только всё сразу.</p>
            )}

            <div className="wiz-abilities">
                {ABILITY_KEYS.map((k) => {
                    const final = finals?.[k] ?? baseScores(draft)[k]
                    return (
                        <div key={k} className="wiz-ability">
                            <span className="ability-short">{ABILITIES[k].full}</span>
                            {draft.abilityMethod === 'STANDARD' && (
                                <select className="sheet-input" aria-label={ABILITIES[k].full} value={draft.standard[k] ?? ''}
                                    onChange={(e) => set({ standard: { ...draft.standard, [k]: e.target.value === '' ? null : Number(e.target.value) } })}>
                                    <option value="">—</option>
                                    {STANDARD_ARRAY.map((v) => (
                                        <option key={v} value={v} disabled={used.includes(v) && draft.standard[k] !== v}>{v}</option>
                                    ))}
                                </select>
                            )}
                            {draft.abilityMethod === 'POINT_BUY' && (
                                <span className="coin-controls">
                                    <button type="button" className="combat-step" aria-label={`${ABILITIES[k].full}: минус 1`}
                                        disabled={draft.pointBuy[k] <= 8}
                                        onClick={() => set({ pointBuy: { ...draft.pointBuy, [k]: draft.pointBuy[k] - 1 } })}>−</button>
                                    <span className="combat-big">{draft.pointBuy[k]}</span>
                                    <button type="button" className="combat-step" aria-label={`${ABILITIES[k].full}: плюс 1`}
                                        disabled={draft.pointBuy[k] >= 15 || spent === null
                                            || spent - pointBuyCost(draft.pointBuy[k]) + pointBuyCost(draft.pointBuy[k] + 1) > POINT_BUY_BUDGET}
                                        onClick={() => set({ pointBuy: { ...draft.pointBuy, [k]: draft.pointBuy[k] + 1 } })}>+</button>
                                </span>
                            )}
                            {draft.abilityMethod === 'ROLL' && (
                                draft.rolls[k] ? (
                                    <span className="wiz-dice" aria-label={`Выпало ${draft.rolls[k].dice.join(', ')}, итог ${draft.rolls[k].total}`}>
                                        {draft.rolls[k].dice.map((d, i) => (
                                            <span key={i} className={`wiz-die ${i === draft.rolls[k].dropIndex ? 'is-dropped' : ''}`}>{d}</span>
                                        ))}
                                        <strong className="combat-big"> = {draft.rolls[k].total}</strong>
                                    </span>
                                ) : (
                                    <Button variant="secondary" onClick={() => set({ rolls: { ...draft.rolls, [k]: roll4d6() } })}>Бросить 4к6</Button>
                                )
                            )}
                            <span className="wiz-ability-final">
                                {bonuses[k] ? <span className="wiz-bonus-tag">раса {formatMod(bonuses[k])}</span> : null}
                                {final != null && <>итог <strong>{final}</strong> ({formatMod(abilityMod(final))})</>}
                            </span>
                        </div>
                    )
                })}
            </div>

            {draft.abilityMethod === 'ROLL' && anyRolled && (
                <Button variant="ghost" onClick={() => set({ rolls: Object.fromEntries(ABILITY_KEYS.map((k) => [k, null])) })}>Сбросить все броски</Button>
            )}
        </>
    )
}

// ── 5. Skills ──
export function SkillsStep({ draft, set, data }) {
    const cls = selectedClass(draft, data.classes)
    const race = data.races.find((r) => r.key === draft.raceKey)
    const locked = lockedSkills(draft, data.races, data.backgrounds)
    const manual = isManualClass(cls)
    const choice = manual ? { count: MANUAL_SKILL_LIMIT, from: 'ANY' } : cls?.skillChoice
    const from = choice?.from === 'ANY' ? SKILL_KEYS : SKILL_KEYS.filter((k) => choice?.from.includes(k))
    const raceChoice = race?.skillChoice

    return (
        <>
            <p className="wiz-help">
                Навыки от предыстории и расы уже отмечены. {manual
                    ? `Отметьте навыки класса по книге (до ${choice.count}): ${draft.classSkills.length}.`
                    : `Выберите навыки класса: ${draft.classSkills.length}/${choice?.count ?? 0}.`}
            </p>
            <ul className="wiz-skill-list">
                {SKILL_KEYS.map((k) => {
                    const isLocked = locked.has(k)
                    const isClass = draft.classSkills.includes(k)
                    const available = from.includes(k) && !isLocked
                    return (
                        <li key={k}>
                            <label className={`wiz-skill ${isLocked ? 'is-locked' : ''} ${!available && !isLocked ? 'is-off' : ''}`}>
                                <input type="checkbox" checked={isLocked || isClass} disabled={isLocked || !available || (!isClass && draft.classSkills.length >= (choice?.count ?? 0))}
                                    onChange={() => set({ classSkills: toggle(draft.classSkills, k, choice?.count) })} />
                                <span>{SKILLS[k].name}</span>
                                <span className="prof-ability">({ABILITIES[SKILLS[k].ability].short})</span>
                                {isLocked && <span className="wiz-skill-src">уже есть</span>}
                            </label>
                        </li>
                    )
                })}
            </ul>

            {raceChoice && (
                <Dossier className="wiz-sub">
                    <p className="sheet-label">Навыки от расы ({race.nameRu}): {draft.raceSkills.length}/{raceChoice.count}</p>
                    <div className="wiz-chips">
                        {SKILL_KEYS.filter((k) => !locked.has(k) && !draft.classSkills.includes(k)).map((k) => (
                            <button key={k} type="button" className={`wiz-chip ${draft.raceSkills.includes(k) ? 'is-on' : ''}`}
                                aria-pressed={draft.raceSkills.includes(k)}
                                onClick={() => set({ raceSkills: toggle(draft.raceSkills, k, raceChoice.count) })}>
                                {SKILLS[k].name}
                            </button>
                        ))}
                    </div>
                </Dossier>
            )}
            {cls && !manual && <p className="wiz-help">Владения класса: {cls.proficiencies}</p>}
        </>
    )
}

// ── 6. Cantrips ──
export function CantripsStep({ draft, set, data }) {
    const limit = cantripLimit(draft, data.classes)
    const upper = draft.classKey.toUpperCase()
    const cantrips = data.spells.filter((s) => s.level === 0)
    const own = cantrips.filter((s) => (s.classes || []).includes(upper))
    const list = own.length ? own : cantrips
    const manual = isManualClass(selectedClass(draft, data.classes))
    const [open, setOpen] = useState(null)
    return (
        <>
            <p className="wiz-help">
                {manual ? `Выберите заговоры по книге (до ${limit}): ${draft.cantrips.length}.` : `Выберите заговоры: ${draft.cantrips.length}/${limit}.`} Заклинания 1 круга и выше придут через исследования или от ГМ.
            </p>
            {!own.length && <Hint>Сверьтесь с книгой: у этого класса нет своего списка в картотеке, здесь все заговоры.</Hint>}
            <ul className="spell-list wiz-cantrips">
                {list.map((s) => {
                    const on = draft.cantrips.includes(s.id)
                    return (
                        <li key={s.id} className="spell-row">
                            <div className="wiz-cantrip-row">
                                <label className="wiz-skill">
                                    <input type="checkbox" checked={on} disabled={!on && draft.cantrips.length >= limit}
                                        onChange={() => set({ cantrips: toggle(draft.cantrips, s.id, limit) })} />
                                    <span className="spell-name">{spellName(s)}</span>
                                </label>
                                <button type="button" className="gate-link" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                                    {open === s.id ? 'Скрыть' : 'Описание'}
                                </button>
                            </div>
                            {open === s.id && (
                                <div className="spell-body">
                                    <p className="spell-facts">
                                        <span>{s.castingTimeRu || s.castingTime}</span>
                                        <span>{s.rangeRu || s.range}</span>
                                        <span>{s.durationRu || s.duration}</span>
                                    </p>
                                    <p className="sheet-prose">{spellDescription(s)}</p>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </>
    )
}

// ── 7. Equipment ──
export function GearStep({ draft, set, data }) {
    const cls = selectedClass(draft, data.classes)
    const bg = data.backgrounds.find((b) => b.key === draft.backgroundKey)
    return (
        <>
            <fieldset className="wiz-options">
                <legend className="sheet-label">Снаряжение класса</legend>
                {(cls?.equipment || []).map((option, i) => (
                    <label key={i} className={`wiz-option ${draft.equipmentOption === i ? 'is-selected' : ''}`}>
                        <input type="radio" name="equipment" checked={draft.equipmentOption === i} onChange={() => set({ equipmentOption: i })} />
                        <span><strong>Вариант {i === 0 ? 'А' : 'Б'}.</strong> {option}</span>
                    </label>
                ))}
            </fieldset>
            {!(cls?.equipment || []).length && <p className="wiz-help">Снаряжение класса впишите по книге в поле «Дополнительно».</p>}
            {bg && <p className="wiz-help">От предыстории: {bg.equipment}</p>}
            <Field label="Дополнительно" as="textarea" rows={3} value={draft.equipmentExtra} onChange={(e) => set({ equipmentExtra: e.target.value })} />
        </>
    )
}

// ── 8. Name and portrait ──
export function IdentityStep({ draft, set }) {
    const onPortrait = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        try {
            set({ portraitData: await resizeImageFile(file) })
        } catch (err) {
            console.error(err)
        }
    }
    return (
        <div className="wiz-identity">
            <label className="sheet-portrait is-editable" aria-label="Портрет">
                {draft.portraitData ? <img src={draft.portraitData} alt="" /> : <span aria-hidden="true">🗡</span>}
                <input type="file" accept="image/*" onChange={onPortrait} hidden />
            </label>
            <div className="wiz-identity-fields">
                <Field label="Имя" value={draft.name} onChange={(e) => set({ name: e.target.value })} required />
                <Field label="Имя игрока" value={draft.playerName} onChange={(e) => set({ playerName: e.target.value })} />
                <Field label="Мировоззрение" as="select" value={draft.alignment} onChange={(e) => set({ alignment: e.target.value })}>
                    <option value="">—</option>
                    {ALIGNMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </Field>
                <Field label="Предыстория текстом (необязательно)" as="textarea" rows={4} value={draft.backstory} onChange={(e) => set({ backstory: e.target.value })} />
            </div>
        </div>
    )
}

// ── 9. Admission request ──
export function AdmissionStep({ draft, set, data }) {
    const rune = data.runes.find((r) => r.key === draft.runeTier) || data.runes[0]
    return (
        <>
            <fieldset className="wiz-options">
                <legend className="sheet-label">Руна</legend>
                {data.runes.map((r) => (
                    <label key={r.key} className={`wiz-option ${draft.runeTier === r.key ? 'is-selected' : ''}`}>
                        <input type="radio" name="rune" checked={draft.runeTier === r.key}
                            onChange={() => set({ runeTier: r.key, startLevel: Math.min(draft.startLevel, r.levelCap) })} />
                        <RuneBadge tier={r.key} size={28} />
                        <span><strong>{r.nameRu}</strong> · потолок {r.levelCap}. {r.description}{r.key !== 'COMMON' && <em> Подтверждает ГМ.</em>}</span>
                    </label>
                ))}
            </fieldset>
            <Field label={`Стартовый уровень (1–${rune?.levelCap ?? 10})`} type="number" min={1} max={rune?.levelCap ?? 10}
                value={draft.startLevel}
                onChange={(e) => set({ startLevel: Math.max(1, Math.min(rune?.levelCap ?? 10, Number(e.target.value) || 1)) })} />
            <Field label="Комментарий для ГМ" as="textarea" rows={3} value={draft.playerComment} onChange={(e) => set({ playerComment: e.target.value })} />
        </>
    )
}
