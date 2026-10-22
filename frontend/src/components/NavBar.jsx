import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import Logo from './brand/Logo'
import MimicChip from './chest/MimicChip'
import { totalSealed, useSealedCounts } from '../lib/chest'

// Sunny office header, shown on every page. Always the night palette
// (data-theme="night"), whatever theme the page below uses.
//
// Widths (index.css, .hall-nav):
//   1200px and up - one line; the user's name opens a profile menu
//                   («Мой пропуск», «Сдать пропуск»);
//   1024-1199px   - «Объявления» and «Календарь» move into «Ещё»;
//   below 1024px  - a hamburger; everything stacks, menus open inline.
export default function NavBar() {
    const { user, logout, hasSection } = useAuth()
    const { t } = useLang()
    const [menuOpen, setMenuOpen] = useState(false)
    const [popup, setPopup] = useState(null) // 'more' | 'profile' | null
    const ref = useRef(null)
    const sealed = totalSealed(useSealedCounts(!!user))
    const close = () => { setMenuOpen(false); setPopup(null) }
    const linkClass = ({ isActive }) => `hall-nav-link${isActive ? ' active' : ''}`

    // Popups close on a click elsewhere or on Escape.
    useEffect(() => {
        if (!popup) return
        const onClick = (e) => { if (!ref.current?.contains(e.target)) setPopup(null) }
        const onKey = (e) => { if (e.key === 'Escape') setPopup(null) }
        document.addEventListener('mousedown', onClick)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onClick)
            document.removeEventListener('keydown', onKey)
        }
    }, [popup])

    const toggle = (name) => setPopup((p) => (p === name ? null : name))

    return (
        <nav className="hall-nav" data-theme="night" aria-label="Основная навигация" ref={ref}>
            <div className="hall-nav-top">
                <NavLink to="/" className="hall-nav-brand" onClick={close} aria-label="Санни инкорпорейтед, на главную">
                    <Logo variant="full" size={40} />
                </NavLink>
                <button type="button" className="hall-nav-toggle" onClick={() => setMenuOpen((v) => !v)}
                    aria-label={t('navToggleMenu')} aria-expanded={menuOpen}>
                    <span /><span /><span />
                </button>
            </div>

            <div className={`hall-nav-links${menuOpen ? ' open' : ''}`}>
                <NavLink to="/" end className={linkClass} onClick={close}>{t('navHome')}</NavLink>
                <NavLink to="/characters" className={linkClass} onClick={close}>{t('navCharacters')}</NavLink>
                {user && (
                    <NavLink to="/chest" className={(a) => `${linkClass(a)} hall-nav-chest`} onClick={close}>
                        <MimicChip count={sealed} size={22} /> {t('navChest')}
                    </NavLink>
                )}
                <NavLink to="/campaigns" className={linkClass} onClick={close}>{t('navCampaigns')}</NavLink>
                <NavLink to="/announcements" className={(a) => `${linkClass(a)} hall-nav-extra`} onClick={close}>{t('navAnnouncements')}</NavLink>
                {user && <NavLink to="/calendar" className={(a) => `${linkClass(a)} hall-nav-extra`} onClick={close}>{t('navCalendar')}</NavLink>}
                <div className="hall-nav-more">
                    <button type="button" className="hall-nav-link hall-nav-menu-btn" aria-haspopup="true" aria-expanded={popup === 'more'}
                        onClick={() => toggle('more')}>{t('navMore')} <span aria-hidden="true">▾</span></button>
                    {popup === 'more' && (
                        <div className="hall-nav-popup" role="menu">
                            <NavLink role="menuitem" to="/announcements" className="hall-nav-popup-item" onClick={close}>{t('navAnnouncements')}</NavLink>
                            {user && <NavLink role="menuitem" to="/calendar" className="hall-nav-popup-item" onClick={close}>{t('navCalendar')}</NavLink>}
                        </div>
                    )}
                </div>
                {hasSection('*') && <NavLink to="/admin" className={linkClass} onClick={close}>{t('navAdmin')}</NavLink>}
            </div>

            <div className={`hall-nav-right${menuOpen ? ' open' : ''}`}>
                {user ? (
                    <div className="hall-nav-profile">
                        <button type="button" className="hall-nav-user hall-nav-menu-btn" aria-haspopup="true" aria-expanded={popup === 'profile'}
                            onClick={() => toggle('profile')}>{user.username} <span aria-hidden="true">▾</span></button>
                        <div className={`hall-nav-popup hall-nav-profile-menu${popup === 'profile' ? ' is-open' : ''}`} role="menu">
                            <NavLink role="menuitem" to="/account" className="hall-nav-popup-item" onClick={close}>{t('navAccount')}</NavLink>
                            <button role="menuitem" type="button" className="hall-nav-popup-item" onClick={() => { close(); logout() }}>{t('navLogout')}</button>
                        </div>
                    </div>
                ) : (
                    <NavLink to="/login" className="hall-nav-btn" onClick={close}>{t('navLogin')}</NavLink>
                )}
            </div>
        </nav>
    )
}
