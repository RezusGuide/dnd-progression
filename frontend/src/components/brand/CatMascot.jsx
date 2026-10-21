import CatFace from './CatFace'

// Sunny's mascot: a blue cat with a sun mark on its forehead.
// pose: 'idle' (default) or 'sleep' (closed eyes, for the 503 screen).
// decorative: hide from assistive tech when the text next to it says it all.
export default function CatMascot({ pose = 'idle', size = 160, decorative = false, label = 'Кот Санни', className = '' }) {
    const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }
    return (
        <svg viewBox="0 0 320 360" width={size} height={size * 360 / 320} className={`mascot cat cat-pose-${pose} ${className}`} {...a11y}>
            <g className="cat-tail">
                <path className="m-fur-shadow-stroke" d="M236 318 C310 318 318 236 274 214" fill="none" strokeWidth="24" strokeLinecap="round" />
                <circle className="m-dawn" cx="274" cy="214" r="13" />
            </g>
            <g className="cat-body">
                <ellipse className="m-fur" cx="160" cy="268" rx="72" ry="74" />
                <ellipse className="m-fur-light" cx="160" cy="284" rx="42" ry="50" />
                <ellipse className="m-fur" cx="118" cy="300" rx="14" ry="34" />
                <ellipse className="m-fur" cx="202" cy="300" rx="14" ry="34" />
                <ellipse className="m-fur" cx="116" cy="334" rx="28" ry="15" />
                <ellipse className="m-fur" cx="204" cy="334" rx="28" ry="15" />
                <path className="m-fur-shadow-stroke" d="M108 338 V330 M118 340 V331 M128 338 V330 M196 338 V330 M206 340 V331 M216 338 V330" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path className="m-ink-stroke" d="M100 226 Q160 258 220 226" fill="none" strokeWidth="14" strokeLinecap="round" />
            </g>
            <CatFace sleeping={pose === 'sleep'} />
            <g className="cat-bell">
                <circle className="m-brass" cx="160" cy="246" r="15" />
                <circle className="m-ink" cx="160" cy="246" r="6" />
            </g>
        </svg>
    )
}
