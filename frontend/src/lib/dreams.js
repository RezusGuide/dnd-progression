import { useEffect, useState } from 'react'
import api from '../api/axios'

// «Сны» (prompts/09-dreams-and-world.md): case numbers, statuses, the
// immersion stages. Stage names come from the «Погружение» article, so the
// GM can change them in the archive.

export const STATUS = {
    ANNOUNCED: 'Заявлено',
    OPEN: 'Открыто',
    CLEARED: 'Зачищено',
    DISTORTED: 'Искажено',
}

export const MAX_STAGE = 4
export const IMMERSION_SLUG = 'immersion'

/** «№0012». */
export const caseNumber = (n) => `№${String(n).padStart(4, '0')}`

/**
 * Stage names from the table in the «Погружение» article:
 * | 2 | Меняется одежда | → { 2: 'Меняется одежда' }. Stage 0 is always
 * «Погружения нет».
 */
export function stageLabels(body) {
    const out = { 0: 'Погружения нет' }
    for (const line of (body || '').split('\n')) {
        const m = /^\|\s*([0-4])\s*\|\s*([^|]+?)\s*\|/.exec(line.trim())
        if (m && m[1] !== '0') out[m[1]] = m[2]
    }
    return out
}

/** Stage names from the «Погружение» article (defaults if it is hidden). */
export function useStageLabels() {
    const [labels, setLabels] = useState(() => stageLabels(''))
    useEffect(() => {
        api.get(`/api/world/${IMMERSION_SLUG}`).then((res) => setLabels(stageLabels(res.data.body))).catch(() => {})
    }, [])
    return labels
}

export const stageLabel = (labels, stage) => labels?.[stage] || `Стадия ${stage}`

export const closedText = (status) =>
    status === 'CLEARED' ? 'Дело закрыто. Итог: зачищено.' : status === 'DISTORTED' ? 'Дело закрыто. Итог: искажено.' : null
