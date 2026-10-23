import { useEffect } from 'react'

// Night pages (research table, combining aspects, dreams) paint the whole
// window, not only their content column: while one is open, <body> wears
// data-theme="night" too, so the canvas around the page is night as well,
// at any browser zoom. Leaving the page brings the day back.
let nightPages = 0

export function useNightTheme() {
    useEffect(() => {
        nightPages += 1
        document.body.dataset.theme = 'night'
        return () => {
            nightPages -= 1
            if (nightPages === 0) delete document.body.dataset.theme
        }
    }, [])
}
