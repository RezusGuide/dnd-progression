import { useId } from 'react'

// Labelled form field: Oswald label, underlined input, and on error a red
// line PLUS a text message (never colour alone), wired up with
// aria-invalid / aria-describedby. Pass `as="textarea"` or `as="select"`.
export default function Field({ label, error, hint, as: Control = 'input', id, className = '', children, ...rest }) {
    const autoId = useId()
    const fieldId = id || autoId
    const hintId = hint ? `${fieldId}-hint` : undefined
    const errorId = error ? `${fieldId}-error` : undefined
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

    return (
        <div className={`ui-field ${error ? 'is-invalid' : ''} ${className}`.trim()}>
            <label htmlFor={fieldId} className="ui-field-label">{label}</label>
            <Control id={fieldId} className="ui-field-control" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest}>
                {children}
            </Control>
            {hint && <p id={hintId} className="ui-field-hint">{hint}</p>}
            {error && (
                <p id={errorId} className="ui-field-error">
                    <span aria-hidden="true">✕</span> {error}
                </p>
            )}
        </div>
    )
}
