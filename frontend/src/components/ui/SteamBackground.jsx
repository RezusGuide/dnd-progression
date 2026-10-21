// Soft drifting puffs of steam behind a page's content. Purely decorative;
// frozen under prefers-reduced-motion.
const PUFFS = [
    { left: '8%', size: 180, delay: '0s', dur: '14s' },
    { left: '28%', size: 120, delay: '-5s', dur: '11s' },
    { left: '55%', size: 220, delay: '-9s', dur: '16s' },
    { left: '78%', size: 140, delay: '-2s', dur: '12s' },
    { left: '90%', size: 100, delay: '-7s', dur: '10s' },
]

export default function SteamBackground() {
    return (
        <div className="ui-steam" aria-hidden="true">
            {PUFFS.map((p) => (
                <span
                    key={p.left}
                    className="ui-steam-puff"
                    style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }}
                />
            ))}
        </div>
    )
}
