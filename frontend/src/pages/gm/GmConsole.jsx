import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ErrorScreen from '../../components/errors/ErrorScreen'
import { Loader } from '../../components/ui'
import { SECTIONS } from '../../lib/gm'
import '../../styles/sheet.css'
import '../../styles/gm.css'

// Пульт ГМ: the side menu and the section on the right. Every section is
// its own route under /gm; /admin redirects here (Admin.jsx keeps the
// first-time setup at /admin?setup=1).
export default function GmConsole() {
    const { isGm } = useAuth()
    if (!isGm) return <ErrorScreen code={403} />
    return (
        <div className="parchment-page gm-page">
            <div className="gm-layout">
                <nav className="gm-side" aria-label="Разделы пульта">
                    <p className="gm-side-title">Пульт ГМ</p>
                    <ul>
                        {SECTIONS.map(([path, label]) => (
                            <li key={path}>
                                <NavLink to={path ? `/gm/${path}` : '/gm'} end={!path}
                                    className={({ isActive }) => `gm-side-link${isActive ? ' active' : ''}`}>{label}</NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
                <main className="gm-main">
                    <h1 className="visually-hidden">Пульт ГМ</h1>
                    {/* Sections load lazily; the menu stays while one loads. */}
                    <Suspense fallback={<Loader />}>
                        <Outlet />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
