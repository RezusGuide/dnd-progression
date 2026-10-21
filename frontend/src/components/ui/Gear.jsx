// Small brass gear glyph - list markers, loader, decorations.
const TEETH = [0, 45, 90, 135, 180, 225, 270, 315]

export default function Gear({ size = 16, className = '' }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={`gear ${className}`} aria-hidden="true">
            <g className="gear-teeth">
                {TEETH.map((deg) => (
                    <rect key={deg} x="10" y="1" width="4" height="5" rx="1" transform={deg ? `rotate(${deg} 12 12)` : undefined} />
                ))}
                <circle cx="12" cy="12" r="7.5" />
            </g>
            <circle cx="12" cy="12" r="3" className="gear-hole" />
        </svg>
    )
}
