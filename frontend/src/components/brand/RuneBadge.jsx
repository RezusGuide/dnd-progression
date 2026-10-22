// The rune as a small brass gear carrying ᛉ; colour by rune level
// (COMMON / ARISTOCRAT / ROYAL - see styles/brand.css).
const TEETH = [0, 45, 90, 135, 180, 225, 270, 315]

export default function RuneBadge({ tier = 'COMMON', size = 28, label }) {
    const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={`rune-badge rune-${String(tier).toLowerCase()}`} {...a11y}>
            <g className="rune-badge-gear">
                {TEETH.map((deg) => (
                    <rect key={deg} x="10" y="0.5" width="4" height="5" rx="1" transform={deg ? `rotate(${deg} 12 12)` : undefined} />
                ))}
                <circle cx="12" cy="12" r="8.5" />
            </g>
            <circle cx="12" cy="12" r="6" className="rune-badge-face" />
            <path d="M12 16.5 V7.5 M12 12 L8.5 8.5 M12 12 L15.5 8.5" className="rune-badge-mark" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
    )
}
