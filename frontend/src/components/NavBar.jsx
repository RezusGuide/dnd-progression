import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import LangToggle from './LangToggle'

// Shown on every page, Home included - it used to hide on Home for a
// cinematic 3D scene whose own portal buttons acted as navigation; that
// scene's gone now (broken WebGL rendering, see git history), so the shell
// nav is the one consistent way to move around everywhere.
//
// Below ~800px (see .hall-nav-toggle in index.css) the link list and the
// lang/login controls collapse behind a hamburger button instead of
// wrapping onto several lines - on a phone that used to push a page's
// actual content down by ~180px before you'd even scrolled.
export default function NavBar() {
    const { user, logout, hasSection } = useAuth()
    const { t } = useLang()
    const [menuOpen, setMenuOpen] = useState(false)
    const closeMenu = () => setMenuOpen(false)
    const linkClass = ({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`

    return (
        <nav className="hall-nav">
            <div className="hall-nav-top">
                <NavLink to="/" className="hall-nav-brand" onClick={closeMenu}>
                    {t('homeTitle')}
                </NavLink>
                <button
                    type="button"
                    className="hall-nav-toggle"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label={t('navToggleMenu')}
                    aria-expanded={menuOpen}
                >
                    <span /><span /><span />
                </button>
            </div>

            <div className={`hall-nav-links${menuOpen ? ' open' : ''}`}>
                <NavLink to="/characters" className={linkClass} onClick={closeMenu}>{t('navDnd')}</NavLink>
                <NavLink to="/announcements" className={linkClass} onClick={closeMenu}>{t('navAnnouncements')}</NavLink>
                {hasSection('*') && (
                    <NavLink to="/admin" className={linkClass} onClick={closeMenu}>{t('navAdmin')}</NavLink>
                )}
            </div>

            <div className={`hall-nav-right${menuOpen ? ' open' : ''}`}>
                <LangToggle />
                {user ? (
                    <>
                        <NavLink to="/account" className="tome-username" style={{ textDecoration: 'none' }} title={t('accountTitle')} onClick={closeMenu}>{user.username}</NavLink>
                        <button className="tome-btn-ghost" onClick={() => { closeMenu(); logout() }}>{t('leave')}</button>
                    </>
                ) : (
                    <NavLink to="/login" className="tome-btn-ghost" onClick={closeMenu}>{t('enterRealm')}</NavLink>
                )}
            </div>
        </nav>
    )
}
