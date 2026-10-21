import { useId } from 'react'

const RAYS = [
    [148.5, 90, 165.8, 80],
    [128, 69.5, 138, 52.2],
    [100, 62, 100, 42],
    [72, 69.5, 62, 52.2],
    [51.5, 90, 34.2, 80],
]
const TEETH = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]

// Below this emblem height the colour version turns to mush, so the mono
// one (drawn in currentColor) is used instead - see TZ-v1, section 3.
const MONO_BELOW = 56

// Sunny emblem: a sunrise over a brass gear carrying the ᛉ rune.
// Transcribed from docs/zlatopryady/assets/sunny-logo(-mono).svg.
export function Emblem({ size = 64, mono, title }) {
    const clipId = useId()
    const useMono = mono ?? size < MONO_BELOW
    const a11y = title
        ? { role: 'img', 'aria-label': title }
        : { 'aria-hidden': true }

    return (
        <svg viewBox="0 0 200 200" width={size} height={size} className={`emblem${useMono ? ' emblem-mono' : ''}`} {...a11y}>
            <defs>
                <clipPath id={clipId}><circle cx="100" cy="100" r="88" /></clipPath>
            </defs>
            {useMono ? (
                <circle cx="100" cy="100" r="93" fill="none" stroke="currentColor" strokeWidth="7" />
            ) : (
                <>
                    <circle cx="100" cy="100" r="96" className="emblem-ground" />
                    <circle cx="100" cy="100" r="88" fill="none" className="emblem-ring" strokeWidth="3" />
                </>
            )}
            <g className="emblem-rays" strokeWidth="7" strokeLinecap="round">
                {RAYS.map(([x1, y1, x2, y2]) => <line key={x1} x1={x1} y1={y1} x2={x2} y2={y2} />)}
            </g>
            <path className="emblem-sun" d="M56 118 A44 44 0 0 1 144 118 Z" />
            <g clipPath={`url(#${clipId})`}>
                <g className="emblem-gear">
                    {TEETH.map((deg) => (
                        <rect key={deg} x="94" y="116" width="12" height="13" rx="2" transform={deg ? `rotate(${deg} 100 160)` : undefined} />
                    ))}
                    {useMono ? (
                        <circle cx="100" cy="160" r="30" fill="none" stroke="currentColor" strokeWidth="7" />
                    ) : (
                        <>
                            <circle cx="100" cy="160" r="36" />
                            <circle cx="100" cy="160" r="15" className="emblem-hub" />
                        </>
                    )}
                </g>
                <path
                    className="emblem-rune"
                    d={useMono ? 'M100 170 V152 M100 160 L92 152 M100 160 L108 152' : 'M100 168 V152 M100 160 L93 153 M100 160 L107 153'}
                    strokeWidth={useMono ? 4 : 3}
                    strokeLinecap="round"
                    fill="none"
                />
            </g>
        </svg>
    )
}

// variant="full": emblem + SUNNY wordmark + "инкорпорейтед".
// variant="emblem": the emblem alone.
// `size` is the emblem height in px; the clear space around the whole mark
// is half the visible gear height (the gear fills ~36% of the emblem).
export default function Logo({ variant = 'full', size = 64, mono, className = '' }) {
    const clearSpace = Math.round(size * 0.18)

    if (variant === 'emblem') {
        return (
            <span className={`logo ${className}`} style={{ padding: clearSpace }}>
                <Emblem size={size} mono={mono} title="Эмблема Санни инкорпорейтед" />
            </span>
        )
    }

    return (
        <span className={`logo logo-full ${className}`} style={{ padding: clearSpace, gap: Math.round(size * 0.22) }} role="img" aria-label="Санни инкорпорейтед">
            <Emblem size={size} mono={mono} />
            <span className="logo-words" aria-hidden="true" style={{ fontSize: size * 0.5 }}>
                <span className="logo-sunny">SUNNY</span>
                <span className="logo-inc">инкорпорейтед</span>
            </span>
        </span>
    )
}
