import CatMascot from '../brand/CatMascot'

// Nothing to show yet: the cat plus a line of office humour.
export default function EmptyState({ children = 'Дел пока нет. Секретарша проверит позже.', action, className = '' }) {
    return (
        <div className={`ui-empty ${className}`.trim()}>
            <CatMascot size={110} decorative />
            <p className="ui-empty-text">{children}</p>
            {action}
        </div>
    )
}
