// API failures that deserve a site-wide banner (500 / 503 / offline) are
// broadcast as a window CustomEvent so the axios instance doesn't need to
// know about React. ErrorBanner.jsx listens; pages can too.
export const API_ERROR_EVENT = 'sunny:api-error'

// While a full-page ErrorScreen is mounted it already explains what went
// wrong, so the banner stays quiet (even for requests that fail later).
let fullScreenErrors = 0

export function classifyApiError(error) {
    if (error?.code === 'ERR_CANCELED') return null
    if (!error?.response) return 'offline'
    const status = error.response.status
    if (status === 503) return 503
    if (status >= 500) return 500
    return null
}

export function announceApiError(kind) {
    if (kind && fullScreenErrors > 0) return
    window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: { kind } }))
}

// Called by ErrorScreen on mount; returns the cleanup for unmount.
export function holdApiBanner() {
    fullScreenErrors += 1
    announceApiError(null)
    return () => { fullScreenErrors -= 1 }
}
