// Сундучок: the mimic storekeeper with a badge. Transcribed from
// docs/zlatopryady/assets/mascot-mimic.svg. Group names are animation hooks:
// mimic-lid pivots on its hinge near (30, 94) - see styles/brand.css.
export default function MimicMascot({ size = 160, decorative = false, label = 'Сундучок', className = '' }) {
    const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }
    return (
        <svg viewBox="0 0 200 200" width={size} height={size} className={`mascot mimic ${className}`} {...a11y}>
            <g className="mimic-body">
                <ellipse className="m-paper-line" cx="100" cy="186" rx="62" ry="8" />
                <ellipse className="m-mimic-feet" cx="68" cy="176" rx="20" ry="9" />
                <ellipse className="m-mimic-feet" cx="132" cy="176" rx="20" ry="9" />
                <rect className="m-mimic-wood" x="30" y="92" width="140" height="80" rx="12" />
            </g>
            <path className="mimic-tongue m-ember" d="M88 98 V128 Q100 144 112 128 V98 Z" />
            <path className="mimic-teeth m-paper m-paper-stroke" d="M48 98 L56 110 L64 98 M136 98 L144 110 L152 98" strokeWidth="2" strokeLinejoin="round" />
            <g className="mimic-lid">
                <path className="m-mimic-lid" d="M30 94 Q30 36 100 36 Q170 36 170 94 Z" />
                <rect className="m-brass" x="30" y="88" width="140" height="10" />
                <circle className="m-white" cx="76" cy="66" r="14" />
                <circle className="m-white" cx="124" cy="66" r="14" />
                <circle className="m-ink" cx="78" cy="68" r="6" />
                <circle className="m-ink" cx="122" cy="68" r="6" />
                <circle className="m-white" cx="80" cy="65" r="2" />
                <circle className="m-white" cx="124" cy="65" r="2" />
                <circle className="m-dawn" cx="100" cy="94" r="9" />
                <circle className="m-ink" cx="100" cy="94" r="3.5" />
            </g>
            <g className="mimic-badge">
                <path className="m-ink-stroke" d="M150 110 V120" strokeWidth="2" />
                <rect className="m-steam m-ink-stroke" x="138" y="120" width="24" height="30" rx="4" strokeWidth="2" />
                <path className="m-dawn" d="M144 138 A6 6 0 0 1 156 138 Z" />
            </g>
        </svg>
    )
}
