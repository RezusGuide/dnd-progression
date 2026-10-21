import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import Logo from './brand/Logo'

// Sunny office header, shown on every page. Always the night palette
// (data-theme="night"), whatever theme the page below uses.
//
// Below ~800px (see .hall-nav-toggle in index.css) the link list and the
// account controls collapse behind a hamburger button instead of wrapping
// onto several lines and pushing the page content down.
export default function NavBar() {
    const { user, logout, hasSection } = useAuth()
    const { t } = useLang()
    const [menuOpen, setMenuOpen] = useState(false)
    const closeMenu = () => setMenuOpen(false)
    const linkClass = ({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`

    return (
        <nav className="hall-nav" data-theme="night" aria-label="Основная навигация">
            <div className="hall-nav-top">
                <NavLink to="/" className="hall-nav-brand" onClick={closeMenu} aria-label="Санни инкорпорейтед, на главную">
                    <Logo variant="full" size={40} />
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
                <NavLink to="/characters" className={linkClass} onClick={closeMenu}>{t('navCharacters')}</NavLink>
                <NavLink to="/campaigns" className={linkClass} onClick={closeMenu}>{t('navCampaigns')}</NavLink>
                <NavLink to="/announcements" className={linkClass} onClick={closeMenu}>{t('navAnnouncements')}</NavLink>
                {hasSection('*') && (
                    <NavLink to="/admin" className={linkClass} onClick={closeMenu}>{t('navAdmin')}</NavLink>
                )}
            </div>

            <div className={`hall-nav-right${menuOpen ? ' open' : ''}`}>
                {user ? (
                    <>
                        <NavLink to="/account" className="hall-nav-user" title={t('navAccount')} onClick={closeMenu}>{user.username}</NavLink>
                        <button type="button" className="hall-nav-btn" onClick={() => { closeMenu(); logout() }}>{t('navLogout')}</button>
                    </>
                ) : (
                    <NavLink to="/login" className="hall-nav-btn" onClick={closeMenu}>{t('navLogin')}</NavLink>
                )}
            </div>
        </nav>
    )
}
