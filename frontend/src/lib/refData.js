import { useEffect, useState } from 'react'
import api from '../api/axios'

// Reference data from GET /api/data/{name} (races, classes, backgrounds,
// runes, sources) - the backend's resources/data/*.json is the only copy.
// Each name is fetched once per page load and shared. Races and classes
// depend on who asks (the GM sees more), so the cache is per session token.
const cache = {}

function sessionToken() {
    try {
        return localStorage.getItem('token') || ''
    } catch {
        return ''
    }
}

export function loadRefData(name) {
    const key = `${name}|${sessionToken()}`
    if (!cache[key]) {
        cache[key] = api.get(`/api/data/${name}`)
            .then((res) => (Array.isArray(res.data) ? res.data : []))
            .catch((err) => { delete cache[key]; throw err })
    }
    return cache[key]
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
