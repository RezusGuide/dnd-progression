import { MAX_STAGE, stageLabel } from '../../lib/dreams'

// Five marks, 0-4; the current stage is lit and named below.
export default function ImmersionTracker({ stage, labels }) {
    return (
        <div className="immersion">
            <ol className="immersion-scale" aria-label={`Погружение: стадия ${stage} из ${MAX_STAGE}`}>
                {Array.from({ length: MAX_STAGE + 1 }, (_, s) => (
                    <li key={s} className={`immersion-mark ${s <= stage ? 'is-reached' : ''} ${s === stage ? 'is-current' : ''}`}
                        title={stageLabel(labels, s)} aria-current={s === stage ? 'step' : undefined}>
                        <span>{s}</span>
                    </li>
                ))}
            </ol>
            <p className="immersion-label">Стадия {stage}: {stageLabel(labels, stage)}</p>
        </div>
    )
}
