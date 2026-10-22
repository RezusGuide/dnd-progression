import { useState } from 'react'
import { Button, HelpTip, Modal } from '../../components/ui'
import {
    ABILITY_FIELDS, abilityMod, applyDamage, applyHealing, formatMod, hitDiceLeft, longRest,
    passivePerception, proficiencyBonus, shortRest, skillBonus,
} from '../../lib/dnd-rules'
import { NumberValue } from './parts'
import { TIPS } from './tips'

// Sticky strip with everything needed mid-fight. Hit points, temporary
// hit points, inspiration and death saves change any time (no edit mode);
// AC, max HP, initiative, speed and hit dice only while editing.
export default function CombatBar({ form, update, canEdit, editing }) {
    const [hpPanel, setHpPanel] = useState(false)
    const [amount, setAmount] = useState('')
    const [restOpen, setRestOpen] = useState(null) // 'long' | 'short' | null
    const [shortHeal, setShortHeal] = useState('')
    const [shortDice, setShortDice] = useState(1)

    const prof = proficiencyBonus(form.level)
    const dexMod = abilityMod(form.dexterity)
    const manualInit = form.initiativeOverride !== null && form.initiativeOverride !== undefined
    const initiative = manualInit ? form.initiativeOverride : dexMod
    const perception = skillBonus({
        score: form[ABILITY_FIELDS.WIS],
        proficient: form.proficientSkills.includes('PERCEPTION'),
        expertise: form.expertiseSkills.includes('PERCEPTION'),
        prof,
    })
    const down = (form.hpCurrent ?? 0) <= 0 && (form.hpMax ?? 0) > 0

    const damage = (n) => update((f) => applyDamage(f, n))
    const heal = (n) => update((f) => applyHealing(f, n))

    const submitAmount = (kind) => {
        const n = Number(amount)
        if (!n || n < 0) return
        if (kind === 'damage') damage(n)
        else heal(n)
        setAmount('')
        setHpPanel(false)
    }

    const toggleDeath = (key, index) => update((f) => {
        const current = f[key] || 0
        const next = current === index + 1 ? index : index + 1
        return { [key]: Math.max(0, Math.min(3, next)) }
    })

    return (
        <section className="combat-bar" aria-label="Боевая панель">
            <div className="combat-cell combat-ac">
                <span className="combat-label">КД <HelpTip label="Класс доспеха">{TIPS.ac}</HelpTip></span>
                <span className="combat-shield">
                    <NumberValue editing={editing} value={form.armorClass} label="Класс доспеха" onChange={(v) => update({ armorClass: v ?? 10 })} className="combat-big" />
                </span>
            </div>

            <div className="combat-cell combat-hp">
                <span className="combat-label">Хиты <HelpTip label="Хиты">{TIPS.hp}</HelpTip></span>
                <div className="combat-hp-row">
                    {canEdit && (
                        <button type="button" className="combat-step" aria-label="Минус 1 хит" onClick={() => damage(1)}>−</button>
                    )}
                    <span className={`combat-big ${down ? 'is-down' : ''}`}>{form.hpCurrent ?? 0}</span>
                    <span className="combat-slash">/</span>
                    <NumberValue editing={editing} value={form.hpMax} min={0} label="Максимум хитов" onChange={(v) => update({ hpMax: v ?? 0 })} className="combat-max" />
                    {canEdit && (
                        <button type="button" className="combat-step" aria-label="Плюс 1 хит" onClick={() => heal(1)}>+</button>
                    )}
                    {canEdit && (
                        <button type="button" className="combat-step combat-step-wide" aria-label="Урон или лечение" aria-expanded={hpPanel} onClick={() => setHpPanel((v) => !v)}>±</button>
                    )}
                </div>
                <div className="combat-temp">
                    <span>Временные <HelpTip label="Временные хиты">{TIPS.tempHp}</HelpTip></span>
                    {canEdit ? (
                        <input
                            type="number"
                            min="0"
                            className="sheet-input sheet-input-num combat-temp-input"
                            aria-label="Временные хиты"
                            value={form.hpTemp ?? 0}
                            onChange={(e) => update({ hpTemp: Math.max(0, Number(e.target.value) || 0) })}
                        />
                    ) : (
                        <span className="sheet-num">{form.hpTemp ?? 0}</span>
                    )}
                </div>

                {hpPanel && (
                    <form className="combat-hp-panel" onSubmit={(e) => { e.preventDefault(); submitAmount('damage') }}>
                        <label className="sheet-label" htmlFor="hp-amount">Урон или лечение</label>
                        <input
                            id="hp-amount"
                            type="number"
                            min="1"
                            autoFocus
                            className="sheet-input sheet-input-num"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape') setHpPanel(false) }}
                        />
                        <Button variant="danger" type="submit">Урон</Button>
                        <Button variant="secondary" onClick={() => submitAmount('heal')}>Лечение</Button>
                    </form>
                )}
            </div>

            <div className="combat-cell">
                <span className="combat-label">Иниц. <HelpTip label="Инициатива">{TIPS.initiative}</HelpTip></span>
                {editing ? (
                    <input
                        type="number"
                        className="sheet-input sheet-input-num"
                        aria-label="Инициатива вручную (пусто — по Ловкости)"
                        placeholder={formatMod(dexMod)}
                        value={form.initiativeOverride ?? ''}
                        onChange={(e) => update({ initiativeOverride: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                ) : (
                    <span className="combat-big">{formatMod(initiative)}</span>
                )}
                {manualInit && <span className="combat-note">вручную</span>}
            </div>

            <div className="combat-cell">
                <span className="combat-label">Скор. <HelpTip label="Скорость">{TIPS.speed}</HelpTip></span>
                <NumberValue editing={editing} value={form.speed} min={0} label="Скорость" onChange={(v) => update({ speed: v ?? 0 })} className="combat-big" />
            </div>

            <div className="combat-cell">
                <span className="combat-label">Маст. <HelpTip label="Бонус мастерства">{TIPS.prof}</HelpTip></span>
                <span className="combat-big">{formatMod(prof)}</span>
            </div>

            <div className="combat-cell">
                <span className="combat-label">Пассив. воспр. <HelpTip label="Пассивное восприятие">{TIPS.passive}</HelpTip></span>
                <span className="combat-big">{passivePerception(perception)}</span>
            </div>

            <div className="combat-cell">
                <span className="combat-label">Вдохновение <HelpTip label="Вдохновение">{TIPS.inspiration}</HelpTip></span>
                {canEdit ? (
                    <button
                        type="button"
                        className={`combat-inspiration ${form.inspiration ? 'is-on' : ''}`}
                        aria-pressed={form.inspiration}
                        aria-label="Вдохновение"
                        onClick={() => update((f) => ({ inspiration: !f.inspiration }))}
                    >{form.inspiration ? '◆' : '◇'}</button>
                ) : (
                    <span className="combat-big" aria-label={form.inspiration ? 'Есть' : 'Нет'}>{form.inspiration ? '◆' : '◇'}</span>
                )}
            </div>

            <div className="combat-cell">
                <span className="combat-label">Кости хитов <HelpTip label="Кости хитов">{TIPS.hitDice}</HelpTip></span>
                {editing ? (
                    <span className="combat-dice-edit">
                        <NumberValue editing value={form.hitDiceTotal} min={0} label="Число костей хитов" onChange={(v) => update({ hitDiceTotal: v ?? 0 })} />
                        <select className="sheet-input" aria-label="Тип кости хитов" value={form.hitDiceType} onChange={(e) => update({ hitDiceType: e.target.value })}>
                            {['d6', 'd8', 'd10', 'd12'].map((d) => <option key={d} value={d}>{d.replace('d', 'к')}</option>)}
                        </select>
                    </span>
                ) : (
                    <span className="combat-big" aria-label={`Осталось ${hitDiceLeft(form)} из ${form.hitDiceTotal}`}>
                        {hitDiceLeft(form)}/{form.hitDiceTotal}{(form.hitDiceType || 'd8').replace('d', 'к')}
                    </span>
                )}
            </div>

            {canEdit && (
                <div className="combat-cell combat-rests">
                    <Button variant="secondary" onClick={() => setRestOpen('short')}>Короткий отдых</Button>
                    <Button variant="secondary" onClick={() => setRestOpen('long')}>Долгий отдых</Button>
                </div>
            )}

            {down && (
                <div className="combat-death" role="group" aria-label="Спасброски от смерти">
                    <span className="combat-down">Без сознания</span>
                    <span className="combat-label">Спасброски от смерти <HelpTip label="Спасброски от смерти">{TIPS.deathSaves}</HelpTip></span>
                    {[['deathSaveSuccesses', 'Успехи', 'success'], ['deathSaveFailures', 'Провалы', 'failure']].map(([key, label, kind]) => (
                        <span key={key} className={`combat-death-row is-${kind}`}>
                            <span>{label}</span>
                            {[0, 1, 2].map((i) => {
                                const filled = i < (form[key] || 0)
                                return canEdit ? (
                                    <button
                                        key={i}
                                        type="button"
                                        className={`combat-death-dot ${filled ? 'is-filled' : ''}`}
                                        aria-label={`${label}: ${i + 1}`}
                                        aria-pressed={filled}
                                        onClick={() => toggleDeath(key, i)}
                                    />
                                ) : (
                                    <span key={i} className={`combat-death-dot ${filled ? 'is-filled' : ''}`} aria-hidden="true" />
                                )
                            })}
                        </span>
                    ))}
                </div>
            )}

            {restOpen === 'long' && (
                <Modal
                    title="Долгий отдых"
                    onClose={() => setRestOpen(null)}
                    actions={<>
                        <Button variant="ghost" onClick={() => setRestOpen(null)}>Отмена</Button>
                        <Button onClick={() => { update((f) => longRest(f)); setRestOpen(null) }}>Продолжить</Button>
                    </>}
                >
                    <p>Хиты, ячейки и кости хитов восстановятся, временные хиты и спасброски от смерти обнулятся. Продолжить?</p>
                </Modal>
            )}

            {restOpen === 'short' && (
                <Modal
                    title="Короткий отдых"
                    onClose={() => setRestOpen(null)}
                    actions={<>
                        <Button variant="ghost" onClick={() => setRestOpen(null)}>Отмена</Button>
                        <Button
                            disabled={hitDiceLeft(form) === 0}
                            onClick={() => {
                                update((f) => shortRest(f, shortDice, Number(shortHeal) || 0))
                                setShortHeal('')
                                setShortDice(1)
                                setRestOpen(null)
                            }}
                        >Лечение</Button>
                    </>}
                >
                    {hitDiceLeft(form) === 0 ? (
                        <p>Костей хитов не осталось. Они вернутся после долгого отдыха.</p>
                    ) : (
                        <div className="rest-fields">
                            <label className="sheet-label" htmlFor="short-rest-dice">
                                Сколько костей тратите (осталось {hitDiceLeft(form)}{(form.hitDiceType || 'd8').replace('d', 'к')})
                            </label>
                            <input
                                id="short-rest-dice"
                                type="number"
                                min="1"
                                max={hitDiceLeft(form)}
                                className="sheet-input sheet-input-num"
                                value={shortDice}
                                onChange={(e) => setShortDice(Math.max(1, Math.min(hitDiceLeft(form), Number(e.target.value) || 1)))}
                            />
                            <label className="sheet-label" htmlFor="short-rest-heal">Сколько хитов восстановили?</label>
                            <input
                                id="short-rest-heal"
                                type="number"
                                min="0"
                                className="sheet-input sheet-input-num"
                                value={shortHeal}
                                onChange={(e) => setShortHeal(e.target.value)}
                            />
                        </div>
                    )}
                </Modal>
            )}
        </section>
    )
}
