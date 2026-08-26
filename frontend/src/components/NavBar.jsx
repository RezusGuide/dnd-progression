import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import LangToggle from './LangToggle'

// Shown on every page, Home included - it used to hide on Home for a
// cinematic 3D scene whose own portal buttons acted as navigation; that
// scene's gone now (broken WebGL rendering, see git history), so the shell
// nav is the one consistent way to move around everywhere.
export default function NavBar() {
    const { user, logout, hasSection } = useAuth()
    const { t } = useLang()

    return (
        <nav className="hall-nav">
            <NavLink to="/" className="hall-nav-brand">
                {t('homeTitle')}
            </NavLink>

            <div className="hall-nav-links">
                <NavLink to="/portfolio" className={({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`}>
                    {t('navPortfolio')}
                </NavLink>
                <NavLink to="/media" className={({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`}>
                    {t('navMedia')}
                </NavLink>
                <NavLink to="/characters" className={({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`}>
                    {t('navDnd')}
                </NavLink>
                <NavLink to="/minecraft" className={({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`}>
                    {t('navMinecraft')}
                </NavLink>
                <NavLink to="/announcements" className={({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`}>
                    {t('navAnnouncements')}
                </NavLink>
                <NavLink to="/downloads" className={({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`}>
                    {t('navDownloads')}
                </NavLink>
                {hasSection('*') && (
                    <NavLink to="/useful" className={({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`}>
                        {t('navUseful')}
                    </NavLink>
                )}
                {hasSection('*') && (
                    <NavLink to="/admin" className={({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`}>
                        {t('navAdmin')}
                    </NavLink>
                )}
            </div>

            <div className="hall-nav-right">
                <LangToggle />
                {user ? (
                    <>
                        <NavLink to="/account" className="tome-username" style={{ textDecoration: 'none' }} title={t('accountTitle')}>{user.username}</NavLink>
                        <button className="tome-btn-ghost" onClick={logout}>{t('leave')}</button>
                    </>
                ) : (
                    <NavLink to="/login" className="tome-btn-ghost">{t('enterRealm')}</NavLink>
                )}
            </div>
        </nav>
    )
}
