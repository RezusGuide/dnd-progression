import CatFace from './CatFace'

// Just the cat's head - avatar for hints, the loader, small error banners.
export default function CatHead({ size = 48, decorative = true, label = 'Кот Санни', sleeping = false, className = '' }) {
    const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }
    return (
        <svg viewBox="60 30 200 205" width={size} height={size * 205 / 200} className={`mascot cat cat-head-only ${className}`} {...a11y}>
            <CatFace sleeping={sleeping} />
        </svg>
    )
}
