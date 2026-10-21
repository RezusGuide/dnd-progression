import CatHead from '../brand/CatHead'

// A tip from the cat: head avatar plus a speech-bubble note.
export default function Hint({ children, className = '' }) {
    return (
        <aside className={`ui-hint ${className}`.trim()}>
            <CatHead size={44} />
            <div className="ui-hint-bubble">{children}</div>
        </aside>
    )
}
