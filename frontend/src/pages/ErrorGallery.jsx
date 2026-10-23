import ErrorScreen from '../components/errors/ErrorScreen'
import Logo from '../components/brand/Logo'
import CatMascot from '../components/brand/CatMascot'
import CatHead from '../components/brand/CatHead'
import MimicMascot from '../components/brand/MimicMascot'
import { Dossier, EmptyState, Field, GearList, Hint, Loader, Stamp, Button } from '../components/ui'

// Dev-only (/__errors, see App.jsx): every error screen on one page, plus
// the brand and UI kit, to check animations and visuals without breaking
// anything on purpose.
const CODES = [404, 403, 500, 503, 'offline', 'closed', 'crash']

export default function ErrorGallery() {
    return (
        <div className="err-gallery">
            <section id="brand-kit" className="parchment-page" style={{ minHeight: 0, gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Logo variant="full" size={96} />
                    <Logo variant="emblem" size={48} />
                    <span style={{ background: 'var(--sunny-night)', color: 'var(--sunny-steam)', display: 'inline-flex' }}>
                        <Logo variant="full" size={48} />
                    </span>
                </div>
                <div id="mascots" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <CatMascot size={200} />
                    <CatMascot size={200} pose="sleep" />
                    <CatHead size={128} decorative={false} />
                    <MimicMascot size={200} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', width: '100%', maxWidth: 960 }}>
                    <Dossier tab="Личное дело" caseNo={42}>
                        <GearList>
                            <span>Пункт первый</span>
                            <span>Пункт второй</span>
                        </GearList>
                    </Dossier>
                    <Dossier>
                        <Field label="Имя" placeholder="Аноним" />
                        <Field label="Почта" error="Допуск отклонён. Проверьте адрес." defaultValue="кот@" />
                    </Dossier>
                    <Dossier>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <Button>Подать заявку</Button>
                            <Button variant="secondary">Отмена</Button>
                            <Button variant="ghost">Скрыть</Button>
                            <Button variant="danger">Удалить</Button>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                            <Stamp kind="approved" />
                            <Stamp kind="rejected" />
                            <Stamp kind="pending" />
                        </div>
                    </Dossier>
                    <Dossier><Hint>Нажми сюда, чтобы начать исследование.</Hint></Dossier>
                    <Dossier><EmptyState /></Dossier>
                    <Dossier><Loader /></Dossier>
                </div>
            </section>
            {CODES.map((code) => (
                <div key={code} id={`err-${code}`}>
                    <ErrorScreen code={code} onRetry={() => {}} />
                </div>
            ))}
        </div>
    )
}
