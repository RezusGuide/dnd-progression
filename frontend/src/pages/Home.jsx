import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

// Landing page - hero (name/tagline) plus a card grid to every section.
// Shares the "hub" design system (see index.css) with Portfolio and Media;
// Minecraft/D&D/Useful Functions are reached from here but keep their own
// look once you're inside them.
const SECTIONS = [
    { key: 'portfolio', route: '/portfolio', icon: '◆', labelKey: 'navPortfolio', descKey: 'homeSectionPortfolio' },
    { key: 'media', route: '/media', icon: '▶', labelKey: 'navMedia', descKey: 'homeSectionMedia' },
    { key: 'dnd', route: '/characters', icon: '⚔', labelKey: 'navDnd', descKey: 'homeSectionDnd' },
    { key: 'minecraft', route: '/minecraft', icon: '⛏', labelKey: 'navMinecraft', descKey: 'homeSectionMinecraft' },
]

export default function Home() {
    const { t, lang } = useLang()
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)

    useEffect(() => {
        api.get('/api/portfolio/profile').then((res) => setProfile(res.data)).catch(() => {})
    }, [])

    // Same EN-with-RU-fallback rule as the Portfolio page - see the `pick`
    // helper there for why.
    const tagline = lang === 'ru' && profile?.taglineRu ? profile.taglineRu : profile?.tagline

    return (
        <div className="hub-page">
            <div className="hub-hero">
                <p className="hub-kicker">{t('homeKicker')}</p>
                <h1 className="hub-name">{profile?.name || t('homeTitle')}</h1>
                <p className="hub-tagline">{tagline || t('homeSubtitle')}</p>
            </div>

            <div className="hub-sections">
                {SECTIONS.map((s) => (
                    <button key={s.key} className="hub-section-card" onClick={() => navigate(s.route)}>
                        <span className="hub-section-icon">{s.icon}</span>
                        <span className="hub-section-title">{t(s.labelKey)}</span>
                        <span className="hub-section-desc">{t(s.descKey)}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
