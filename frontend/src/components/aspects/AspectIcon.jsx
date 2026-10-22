// Line glyphs for the 19 aspects of "Исследования Санни", 24×24, one
// stroke style. The colour comes from data/aspects.json; the glyph sits on
// a dark ink disc so it keeps its contrast on parchment and at night alike.

const GLYPHS = {
    // Рассвет: half sun on the horizon.
    dawn: <><path d="M4 16h16" /><path d="M7.5 16a4.5 4.5 0 0 1 9 0" /><path d="M12 7.5V9.5M6.3 10.2l1.4 1.4M17.7 10.2l-1.4 1.4" /></>,
    // Тень: crescent.
    shadow: <path d="M15.5 4.5a7.5 7.5 0 1 0 4 12.5 6 6 0 0 1-4-12.5z" />,
    // Пар: rising wisps.
    steam: <><path d="M8 19c-1.5-2 1.5-3.5 0-5.5S8 10 9 8.5" /><path d="M12 19c-1.5-2 1.5-3.5 0-5.5S12 9 13 6" /><path d="M16 19c-1.5-2 1.5-3.5 0-5.5S16 10 17 8.5" /></>,
    // Сон: spiral.
    dream: <path d="M12 12.2a1.2 1.2 0 1 1 1.2-1.2 2.6 2.6 0 0 1-2.6 2.6 3.9 3.9 0 0 1-3.9-3.9 5.2 5.2 0 0 1 5.2-5.2 6.5 6.5 0 0 1 6.5 6.5 7.8 7.8 0 0 1-7.8 7.8" />,
    // Порядок: rune lozenge with a bar.
    order: <><path d="M12 4l6 8-6 8-6-8z" /><path d="M9 12h6" /></>,
    // Разлом: crack.
    rift: <path d="M13 3l-3 6 4 2-4 4 2 2-3 4" />,
    // Шестерня: cog.
    gear: <><circle cx="12" cy="12" r="3" /><path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.7 6.7l1.6 1.6M15.7 15.7l1.6 1.6M6.7 17.3l1.6-1.6M15.7 8.3l1.6-1.6" /><circle cx="12" cy="12" r="5.6" /></>,
    // Мираж: two offset triangles, one dashed.
    mirage: <><path d="M10 6l5 9H5z" /><path d="M14 9l5 9H9z" strokeDasharray="2 2" /></>,
    // Пламя: flame.
    flame: <><path d="M12 20c-3.5 0-5.5-2.4-5.5-5.2 0-3.4 3-5 3.5-8.8 2.7 1.8 4 3.6 4.2 5.5 1-.6 1.5-1.6 1.6-2.7 1.4 1.4 1.7 3 1.7 4.3C17.5 17.8 15.4 20 12 20z" /></>,
    // Оберег: shield.
    ward: <><path d="M12 4l6.5 2.5V11c0 4.2-2.8 7.2-6.5 9-3.7-1.8-6.5-4.8-6.5-9V6.5z" /><path d="M12 8v8" /></>,
    // Тлен: withered leaf.
    decay: <><path d="M5 19c0-7 4-12 14-14-1 9-5 14-12 13" /><path d="M5 19l7-7M10 14.5l1 2M13 11.5l1.5 1" /></>,
    // Туман: drifting bands.
    fog: <><path d="M4 8.5c2 1.3 4-1.3 6 0s4 1.3 6 0 2.7-.7 4 0" /><path d="M4 12.5c2 1.3 4-1.3 6 0s4 1.3 6 0 2.7-.7 4 0" /><path d="M6 16.5c2 1.3 4-1.3 6 0s3 1 4.5.3" /></>,
    // Врата: arch.
    portal: <><path d="M6 20V11a6 6 0 0 1 12 0v9" /><path d="M4 20h16" /><path d="M9.5 20v-7.5a2.5 2.5 0 0 1 5 0V20" /></>,
    // Кошмар: eye with a slit pupil and spikes.
    nightmare: <><path d="M3.5 12C6 8 9 6.5 12 6.5S18 8 20.5 12C18 16 15 17.5 12 17.5S6 16 3.5 12z" /><path d="M12 9v6" /><path d="M7 5l1 2M12 3.5V5.5M17 5l-1 2" /></>,
    // Прозрение: open eye.
    oracle: <><path d="M3.5 12C6 8 9 6.5 12 6.5S18 8 20.5 12C18 16 15 17.5 12 17.5S6 16 3.5 12z" /><circle cx="12" cy="12" r="2.5" /></>,
    // Буря: lightning.
    storm: <path d="M13.5 3L6.5 13h5l-1 8 7-10h-5z" />,
    // Эссенция: gem with a core.
    essence: <><path d="M12 3.5l6.5 8.5-6.5 8.5-6.5-8.5z" /><path d="M5.5 12h13" /><circle cx="12" cy="12" r="1.3" /></>,
    // Жизнь: sprout.
    life: <><path d="M12 20v-9" /><path d="M12 13c-4 0-6-2.5-6-6 4 0 6 2.5 6 6z" /><path d="M12 11c0-3.5 2-6 6-6 0 3.5-2 6-6 6z" /></>,
    // Механизм: piston and a small cog.
    machine: <><path d="M4 18h9V9H4z" /><path d="M8.5 9V5M6.5 5h4" /><circle cx="17" cy="14" r="2" /><path d="M17 10.3v1.1M17 16.6v1.1M13.3 14h1.1M19.6 14h1.1" /></>,
}

export default function AspectIcon({ aspect, size = 28, title, className = '' }) {
    const key = aspect?.key || aspect
    const color = aspect?.color || 'currentColor'
    const glyph = GLYPHS[key]
    return (
        <svg className={`aspect-icon ${className}`.trim()} width={size} height={size} viewBox="0 0 32 32"
            role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
            {title && <title>{title}</title>}
            <circle cx="16" cy="16" r="15.5" fill="var(--sunny-night-sunken, #0C1629)" stroke={color} strokeOpacity="0.55" />
            <g transform="translate(4 4)" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {glyph || <circle cx="12" cy="12" r="4" />}
            </g>
        </svg>
    )
}
