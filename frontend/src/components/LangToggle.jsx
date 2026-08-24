import { useLang } from '../context/LangContext'

// `variant="inline"` for use inside the shell nav (default everywhere).
// `variant="floating"` for the one place with no nav bar to sit in: Home.
export default function LangToggle({ variant = 'inline' }) {
    const { lang, toggleLang } = useLang()

    return (
        <button
            className={variant === 'floating' ? 'lang-toggle' : 'lang-toggle-inline'}
            onClick={toggleLang}
        >
            {lang === 'en' ? 'РУС' : 'ENG'}
        </button>
    )
}
