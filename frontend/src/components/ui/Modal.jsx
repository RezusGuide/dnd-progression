import { useEffect, useId, useRef } from 'react'
import Dossier from './Dossier'

// Small dialog on a night scrim: confirmations and short pickers (`wide`
// for a whole form). Escape or a click on the scrim closes it; focus moves
// into the dialog once, when it opens.
export default function Modal({ title, onClose, children, actions, wide = false }) {
    const titleId = useId()
    const boxRef = useRef(null)
    // Callers pass a new onClose on every render; keep the latest without
    // re-running the effect, or focus would jump back to the first field.
    const closeRef = useRef(onClose)
    useEffect(() => { closeRef.current = onClose })

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') closeRef.current() }
        window.addEventListener('keydown', onKey)
        boxRef.current?.querySelector('button, a, input, select, textarea')?.focus()
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    return (
        <div className="ui-modal-scrim" onClick={onClose}>
            <div className={`ui-modal ${wide ? 'ui-modal-wide' : ''}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={boxRef} onClick={(e) => e.stopPropagation()}>
                <Dossier>
                    <h2 id={titleId} className="ui-modal-title">{title}</h2>
                    {children}
                    {actions && <div className="ui-modal-actions">{actions}</div>}
                </Dossier>
            </div>
        </div>
    )
}
