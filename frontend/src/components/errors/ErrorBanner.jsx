import { useEffect, useState } from 'react'
import CatHead from '../brand/CatHead'
import Button from '../ui/Button'
import { API_ERROR_EVENT } from '../../api/apiErrors'
import { ERROR_COPY } from './errorCopy'
import CheckAgain from './CheckAgain'
import '../../styles/errors.css'

// Strip under the nav for 500 / 503 / offline API failures. Deliberately
// not a full-screen takeover: the page may have half-loaded fine.
export default function ErrorBanner() {
    const [kind, setKind] = useState(null)

    useEffect(() => {
        const onError = (e) => setKind(e.detail.kind)
        window.addEventListener(API_ERROR_EVENT, onError)
        return () => window.removeEventListener(API_ERROR_EVENT, onError)
    }, [])

    if (!kind) return null
    const copy = ERROR_COPY[kind]

    return (
        <div className="err-banner" role="alert">
            <CatHead size={40} sleeping={kind === 503 || kind === 'closed'} />
            <div className="err-banner-body">
                <p className="err-banner-title">{copy.title}</p>
                <p className="err-banner-text">{copy.text}</p>
            </div>
            <div className="err-banner-actions">
                {copy.health
                    ? <CheckAgain onOpen={() => setKind(null)} />
                    : <Button variant="primary" onClick={() => window.location.reload()}>Повторить</Button>}
                <Button variant="ghost" onClick={() => setKind(null)}>Скрыть</Button>
            </div>
        </div>
    )
}
