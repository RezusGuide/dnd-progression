import { useState } from 'react'
import { Button, EmptyState, HelpTip } from '../../components/ui'
import { ABILITIES, className } from '../../constants/dnd-ru'
import { isNonCaster, isSpellEligible } from '../../constants/casterClasses'
import { spellDescription, spellName } from '../../constants/spellText'
import {
    ABILITY_FIELDS, abilityMod, formatMod, proficiencyBonus, spellAttackBonus,
    spellSaveDC, spellSlotsFor, spellcastingAbility,
} from '../../lib/dnd-rules'
import { NumberValue, SheetSection } from './parts'
import { TIPS } from './tips'

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// spells.json keeps casting time / range / duration in English; the common
// phrasings are shown in Russian, anything else as written.
const PHRASES = [
    [/^(\d+) bonus action$/i, '$1 бонусное действие'],
    [/^(\d+) action$/i, '$1 действие'],
    [/^(\d+) reaction.*$/i, '$1 реакция'],
    [/^1 minute$/i, '1 минута'],
    [/^(\d+) minutes$/i, '$1 минут'],
    [/^1 hour$/i, '1 час'],
    [/^(\d+) hours$/i, '$1 ч'],
    [/^(\d+) feet$/i, '$1 фт'],
    [/^(\d+) miles?$/i, '$1 миль'],
    [/^self.*$/i, 'на себя'],
    [/^touch$/i, 'касание'],
    [/^sight$/i, 'в пределах видимости'],
    [/^unlimited$/i, 'без ограничений'],
    [/^instantaneous$/i, 'мгновенная'],
    [/^concentration, up to (.*)$/i, 'концентрация, до $1'],
    [/^until dispelled$/i, 'пока не рассеется'],
]
function ru(text) {
    if (!text) return ''
    for (const [re, out] of PHRASES) if (re.test(text)) return text.replace(re, out)
    return text
}
const components = (c) => (c || '').replace(/\bV\b/g, 'В').replace(/\bS\b/g, 'С').replace(/\bM\b/g, 'М')

function SpellRow({ spell, meta }) {
    const [open, setOpen] = useState(false)
    const info = { ...meta, ...spell }
    return (
        <li className="spell-row">
            <button type="button" className="spell-row-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                <span className="spell-name">{spellName(info)}</span>
                <span className="spell-meta">{[ru(info.castingTime), ru(info.range)].filter(Boolean).join(' · ')}</span>
            </button>
            {open && (
                <div className="spell-body">
                    <p className="spell-facts">
                        {info.components && <span>Компоненты: {components(info.components)}</span>}
                        {info.duration && <span>Длительность: {ru(info.duration)}</span>}
                        {spell.accuracyPercentage != null && spell.level > 0 && <span>Сила: {spell.accuracyPercentage}%</span>}
                    </p>
                    <p className="sheet-prose">{spellDescription(info) || '—'}</p>
                </div>
            )}
        </li>
    )
}

