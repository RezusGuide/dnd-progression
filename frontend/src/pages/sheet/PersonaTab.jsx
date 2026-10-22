import { Labelled, SheetSection, TextBlock, TextValue } from './parts'

const TRAITS = [
    ['personalityTraits', 'Черты характера'],
    ['ideals', 'Идеалы'],
    ['bonds', 'Привязанности'],
    ['flaws', 'Слабости'],
]

const LOOKS = [
    ['age', 'Возраст'],
    ['height', 'Рост'],
    ['weight', 'Вес'],
    ['eyes', 'Глаза'],
    ['skin', 'Кожа'],
    ['hair', 'Волосы'],
]

export default function PersonaTab({ form, update, editing }) {
    const set = (key) => (v) => update({ [key]: v })
    return (
        <div className="persona-tab">
            <div className="persona-grid">
                {TRAITS.map(([key, label]) => (
                    <SheetSection key={key} title={label}>
                        <TextBlock hideLabel label={label} editing={editing} value={form[key]} onChange={set(key)} />
                    </SheetSection>
                ))}
            </div>

            <SheetSection title="Умения и особенности">
                <TextBlock hideLabel label="Умения и особенности" editing={editing} value={form.featuresAndTraits} rows={5} placeholder="Умения класса и расы, черты…" onChange={set('featuresAndTraits')} />
            </SheetSection>

            <SheetSection title="Внешность">
                <div className="looks-grid">
                    {LOOKS.map(([key, label]) => (
                        <Labelled key={key} label={label}>
                            <TextValue editing={editing} value={form[key]} label={label} onChange={set(key)} />
                        </Labelled>
                    ))}
                </div>
                <TextBlock label="Описание" editing={editing} value={form.appearance} rows={3} onChange={set('appearance')} />
            </SheetSection>

            <SheetSection title="Союзники и организации">
                <Labelled label="Организация">
                    <TextValue editing={editing} value={form.organizationName} label="Организация" onChange={set('organizationName')} />
                </Labelled>
                <TextBlock label="Союзники" editing={editing} value={form.alliesOrganizations} onChange={set('alliesOrganizations')} />
            </SheetSection>

            <SheetSection title="Предыстория">
                <TextBlock hideLabel label="Предыстория" editing={editing} value={form.backstory} rows={10} placeholder="Кем был сотрудник до найма…" onChange={set('backstory')} />
            </SheetSection>
        </div>
    )
}
