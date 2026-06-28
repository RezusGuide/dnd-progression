import { useLang } from '../context/LangContext'

export default function LangToggle() {
    const { lang, toggleLang } = useLang()

    return (
        <button className="lang-toggle" onClick={toggleLang}>
            {lang === 'en' ? 'РУС' : 'ENG'}
        </button>
    )
}