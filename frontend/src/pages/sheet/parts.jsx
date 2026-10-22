import { Dossier, HelpTip } from '../../components/ui'

// Small building blocks shared by the sheet panels. The rule everywhere:
// in normal mode values read as plain text; inputs only appear in edit
// mode (or for the few always-live counters, see CombatBar).

export function SheetSection({ title, tip, actions, children, className = '', ...rest }) {
    return (
        <Dossier className={`sheet-section ${className}`.trim()} {...rest}>
            <div className="sheet-section-head">
                <h2 className="sheet-section-title">
                    {title}
                    {tip && <HelpTip label={title}>{tip}</HelpTip>}
                </h2>
                {actions && <div className="sheet-section-actions">{actions}</div>}
            </div>
            {children}
        </Dossier>
    )
}

const toNumOrNull = (raw) => (raw === '' ? null : Number(raw))

// Number shown as text, or an <input type=number> while editing.
export function NumberValue({ value, onChange, editing, label, min, max, className = '', placeholder }) {
    if (!editing) return <span className={`sheet-num ${className}`.trim()}>{value ?? '—'}</span>
    return (
        <input
            type="number"
            className={`sheet-input sheet-input-num ${className}`.trim()}
            value={value ?? ''}
            min={min}
            max={max}
            placeholder={placeholder}
            aria-label={label}
            onChange={(e) => onChange(toNumOrNull(e.target.value))}
        />
    )
}

// One-line text shown as text, or an <input> while editing.
export function TextValue({ value, onChange, editing, label, placeholder }) {
    if (!editing) return <span className="sheet-text">{value || '—'}</span>
    return (
        <input
            className="sheet-input"
            value={value ?? ''}
            placeholder={placeholder}
            aria-label={label}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}

// Long text: keeps the player's line breaks when read, <textarea> when editing.
export function TextBlock({ label, value, onChange, editing, rows = 4, placeholder, hideLabel = false }) {
    return (
        <div className="sheet-block">
            {!hideLabel && <span className="sheet-label">{label}</span>}
            {editing ? (
                <textarea
                    className="sheet-input sheet-textarea"
                    rows={rows}
                    value={value ?? ''}
                    placeholder={placeholder}
                    aria-label={label}
                    onChange={(e) => onChange(e.target.value)}
                />
            ) : (
                <p className={`sheet-prose ${value ? '' : 'is-empty'}`}>{value || '—'}</p>
            )}
        </div>
    )
}

// Labelled value in a small grid cell.
export function Labelled({ label, children }) {
    return (
        <div className="sheet-labelled">
            <span className="sheet-label">{label}</span>
            {children}
        </div>
    )
}

const PROF_TEXT = ['Нет владения', 'Владение', 'Компетентность']

// Proficiency mark: empty / filled / double circle. Clickable only while
// editing; cycles through the allowed states.
export function ProfMark({ level, editable, onCycle, name }) {
    const cls = `sheet-prof sheet-prof-${level}`
    if (!editable) return <span className={cls} title={PROF_TEXT[level]} aria-label={PROF_TEXT[level]} role="img" />
    return (
        <button
            type="button"
            className={cls}
            title={PROF_TEXT[level]}
            aria-label={`${name}: ${PROF_TEXT[level].toLowerCase()}`}
            aria-pressed={level > 0}
            onClick={onCycle}
        />
    )
}

// Selected value shown in Russian, or a <select> of English keys while
// editing. A home-made value missing from the list stays selectable.
export function KeySelect({ value, onChange, editing, options, label, display }) {
    if (!editing) return <span className="sheet-text">{value ? display(value) : '—'}</span>
    const keys = value && !options.includes(value) ? [value, ...options] : options
    return (
        <select className="sheet-input" value={value ?? ''} aria-label={label} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {keys.map((k) => <option key={k} value={k}>{display(k)}</option>)}
        </select>
    )
}
