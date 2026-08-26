import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import api from '../api/axios'
import LangToggle from '../components/LangToggle'
import '../styles/home3d.css'

// Plain landing page - name/tagline plus a link to every section. Used to
// be a cinematic Three.js scene with floating portal buttons; that scene
// turned out unreliable in practice (WebGL context loss, broken renders on
// some machines/browsers - see the screenshot that prompted this), so it's
// gone. This is what used to be only the no-WebGL fallback path, now the
// only path.
const PORTAL_ROUTES = {
    portfolio: '/portfolio',
    media: '/media',
    useful: '/useful',
    dnd: '/characters',
    minecraft: '/minecraft',
}

const PORTAL_LABEL_KEYS = {
    portfolio: 'navPortfolio',
    media: 'navMedia',
    useful: 'navUseful',
    dnd: 'navDnd',
    minecraft: 'navMinecraft',
}

const PORTAL_KEYS = Object.keys(PORTAL_ROUTES)

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
        <div className="home3d-fallback">
            <LangToggle variant="floating" />
            <p className="home3d-kicker">{t('homeKicker')}</p>
            <h1 className="home3d-name">{profile?.name || t('homeTitle')}</h1>
            <p className="home3d-bio">{tagline || t('homeSubtitle')}</p>
            <div className="home3d-fallback-links">
                {PORTAL_KEYS.map((key) => (
                    <button key={key} className="home3d-fallback-link" onClick={() => navigate(PORTAL_ROUTES[key])}>
                        {t(PORTAL_LABEL_KEYS[key])}
                    </button>
                ))}
            </div>
        </div>
    )
}
