import { useMemo } from 'react'
import { useRefData } from './refData'
import { buildGraph } from './research'

// Aspects, links and schools from /api/data/aspects|schools, ready for
// the research table, the bag and the GM panel. null while loading.
export function useMagicData() {
    const [aspects, aspectsError] = useRefData('aspects')
    const [schools, schoolsError] = useRefData('schools')
    const data = useMemo(() => {
        if (!aspects || !schools) return null
        return {
            aspects,
            byKey: Object.fromEntries(aspects.map((a) => [a.key, a])),
            graph: buildGraph(aspects),
            schools,
            schoolByKey: Object.fromEntries(schools.map((s) => [s.key, s])),
        }
    }, [aspects, schools])
    return [data, aspectsError || schoolsError]
}

// The bag as [{ aspect, count }] in data order (primal first), non-empty only.
export function bagEntries(bag, aspects) {
    return (aspects || []).filter((a) => (bag?.[a.key] || 0) > 0).map((a) => ({ aspect: a, count: bag[a.key] }))
}
