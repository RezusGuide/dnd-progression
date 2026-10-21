import { Link } from 'react-router-dom'

// Catch-all for unknown routes. Plain for now - the animated mascot version
// comes with the visual groundwork in stage 2.
export default function NotFound() {
    return (
        <div className="parchment-page">
            <div className="tome-panel" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
                <h1 className="tome-title">Такого документа в архиве нет</h1>
                <p style={{ marginTop: '1.5rem' }}>
                    <Link to="/" className="tome-btn">На главную</Link>
                </p>
            </div>
        </div>
    )
}
