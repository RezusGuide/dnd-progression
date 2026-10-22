import { useRefData } from '../lib/refData'

// A source book as its short code ("VGM"); the full title shows on hover
// (data/sources.json). Unknown codes are shown as they are.
export default function SourceCode({ code }) {
    const [sources] = useRefData('sources')
    if (!code) return null
    const name = sources?.find((s) => s.key === code)?.name
    return name ? <abbr className="source-code" title={name}>{code}</abbr> : <span className="source-code">{code}</span>
}
