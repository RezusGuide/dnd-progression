import { SheetSection, TextBlock } from './parts'

// Free-form player notes. Texts only.
export default function NotesTab({ form, update, editing }) {
    return (
        <div className="notes-tab">
            <SheetSection title="Заметки о заклинаниях">
                <TextBlock hideLabel label="Заметки о заклинаниях" editing={editing} value={form.spellNotes} rows={5} placeholder="СЛ, подготовленные заклинания, что угодно" onChange={(v) => update({ spellNotes: v })} />
            </SheetSection>
            <SheetSection title="Дополнительные особенности и записи">
                <TextBlock hideLabel label="Дополнительные особенности и записи" editing={editing} value={form.additionalFeatures} rows={8} onChange={(v) => update({ additionalFeatures: v })} />
            </SheetSection>
        </div>
    )
}
