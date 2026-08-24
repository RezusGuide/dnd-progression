import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

// Wraps a page's content and only renders it once the current user's
// roles unlock `section`. Real access control lives on the backend
// (SecurityConfig) - this is just the matching frontend experience so a
// locked-out visitor sees an explanation instead of a wall of API errors.
export default function SectionGate({ section, children }) {
    const { user, hasSection } = useAuth()
    const { t } = useLang()

    if (hasSection(section)) {
        return children
    }

    return (
        <div className="tome-panel gate-panel">
            <h1 className="tome-title">{t('lockedTitle')}</h1>
            <p className="tome-subtitle">{t('lockedBody')}</p>
            {user ? (
                <p className="tome-empty">{t('lockedAskOwner')}</p>
            ) : (
                <p className="tome-link">
                    {t('lockedLogin')} <Link to="/login">{t('enterRealm')}</Link>
                </p>
            )}
        </div>
    )
}
