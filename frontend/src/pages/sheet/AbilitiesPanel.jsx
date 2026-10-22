import { ABILITIES } from '../../constants/dnd-ru'
import { ABILITY_FIELDS, abilityMod, formatMod } from '../../lib/dnd-rules'
import { SheetSection } from './parts'
import { TIPS } from './tips'

// Six tiles in one row (3×2 when narrow): big modifier, small score.
export default function AbilitiesPanel({ form, update, editing }) {
    return (
        <SheetSection title="Характеристики" tip={TIPS.abilities}>
            <div className="ability-row">
                {Object.entries(ABILITIES).map(([key, { short, full }]) => {
                    const field = ABILITY_FIELDS[key]
                    const score = form[field]
                    return (
                        <div key={key} className="ability-tile" title={full}>
                            <span className="ability-short">{short}</span>
                            <span className="ability-mod">{formatMod(abilityMod(score))}</span>
                            {editing ? (
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    className="sheet-input sheet-input-num ability-score-input"
                                    aria-label={full}
                                    value={score ?? ''}
                                    onChange={(e) => update({ [field]: e.target.value === '' ? null : Number(e.target.value) })}
                                />
                            ) : (
                                <span className="ability-score" aria-label={`${full}: ${score}`}>{score}</span>
                            )}
                        </div>
                    )
                })}
            </div>
        </SheetSection>
    )
}
