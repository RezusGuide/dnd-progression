import { useEffect, useState } from 'react'
import { useLang } from '../context/LangContext'

// Auto-loads every image dropped into src/assets/gallery/ (see the README
// there) - no upload form, no backend, no manifest to keep in sync. eager +
// import:'default' resolves each match straight to its bundled URL string
// at build time instead of a lazy () => import() per file.
const modules = import.meta.glob('../assets/gallery/*.{jpg,jpeg,png,webp,gif}', { eager: true, import: 'default' })
const photos = Object.keys(modules)
    .sort()
    .map((path) => ({ path, url: modules[path] }))

export default function Gallery() {
    const { t } = useLang()
    const [active, setActive] = useState(null)

    useEffect(() => {
        if (!active) return
        const onKey = (e) => { if (e.key === 'Escape') setActive(null) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [active])

    return (
        <div className="hub-page">
            <div className="hub-hero">
                <p className="hub-kicker">{t('galleryKicker')}</p>
                <h1 className="hub-name">{t('galleryTitle')}</h1>
                <p className="hub-tagline">{t('gallerySubtitle')}</p>
            </div>

            <div className="hub-section">
                {photos.length === 0 ? (
                    <p className="hub-empty">{t('galleryEmpty')}</p>
                ) : (
                    <div className="hub-gallery-grid">
                        {photos.map((p) => (
                            <button
                                key={p.path}
                                type="button"
                                className="hub-gallery-tile"
                                onClick={() => setActive(p.url)}
                            >
                                <img src={p.url} alt="" loading="lazy" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {active && (
                <div className="hub-lightbox" onClick={() => setActive(null)}>
                    <img src={active} alt="" onClick={(e) => e.stopPropagation()} />
                    <button type="button" className="hub-lightbox-close" onClick={() => setActive(null)}>✕</button>
                </div>
            )}
        </div>
    )
}
