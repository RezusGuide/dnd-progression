import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Button } from '../../components/ui'
import { RarityTag } from '../../components/chest/ChestContentsList'
import '../../styles/chest.css'
import AspectIcon from '../../components/aspects/AspectIcon'
import { bagEntries, useMagicData } from '../../lib/magic'
import { coinsInGold } from '../../lib/dnd-rules'
import { SheetSection, TextBlock } from './parts'

const COINS = [
    ['cp', 'ММ', 'Медные монеты'],
    ['sp', 'СМ', 'Серебряные монеты'],
    ['ep', 'ЭМ', 'Электрумовые монеты'],
    ['gp', 'ЗМ', 'Золотые монеты'],
    ['pp', 'ПМ', 'Платиновые монеты'],
]

// Coins change any time (no edit mode); texts only while editing. The bag
// of aspects is read-only here: the GM grants them, research spends them.
export default function GearTab({ character, form, update, canEdit, editing }) {
    const setCoin = (key, value) => update({ [key]: Math.max(0, Math.round(Number(value) || 0)) })
    const [magic] = useMagicData()
    // Items from Сундучок: owner and GM only (others get 403 and see nothing).
    const [items, setItems] = useState(null)
    useEffect(() => {
        if (!canEdit) return
        api.get(`/api/characters/${character.id}/inventory`).then((res) => setItems(res.data)).catch(() => setItems(null))
    }, [character.id, canEdit])
    const held = bagEntries(character.aspects, magic?.aspects)

    return (
        <div className="gear-tab">
            <SheetSection title="Монеты">
                <div className="coin-row">
                    {COINS.map(([key, short, full]) => (
                        <div key={key} className="coin">
                            <span className="sheet-label" title={full}>{short}</span>
                            {canEdit ? (
                                <span className="coin-controls">
                                    <button type="button" className="combat-step" aria-label={`${full}: минус 1`} onClick={() => setCoin(key, (form[key] || 0) - 1)}>−</button>
                                    <input type="number" min="0" className="sheet-input sheet-input-num" aria-label={full} value={form[key] ?? 0} onChange={(e) => setCoin(key, e.target.value)} />
                                    <button type="button" className="combat-step" aria-label={`${full}: плюс 1`} onClick={() => setCoin(key, (form[key] || 0) + 1)}>+</button>
                                </span>
                            ) : (
                                <span className="combat-big">{form[key] ?? 0}</span>
                            )}
                        </div>
                    ))}
                </div>
                <p className="coin-total">Всего ≈ {coinsInGold(form).toLocaleString('ru-RU')} зм</p>
            </SheetSection>

            <SheetSection title="Снаряжение">
                <TextBlock hideLabel label="Снаряжение" editing={editing} value={form.equipment} rows={6} onChange={(v) => update({ equipment: v })} />
            </SheetSection>

            <div className="sheet-two-col">
                <SheetSection title="Прочие владения и языки">
                    <TextBlock hideLabel label="Прочие владения и языки" editing={editing} value={form.otherProficiencies} onChange={(v) => update({ otherProficiencies: v })} />
                </SheetSection>
                <SheetSection title="Сокровища">
                    <TextBlock hideLabel label="Сокровища" editing={editing} value={form.treasure} onChange={(v) => update({ treasure: v })} />
                </SheetSection>
            </div>

            {items && (
                <SheetSection title="Предметы из Сундучка" actions={<Link className="gate-link" to={`/characters/${character.id}/chest`}>Открыть Сундучок →</Link>}>
                    {items.length === 0 ? (
                        <p className="sheet-prose is-empty">Опись пуста. Предметы приходят посылками.</p>
                    ) : (
                        <ul className="sheet-chest-items">
                            {items.map((item) => (
                                <li key={item.id}>
                                    <span className="sheet-chest-item-name">{item.name}</span>
                                    {item.quantity > 1 && <span className="sheet-num">× {item.quantity}</span>}
                                    <RarityTag rarity={item.rarity} />
                                </li>
                            ))}
                        </ul>
                    )}
                </SheetSection>
            )}

            <SheetSection
                title="Сумка"
                actions={canEdit && <Button variant="secondary" to={`/characters/${character.id}/craft`}>Соединить аспекты</Button>}
            >
                {held.length === 0 ? (
                    <p className="sheet-prose is-empty">Сумка пуста. Аспекты выдаёт ГМ.</p>
                ) : (
                    <ul className="bag-grid">
                        {held.map(({ aspect, count }) => (
                            <li key={aspect.key} className="bag-cell" title={aspect.hint}>
                                <AspectIcon aspect={aspect} size={36} />
                                <span className="bag-name">{aspect.nameRu}</span>
                                <span className="sheet-num">× {count}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </SheetSection>
        </div>
    )
}
