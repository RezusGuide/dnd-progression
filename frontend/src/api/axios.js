import axios from 'axios'

// Set VITE_API_URL in Vercel's project settings once the Railway backend is
// deployed (see the root README). Falls back to local dev.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default api
