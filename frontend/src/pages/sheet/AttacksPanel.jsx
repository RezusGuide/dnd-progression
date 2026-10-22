import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui'
import { SheetSection } from './parts'

// "Название · +5 к попаданию · 1к8+3 рубящий". Rows are edited, added and
// removed in edit mode; a removed row can be brought back for 5 seconds.
const dice = (s) => String(s || '').replace(/(\d)d(\d)/gi, '$1к$2')

export default function AttacksPanel({ form, update, editing }) {
    const [undo, setUndo] = useState(null) // { attack, index }
    const timer = useRef(null)

    useEffect(() => () => clearTimeout(timer.current), [])

    const change = (i, key, value) => update((f) => ({
        attacks: f.attacks.map((a, idx) => (idx === i ? { ...a, [key]: value } : a)),
    }))
    const add = () => update((f) => ({ attacks: [...f.attacks, { name: '', attackBonus: '', damageType: '' }] }))
    const remove = (i) => {
        const attack = form.attacks[i]
        update((f) => ({ attacks: f.attacks.filter((_, idx) => idx !== i) }))
        setUndo({ attack, index: i })
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setUndo(null), 5000)
    }
    const restore = () => {
        if (!undo) return
        update((f) => {
            const list = [...f.attacks]
            list.splice(Math.min(undo.index, list.length), 0, undo.attack)
            return { attacks: list }
        })
        setUndo(null)
    }

    return (
        <SheetSection title="Атаки" actions={editing && <Button variant="secondary" onClick={add}>+ Добавить атаку</Button>}>
            {form.attacks.length === 0 && <p className="sheet-prose is-empty">Атаки не записаны.</p>}
            {!editing && form.attacks.length > 0 && (
                <ul className="attack-list">
                    {form.attacks.map((a, i) => (
                        <li key={i} className="attack-row">
                            <strong>{a.name || 'Без названия'}</strong>
                            {a.attackBonus && <span> · {a.attackBonus} к попаданию</span>}
                            {a.damageType && <span> · {dice(a.damageType)}</span>}
                        </li>
                    ))}
                </ul>
            )}
            {editing && form.attacks.map((a, i) => (
                <div key={i} className="attack-edit">
                    <input className="sheet-input" aria-label="Название атаки" placeholder="Название" value={a.name || ''} onChange={(e) => change(i, 'name', e.target.value)} />
                    <input className="sheet-input" aria-label="Бонус к попаданию" placeholder="+5" value={a.attackBonus || ''} onChange={(e) => change(i, 'attackBonus', e.target.value)} />
                    <input className="sheet-input" aria-label="Урон и тип" placeholder="1к8+3 рубящий" value={a.damageType || ''} onChange={(e) => change(i, 'damageType', e.target.value)} />
                    <button type="button" className="sheet-icon-btn" aria-label={`Удалить атаку «${a.name || 'без названия'}»`} onClick={() => remove(i)}>✕</button>
                </div>
            ))}
            {undo && (
                <p className="attack-undo" role="status">
                    Атака удалена. <button type="button" className="gate-link" onClick={restore}>Вернуть</button>
                </p>
            )}
        </SheetSection>
    )
}
