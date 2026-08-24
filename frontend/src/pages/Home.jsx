import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import api from '../api/axios'
import { createHomeScene } from '../three/homeScene'
import LangToggle from '../components/LangToggle'
import '../styles/home3d.css'

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

const PORTAL_COLORS = {
    portfolio: '#3ddc6f',
    media: '#ffffff',
    useful: '#ff2e97',
    dnd: '#c9a24b',
    minecraft: '#5d9c3e',
}

const PORTAL_KEYS = Object.keys(PORTAL_ROUTES)

export default function Home() {
    const { t, lang } = useLang()
    const navigate = useNavigate()
    const canvasHostRef = useRef(null)
    const introRef = useRef(null)
    const scrollHintRef = useRef(null)
    const portalRefs = useRef({})
    const [webglFailed, setWebglFailed] = useState(false)
    const [profile, setProfile] = useState(null)

    useEffect(() => {
        api.get('/api/portfolio/profile').then((res) => setProfile(res.data)).catch(() => {})
    }, [])

    // Same EN-with-RU-fallback rule as the Portfolio page - see the `pick`
    // helper there for why.
    const tagline = lang === 'ru' && profile?.taglineRu ? profile.taglineRu : profile?.tagline

    useEffect(() => {
        if (!canvasHostRef.current) return undefined

        // Coming here from a page scrolled halfway down (or the browser
        // restoring a previous scroll position on back/forward) is what
        // made this page look like it "flashed and disappeared" - it
        // rendered mid-reveal instead of at rest. Force a clean start
        // every time this page mounts.
        const previousRestoration = window.history.scrollRestoration
        window.history.scrollRestoration = 'manual'
        window.scrollTo(0, 0)

        const scene = createHomeScene(canvasHostRef.current)
        if (scene.failed) {
            setWebglFailed(true)
            return () => { window.history.scrollRestoration = previousRestoration }
        }

        const setOpacity = (el, value) => { if (el) el.style.opacity = String(value) }
        const setPos = (el, x, y) => {
            if (!el) return
            el.style.left = `${x}px`
            el.style.top = `${y}px`
        }

        const onScroll = () => {
            const maxScroll = document.body.scrollHeight - window.innerHeight
            const p = maxScroll > 0 ? window.scrollY / maxScroll : 0
            scene.setProgress(p)

            const introOpacity = Math.max(0, 1 - p * 3.2)
            setOpacity(introRef.current, introOpacity)
            if (scrollHintRef.current) {
                scrollHintRef.current.style.display = introOpacity > 0.05 ? 'flex' : 'none'
                setOpacity(scrollHintRef.current, introOpacity)
            }
        }
        const onResize = () => scene.resize()

        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onResize)
        onScroll()

        let raf
        const updatePortals = () => {
            const maxScroll = document.body.scrollHeight - window.innerHeight
            const p = maxScroll > 0 ? window.scrollY / maxScroll : 0
            const portalsOpacity = Math.min(1, Math.max(0, (p - 0.55) / 0.35))

            PORTAL_KEYS.forEach((key) => {
                const el = portalRefs.current[key]
                if (!el) return
                const point = scene.projectPoint(key)
                if (!point || !point.visible || portalsOpacity <= 0.02) {
                    el.style.display = 'none'
                    return
                }
                el.style.display = 'block'
                setOpacity(el, portalsOpacity)
                setPos(el, point.x, point.y)
            })
            raf = requestAnimationFrame(updatePortals)
        }
        raf = requestAnimationFrame(updatePortals)

        return () => {
            window.history.scrollRestoration = previousRestoration
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onResize)
            cancelAnimationFrame(raf)
            scene.dispose()
        }
    }, [])

    if (webglFailed) {
        // No WebGL available - skip the 3D scene entirely and show the same
        // bio plus plain, always-visible links to every section instead of
        // invisible portals (which only make sense once you can see what
        // they're floating over).
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

    return (
        <div className="home3d-spacer">
            <div className="home3d-stage">
                <LangToggle variant="floating" />
                <div className="home3d-canvas" ref={canvasHostRef} />

                <div className="home3d-intro" ref={introRef}>
                    <p className="home3d-kicker">{t('homeKicker')}</p>
                    <h1 className="home3d-name">{profile?.name || t('homeTitle')}</h1>
                    <p className="home3d-bio">{tagline || t('homeSubtitle')}</p>
                </div>

                <div className="home3d-scrollhint" ref={scrollHintRef}>
                    <span>{t('homeScrollHint')}</span>
                    <span>▾</span>
                </div>

                {PORTAL_KEYS.map((key) => (
                    <button
                        key={key}
                        ref={(el) => { portalRefs.current[key] = el }}
                        className="home3d-portal"
                        style={{ display: 'none', color: PORTAL_COLORS[key] }}
                        onClick={() => navigate(PORTAL_ROUTES[key])}
                        aria-label={t(PORTAL_LABEL_KEYS[key])}
                    >
                        <span className="home3d-portal-ring" />
                        <span className="home3d-portal-label">{t(PORTAL_LABEL_KEYS[key])}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
