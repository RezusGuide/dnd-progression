import axios from 'axios'
import { API_BASE } from '../api/axios'

// Is the office open? A bare GET /api/health past the shared axios
// instance, so a failed check never raises the error banner by itself.
export async function checkHealth(timeout = 5000) {
    try {
        const res = await axios.get(`${API_BASE}/api/health`, { timeout })
        return res.data?.status === 'ok'
    } catch {
        return false
    }
}
