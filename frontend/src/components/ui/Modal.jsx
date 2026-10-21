import { useEffect, useId, useRef } from 'react'
import Dossier from './Dossier'

// Small dialog on a night scrim: confirmations and short pickers.
// Escape or a click on the scrim closes it; focus moves into the dialog.
export default function Modal({ title, onClose, children, actions }) {
    const titleId = useId()
    const boxRef = useRef(null)

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        boxRef.current?.querySelector('button, a, input, select, textarea')?.focus()
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="ui-modal-scrim" onClick={onClose}>
            <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={boxRef} onClick={(e) => e.stopPropagation()}>
                <Dossier>
                    <h2 id={titleId} className="ui-modal-title">{title}</h2>
                    {children}
                    {actions && <div className="ui-modal-actions">{actions}</div>}
                </Dossier>
            </div>
        </div>
    )
}
