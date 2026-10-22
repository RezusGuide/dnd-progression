import { useEffect, useState } from 'react'
import api from '../api/axios'

// Reference data from GET /api/data/{name} (races, classes, backgrounds,
// runes) - the backend's resources/data/*.json is the only copy. Each name
// is fetched once per page load and shared.
const cache = {}

export function loadRefData(name) {
    if (!cache[name]) {
        cache[name] = api.get(`/api/data/${name}`)
            .then((res) => (Array.isArray(res.data) ? res.data : []))
            .catch((err) => { delete cache[name]; throw err })
    }
    return cache[name]
}

// [list | null while loading, error | null]
export function useRefData(name) {
    const [state, setState] = useState({ list: null, error: null })
    useEffect(() => {
        let alive = true
        loadRefData(name)
            .then((list) => { if (alive) setState({ list, error: null }) })
            .catch((error) => { if (alive) setState({ list: null, error }) })
        return () => { alive = false }
    }, [name])
    return [state.list, state.error]
}
