import { ABILITIES, SKILLS } from '../../constants/dnd-ru'
import { ABILITY_FIELDS, formatMod, proficiencyBonus, saveBonus, skillBonus } from '../../lib/dnd-rules'
import { ProfMark, SheetSection } from './parts'
import { TIPS } from './tips'

const SKILL_ORDER = Object.entries(SKILLS).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'ru'))

// Saving throws and skills side by side. Marks cycle only while editing:
// saves none -> proficient; skills none -> proficient -> expertise.
export default function SavesSkillsPanel({ form, update, editing }) {
    const prof = proficiencyBonus(form.level)

    const toggleSave = (key) => update((f) => {
        const s = new Set(f.proficientSaves)
        if (s.has(key)) s.delete(key)
        else s.add(key)
        return { proficientSaves: [...s] }
    })

    const cycleSkill = (key) => update((f) => {
        const p = new Set(f.proficientSkills)
        const x = new Set(f.expertiseSkills)
        if (x.has(key)) { x.delete(key); p.delete(key) }
        else if (p.has(key)) x.add(key)
        else p.add(key)
        return { proficientSkills: [...p], expertiseSkills: [...x] }
    })

    return (
        <div className="sheet-two-col">
            <SheetSection title="Спасброски" tip={TIPS.saves}>
                <ul className="prof-list">
                    {Object.entries(ABILITIES).map(([key, { short, full }]) => {
                        const proficient = form.proficientSaves.includes(key)
                        const total = saveBonus({ score: form[ABILITY_FIELDS[key]], proficient, prof })
                        return (
                            <li key={key} className="prof-row">
                                <ProfMark level={proficient ? 1 : 0} editable={editing} name={full} onCycle={() => toggleSave(key)} />
                                <span className="prof-name">{full}</span>
                                <span className="prof-ability">({short})</span>
                                <span className="prof-total">{formatMod(total)}</span>
                            </li>
                        )
                    })}
                </ul>
            </SheetSection>

            <SheetSection title="Навыки" tip={TIPS.skills}>
                <ul className="prof-list">
                    {SKILL_ORDER.map(([key, { name, ability }]) => {
                        const expertise = form.expertiseSkills.includes(key)
                        const proficient = expertise || form.proficientSkills.includes(key)
                        const total = skillBonus({ score: form[ABILITY_FIELDS[ability]], proficient, expertise, prof })
                        return (
                            <li key={key} className="prof-row">
                                <ProfMark level={expertise ? 2 : proficient ? 1 : 0} editable={editing} name={name} onCycle={() => cycleSkill(key)} />
                                <span className="prof-name">{name}</span>
                                <span className="prof-ability">({ABILITIES[ability].short})</span>
                                <span className="prof-total">{formatMod(total)}</span>
                            </li>
                        )
                    })}
                </ul>
            </SheetSection>
        </div>
    )
}
