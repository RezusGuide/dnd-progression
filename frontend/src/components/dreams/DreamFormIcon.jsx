// The «form in the dream» mark: a half mask under a crescent.
export default function DreamFormIcon({ size = 18, title }) {
    return (
        <svg className="dream-form-icon" width={size} height={size} viewBox="0 0 24 24" role={title ? 'img' : undefined}
            aria-hidden={title ? undefined : 'true'} aria-label={title}>
            <path d="M15.5 2.5a6 6 0 1 0 6 7.2 4.8 4.8 0 1 1-6-7.2Z" fill="currentColor" opacity="0.55" />
            <path d="M3 11c2.5-1.2 5.5-1.6 9-1.2v4.4c0 3.8-2.4 6.8-5.2 6.8C4.4 21 3 18.5 3 15.6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="6.5" cy="13.8" r="1" fill="currentColor" />
            <circle cx="9.6" cy="13.8" r="1" fill="currentColor" />
        </svg>
    )
}
