import { useEffect } from 'react'
import SteamBackground from '../ui/SteamBackground'
import { holdApiBanner, networkKind } from '../../api/apiErrors'
import Button from '../ui/Button'
import { ERROR_COPY } from './errorCopy'
import ErrorScene from './scenes'
import CheckAgain from './CheckAgain'
import '../../styles/errors.css'

// Full-page error: steam, an animated mascot scene, "Дело № 404", a title,
// one line of text and the way out. code: 404 | 403 | 500 | 503 | offline |
// closed | crash. 'offline' turns into 'closed' («Контора закрыта») when the
// browser is online: then it is the GM's PC that does not answer.
// `children` renders under the buttons (e.g. the GM bootstrap link on /admin).
// `useRouter={false}` for places outside <BrowserRouter> (the crash screen
// can be rendered without one), where a plain <a> is used instead of <Link>.
export default function ErrorScreen({ code: asked = 404, onRetry, useRouter = true, children }) {
    const code = asked === 'offline' ? networkKind() : asked
    const copy = ERROR_COPY[code] || ERROR_COPY[404]
    const retry = onRetry || (() => window.location.reload())
    const home = useRouter ? { to: '/' } : { href: '/' }

    // A full-page error already says it all - clear the API banner so the
    // same message isn't shown twice.
    useEffect(() => holdApiBanner(), [])

    return (
        <main className="err-page" data-theme={code === 503 || code === 'offline' || code === 'closed' ? 'night' : undefined}>
            <SteamBackground />
            <div className="err-content">
                <ErrorScene code={code} />
                <p className="err-case">Дело № {copy.caseNo}</p>
                <h1 className="err-title">{copy.title}</h1>
                <p className="err-text">{copy.text}</p>
                <div className="err-actions">
                    <Button variant="primary" {...home}>На главную</Button>
                    {copy.health && <CheckAgain variant="secondary" onOpen={retry} />}
                    {copy.retry && !copy.health && <Button variant="secondary" onClick={retry}>Повторить</Button>}
                </div>
                {children}
            </div>
        </main>
    )
}
