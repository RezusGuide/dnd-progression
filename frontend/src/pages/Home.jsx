import { Link } from 'react-router-dom'

// Temporary landing page while the site turns into the Zlatopryady portal
// (see docs/zlatopryady/ROADMAP.md). The real "Reception" home page arrives
// in stage 3; until then this just points at the D&D sections. Russian-only
// on purpose - the EN toggle goes away in stage 2.
export default function Home() {
    return (
        <div className="parchment-page">
            <div className="tome-header">
                <h1 className="tome-title">Санни инкорпорейтед</h1>
            </div>

            <div className="tome-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <p>Портал кампании «Златопряды». Архив переезжает, приёмная скоро откроется.</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                    <Link to="/characters" className="tome-btn">Персонажи</Link>
                    <Link to="/campaigns" className="tome-btn">Кампании</Link>
                    <Link to="/announcements" className="tome-btn">Объявления</Link>
                </div>
            </div>
        </div>
    )
}
