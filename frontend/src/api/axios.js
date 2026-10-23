import axios from 'axios'
import { announceApiError, classifyApiError } from './apiErrors'

// VITE_API_URL in Vercel's project settings is the backend's public address
// (the Tailscale Funnel of the GM's PC, see docs/zlatopryady/HOME-HOSTING.md).
// Falls back to local dev.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// 5xx / 503 / no response at all -> a banner at the top of the page (see
// ErrorBanner.jsx). The error is still rejected so each caller keeps its
// own handling; 4xx (incl. 401) are left entirely to the callers.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const kind = classifyApiError(error)
        if (kind) announceApiError(kind)
        return Promise.reject(error)
    },
)

export default api
