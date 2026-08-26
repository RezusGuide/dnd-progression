import { forwardRef, useImperativeHandle, useState } from 'react'
import { useLang } from '../context/LangContext'

// Standalone floating widget - no server round-trip, no persistence. Rolls
// are ephemeral by design (same as rolling physical dice at a table): the
// log resets on page reload rather than being written anywhere.
function rollDie(sides) {
    return 1 + Math.floor(Math.random() * sides)
}

function formatModifier(mod) {
    if (!mod) return ''
    return mod > 0 ? `+${mod}` : `${mod}`
}

// Parses freeform dice notation like "1d8+3", "2d6", "d20-1" - used to
// quick-roll an attack's damage field, which is stored as free text on the
// sheet (see CharacterSheet's attacks.damageType). Returns null for
// anything that isn't recognizable notation.
export function parseNotation(text) {
    if (!text) return null
    const match = String(text).trim().match(/^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i)
    if (!match) return null
    return {
        count: match[1] ? parseInt(match[1], 10) : 1,
        sides: parseInt(match[2], 10),
        modifier: match[3] ? parseInt(match[3].replace(/\s+/g, ''), 10) : 0,
    }
}

const DiceRoller = forwardRef(function DiceRoller(_props, ref) {
    const { t } = useLang()
    const [open, setOpen] = useState(false)
    const [history, setHistory] = useState([])
    const [sides, setSides] = useState(20)
    const [count, setCount] = useState(1)
    const [modifier, setModifier] = useState(0)
    const [advantage, setAdvantage] = useState('none') // 'none' | 'adv' | 'dis'

    // Structured roll - count dice of the given size, optional advantage/
    // disadvantage (only meaningful for a single d20), plus a flat modifier.
    const roll = ({ sides: s, count: c = 1, modifier: mod = 0, label = '', advantage: adv = 'none' }) => {
        let rolls
        let kept
        const advEligible = adv !== 'none' && s === 20 && c === 1
        if (advEligible) {
            const a = rollDie(20)
            const b = rollDie(20)
            rolls = [a, b]
            kept = adv === 'adv' ? Math.max(a, b) : Math.min(a, b)
        } else {
            rolls = Array.from({ length: c }, () => rollDie(s))
            kept = rolls.reduce((sum, r) => sum + r, 0)
        }
        const total = kept + mod
        const notation = `${c}d${s}${formatModifier(mod)}`
        setHistory((h) => [{ id: `${Date.now()}-${Math.random()}`, label, notation, rolls, advantage: advEligible ? adv : null, total }, ...h].slice(0, 50))
        setOpen(true)
        return total
    }

    // Parses freeform notation (an attack's damage field) before rolling;
    // silently does nothing if the text isn't recognizable, since there's
    // no reliable value to roll.
    const rollNotation = (text, label) => {
        const parsed = parseNotation(text)
        if (!parsed) return
        roll({ ...parsed, label })
    }

    useImperativeHandle(ref, () => ({ roll, rollNotation }))

    const handleManualRoll = () => {
        roll({ sides, count, modifier: Number(modifier) || 0, advantage, label: `${count}d${sides}` })
    }

    return (
        <>
            <button type="button" className="dice-fab" onClick={() => setOpen((v) => !v)} title={t('diceRollerTitle')} aria-label={t('diceRollerTitle')}>🎲</button>
            {open && (
                <div className="dice-panel">
                    <div className="dice-panel-header">
                        <h3>{t('diceRollerTitle')}</h3>
                        <button type="button" className="dice-panel-close" onClick={() => setOpen(false)} aria-label={t('close')}>✕</button>
                    </div>

                    <div className="dice-manual-row">
                        <select value={sides} onChange={(e) => setSides(Number(e.target.value))}>
                            {[4, 6, 8, 10, 12, 20, 100].map((s) => <option key={s} value={s}>d{s}</option>)}
                        </select>
                        <input type="number" min="1" max="20" value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} className="dice-count-input" title={t('diceCount')} />
                        <input type="text" value={modifier} onChange={(e) => setModifier(e.target.value)} placeholder="+0" className="dice-mod-input" title={t('diceModifier')} />
                        <button type="button" className="dice-roll-btn" onClick={handleManualRoll}>{t('diceRoll')}</button>
                    </div>

                    {sides === 20 && count === 1 && (
                        <div className="dice-adv-row">
                            <label><input type="radio" name="dice-adv" checked={advantage === 'none'} onChange={() => setAdvantage('none')} /> {t('diceNormal')}</label>
                            <label><input type="radio" name="dice-adv" checked={advantage === 'adv'} onChange={() => setAdvantage('adv')} /> {t('diceAdvantage')}</label>
                            <label><input type="radio" name="dice-adv" checked={advantage === 'dis'} onChange={() => setAdvantage('dis')} /> {t('diceDisadvantage')}</label>
                        </div>
                    )}

                    <div className="dice-history">
                        {history.length === 0 && <p className="dice-history-empty">{t('diceHistoryEmpty')}</p>}
                        {history.map((entry) => (
                            <div key={entry.id} className="dice-history-row">
                                <div className="dice-history-label">{entry.label || entry.notation}</div>
                                <div className="dice-history-rolls">
                                    {entry.advantage && <span className="dice-adv-tag">{entry.advantage === 'adv' ? t('diceAdvantage') : t('diceDisadvantage')}</span>}
                                    ({entry.rolls.join(', ')})
                                </div>
                                <div className="dice-history-total">{entry.total}</div>
                            </div>
                        ))}
                    </div>
                    {history.length > 0 && <button type="button" className="dice-clear-btn" onClick={() => setHistory([])}>{t('diceClear')}</button>}
                </div>
            )}
        </>
    )
})

export default DiceRoller