export default function MagicTab({ character, form, update, canEdit, editing, knownSpells, catalog, addCantrip }) {
    const [cantripChoice, setCantripChoice] = useState('')

    if (isNonCaster(form.characterClass)) {
        return (
            <SheetSection title="Магия">
                <EmptyState>{`${className(form.characterClass) || 'Этот класс'} не пользуется магией. Если это изменится, обратитесь к ГМу.`}</EmptyState>
            </SheetSection>
        )
    }

    const prof = proficiencyBonus(form.level)
    const abilityKey = spellcastingAbility(form.characterClass)
    const mod = abilityKey ? abilityMod(form[ABILITY_FIELDS[abilityKey]]) : null
    const byId = Object.fromEntries(catalog.map((s) => [s.id, s]))
    const table = spellSlotsFor(form.characterClass, form.level)

    const setSlot = (level, patch) => update((f) => {
        const current = f.spellSlots[level] || {}
        const next = { ...current, ...patch }
        const slots = { ...f.spellSlots }
        if (!next.max && !next.current) delete slots[level]
        else slots[level] = next
        return { spellSlots: slots }
    })

    // Clicking a filled pip spends it; clicking an empty one gets it back.
    const clickPip = (level, index) => {
        const slot = form.spellSlots[level] || {}
        const current = slot.current ?? 0
        setSlot(level, { current: index < current ? index : index + 1 })
    }

    const fillFromTable = () => update((f) => {
        const slots = {}
        for (const [lvl, max] of Object.entries(table || {})) {
            const old = f.spellSlots[lvl]
            slots[lvl] = { max, current: Math.min(old?.current ?? max, max) }
        }
        return { spellSlots: slots }
    })

    const shownLevels = LEVELS.filter((l) => editing || (form.spellSlots[l]?.max ?? 0) > 0)
    const groups = {}
    for (const s of knownSpells) (groups[s.level] ||= []).push(s)
    const groupLevels = Object.keys(groups).map(Number).sort((a, b) => a - b)
    const cantripOptions = catalog
        .filter((s) => s.level === 0)
        .filter((s) => !knownSpells.some((k) => k.spellId === s.id))
        .filter((s) => isSpellEligible(form.characterClass, s))

    return (
        <div className="magic-tab" data-theme="night">
            <SheetSection title="Заклинатель">
                <div className="magic-summary">
                    <div className="magic-stat">
                        <span className="sheet-label">Базовая характеристика</span>
                        <span className="combat-big">{abilityKey ? ABILITIES[abilityKey].full : '—'}</span>
                    </div>
                    <div className="magic-stat">
                        <span className="sheet-label">СЛ спасброска <HelpTip label="СЛ заклинаний">{TIPS.spellDc}</HelpTip></span>
                        <span className="combat-big">{mod === null ? '—' : spellSaveDC(prof, mod)}</span>
                    </div>
                    <div className="magic-stat">
                        <span className="sheet-label">Бонус атаки <HelpTip label="Бонус атаки заклинанием">{TIPS.spellAttack}</HelpTip></span>
                        <span className="combat-big">{mod === null ? '—' : formatMod(spellAttackBonus(prof, mod))}</span>
                    </div>
                </div>
            </SheetSection>

            <SheetSection
                title="Ячейки заклинаний"
                tip={TIPS.slots}
                actions={editing && table && <Button variant="secondary" onClick={fillFromTable}>Заполнить по таблице</Button>}
            >
                {shownLevels.length === 0 && <p className="sheet-prose is-empty">Ячеек нет.</p>}
                <ul className="slot-list">
                    {shownLevels.map((level) => {
                        const slot = form.spellSlots[level] || {}
                        const max = slot.max ?? 0
                        const current = slot.current ?? 0
                        return (
                            <li key={level} className="slot-row">
                                <span className="slot-level">{level} круг</span>
                                <span className="slot-pips">
                                    {Array.from({ length: max }, (_, i) => (
                                        canEdit ? (
                                            <button
                                                key={i}
                                                type="button"
                                                className={`slot-pip ${i < current ? 'is-full' : ''}`}
                                                aria-label={`${level} круг, ячейка ${i + 1}: ${i < current ? 'есть' : 'потрачена'}`}
                                                aria-pressed={i < current}
                                                onClick={() => clickPip(level, i)}
                                            />
                                        ) : (
                                            <span key={i} className={`slot-pip ${i < current ? 'is-full' : ''}`} aria-hidden="true" />
                                        )
                                    ))}
                                </span>
                                <span className="slot-count">{current} / {max}</span>
                                {editing && (
                                    <span className="slot-max">
                                        максимум
                                        <NumberValue editing value={slot.max ?? 0} min={0} max={9} label={`Максимум ячеек ${level} круга`} onChange={(v) => setSlot(level, { max: v ?? 0, current: Math.min(current, v ?? 0) })} />
                                    </span>
                                )}
                            </li>
                        )
                    })}
                </ul>

                {(form.spellPointsMax != null || form.spellPointsCurrent != null) && (
                    <div className="slot-row slot-points">
                        <span className="slot-level">Очки заклинаний</span>
                        {canEdit ? (
                            <input type="number" min="0" className="sheet-input sheet-input-num" aria-label="Очки заклинаний сейчас" value={form.spellPointsCurrent ?? ''} onChange={(e) => update({ spellPointsCurrent: e.target.value === '' ? null : Number(e.target.value) })} />
                        ) : (
                            <span className="sheet-num">{form.spellPointsCurrent ?? 0}</span>
                        )}
                        <span>/</span>
                        <NumberValue editing={editing} value={form.spellPointsMax} min={0} label="Максимум очков заклинаний" onChange={(v) => update({ spellPointsMax: v })} />
                    </div>
                )}
            </SheetSection>

            <SheetSection
                title="Заклинания"
                actions={canEdit && <Button variant="secondary" to={`/characters/${character.id}/research`}>Исследования</Button>}
            >
                {knownSpells.length === 0 && <p className="sheet-prose is-empty">Заклинания пока не изучены.</p>}
                {groupLevels.map((level) => (
                    <div key={level} className="spell-group">
                        <h3 className="sheet-label">{level === 0 ? 'Заговоры' : `${level} круг`}</h3>
                        <ul className="spell-list">
                            {groups[level].map((s) => <SpellRow key={s.spellId} spell={s} meta={byId[s.spellId]} />)}
                        </ul>
                    </div>
                ))}

                {canEdit && (
                    <div className="magic-add">
                        <select className="sheet-input" aria-label="Заговор" value={cantripChoice} onChange={(e) => setCantripChoice(e.target.value)}>
                            <option value="">— Выбрать заговор —</option>
                            {cantripOptions.map((s) => <option key={s.id} value={s.id}>{spellName(s)}</option>)}
                        </select>
                        <Button variant="secondary" disabled={!cantripChoice} onClick={() => { addCantrip(cantripChoice); setCantripChoice('') }}>+ Добавить заговор</Button>
                    </div>
                )}
            </SheetSection>
        </div>
    )
}
