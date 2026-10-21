import { Link } from 'react-router-dom'

// One header for every page: title, optional subtitle, optional "← Назад"
// link (`back` is a route path), and room for buttons on the right.
export default function PageHeader({ title, subtitle, back, backLabel = '← Назад', actions, className = '' }) {
    return (
        <header className={`ui-page-header ${className}`.trim()}>
            {back && <Link to={back} className="ui-page-back">{backLabel}</Link>}
            <div className="ui-page-header-row">
                <div className="ui-page-titles">
                    <h1 className="ui-page-title">{title}</h1>
                    {subtitle && <p className="ui-page-subtitle">{subtitle}</p>}
                </div>
                {actions && <div className="ui-page-actions">{actions}</div>}
            </div>
        </header>
    )
}
