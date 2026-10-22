import { Button } from '../../components/ui'
import { ASPECTS, aspectLabel } from '../../constants/aspects'
import { coinsInGold } from '../../lib/dnd-rules'
import { SheetSection, TextBlock } from './parts'

const COINS = [
    ['cp', 'ММ', 'Медные монеты'],
    ['sp', 'СМ', 'Серебряные монеты'],
    ['ep', 'ЭМ', 'Электрумовые монеты'],
    ['gp', 'ЗМ', 'Золотые монеты'],
    ['pp', 'ПМ', 'Платиновые монеты'],
]

// Coins change any time (no edit mode); texts only while editing. The old
// aspect pouch is read-only here and goes away in stage 6.
export default function GearTab({ character, form, update, canEdit, editing }) {
    const setCoin = (key, value) => update({ [key]: Math.max(0, Math.round(Number(value) || 0)) })
    const held = ASPECTS.filter((a) => (character.aspects?.[a.key] || 0) > 0)

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

            <SheetSection
                title="Сумка с аспектами"
                actions={canEdit && <Button variant="secondary" to={`/characters/${character.id}/craft`}>Соединить аспекты</Button>}
            >
                {held.length === 0 ? (
                    <p className="sheet-prose is-empty">Сумка пуста. Аспекты выдаёт ГМ.</p>
                ) : (
                    <ul className="pouch-list">
                        {held.map((a) => (
                            <li key={a.key}><span>{aspectLabel(a.key)}</span><span className="sheet-num">× {character.aspects[a.key]}</span></li>
                        ))}
                    </ul>
                )}
            </SheetSection>
        </div>
    )
}
