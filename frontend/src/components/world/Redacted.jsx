// Censored text: black bars of different widths and the «ЗАСЕКРЕЧЕНО»
// stamp. Pure CSS, no real text behind it - the server never sends any.
const WIDTHS = [92, 74, 86, 58, 80, 40]

export default function Redacted({ lines = 4, stamp = true }) {
    return (
        <div className="redacted" aria-label="Текст засекречен">
            {WIDTHS.slice(0, lines).map((w, i) => <span key={i} className="redacted-bar" style={{ width: `${w}%` }} aria-hidden="true" />)}
            {stamp && <span className="redacted-stamp" aria-hidden="true">Засекречено</span>}
        </div>
    )
}
