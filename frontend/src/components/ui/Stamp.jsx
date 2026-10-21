const TEXT = {
    approved: 'ОДОБРЕНО',
    rejected: 'ОТКАЗАНО',
    pending: 'НА РАССМОТРЕНИИ',
}

// Rubber stamp. Slight tilt and a short "thump" when it appears
// (static under prefers-reduced-motion).
export default function Stamp({ kind = 'approved', children, className = '' }) {
    return (
        <span className={`ui-stamp ui-stamp-${kind} ${className}`.trim()} role="status">
            {children || TEXT[kind]}
        </span>
    )
}
