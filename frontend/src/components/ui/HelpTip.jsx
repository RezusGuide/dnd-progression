import { useEffect, useId, useRef, useState } from 'react'
import CatHead from '../brand/CatHead'

// "?" next to a number on the sheet. Opens a short note from the cat on
// click or keyboard focus; Escape, blur or a click elsewhere closes it.
export default function HelpTip({ label, children }) {
    const [open, setOpen] = useState(false)
    const id = useId()
    const wrapRef = useRef(null)

    useEffect(() => {
        if (!open) return
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
        const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
        window.addEventListener('keydown', onKey)
        window.addEventListener('pointerdown', onDown)
        return () => {
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('pointerdown', onDown)
        }
    }, [open])

    return (
        <span className="ui-tip" ref={wrapRef}>
            <button
                type="button"
                className="ui-tip-btn"
                aria-label={`Что такое «${label}»?`}
                aria-expanded={open}
                aria-describedby={open ? id : undefined}
                onClick={() => setOpen((v) => !v)}
                // Keyboard focus opens it; a mouse click focuses first, so
                // only :focus-visible counts, and the click itself toggles.
                onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setOpen(true) }}
                onBlur={() => setOpen(false)}
            >?</button>
            {open && (
                <span role="tooltip" id={id} className="ui-tip-pop">
                    <CatHead size={32} />
                    <span>{children}</span>
                </span>
            )}
        </span>
    )
}
