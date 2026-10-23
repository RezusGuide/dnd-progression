import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Logo from '../components/brand/Logo'
import { Button, Dossier, EmptyState, Hint, Loader, Modal, PageHeader, SteamBackground } from '../components/ui'
import { className, formatDateTime, raceName } from '../constants/dnd-ru'
import { isNonCaster } from '../constants/casterClasses'
import MimicChip from '../components/chest/MimicChip'
import { totalSealed, useSealedCounts } from '../lib/chest'
import { useMyAvailability } from '../lib/calendar'
import { SessionCard } from './calendar/SessionsTab'
import '../styles/calendar.css'
import { formatDate, useWorldIndex } from '../lib/world'
import '../styles/world.css'
import RequestList from '../components/RequestList'

// Приёмная. Guests get the public pitch; signed-in staff get their files,
// quick actions and the latest notices. Texts: docs/zlatopryady/copy.md.
export default function Home() {
    const { user } = useAuth()
    return user ? <StaffReception user={user} /> : <GuestReception />
}

function GuestReception() {
    return (
        <main className="reception-guest">
            <SteamBackground />
            <div className="reception-guest-content">
                <p className="reception-kicker">Санни инкорпорейтед</p>
                <Logo variant="full" size={120} />
                <p className="reception-lore">
                    Крупнейший работодатель для искателей на людском континенте. Когда-то нас звали Хранителями рассвета,
                    и это название никому не нравилось. Сегодня мы отправляем сотрудников в сны IO: в миры со своим
                    сюжетом, которые нужно зачистить. Всё неживое, что удалось вынести, сдаётся по описи.
                </p>
                <Button to="/login">Предъявить пропуск</Button>
            </div>
        </main>
    )
}

function StaffReception({ user }) {
    const { isGm } = useAuth()
    const navigate = useNavigate()
    const [characters, setCharacters] = useState(null)
    const [news, setNews] = useState(null)
    // Players: their own requests. GM: the open queue (count only).
    const [requests, setRequests] = useState(null)
    const [picking, setPicking] = useState(false)
    const world = useWorldIndex()
    // «Новое в архиве»: the three most recently opened articles.
    const fresh = (world || []).filter((a) => a.status === 'OPEN' && a.revealedAt)
        .sort((a, b) => b.revealedAt.localeCompare(a.revealedAt)).slice(0, 3)

    useEffect(() => {
        api.get('/api/characters')
            .then((res) => setCharacters(Array.isArray(res.data) ? res.data : []))
            .catch(() => setCharacters([]))
        api.get(isGm ? '/api/admin/requests?status=PENDING' : '/api/requests/mine')
            .then((res) => setRequests(Array.isArray(res.data) ? res.data : []))
            .catch(() => setRequests([]))
        api.get('/api/announcements')
            .then((res) => {
                const list = Array.isArray(res.data) ? [...res.data] : []
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                setNews(list.slice(0, 3))
            })
            .catch(() => setNews([]))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const sealed = totalSealed(useSealedCounts(true))
    const availability = useMyAvailability()
    const [nextSession, setNextSession] = useState(undefined) // undefined while loading, null when none
    useEffect(() => {
        api.get('/api/sessions', { params: { upcoming: true } })
            .then((res) => setNextSession(res.data[0] || null))
            .catch(() => setNextSession(null))
    }, [])
    const mine = (characters || []).filter((c) => c.ownerId === user.userId || c.ownerId == null)
    const casters = mine.filter((c) => !isNonCaster(c.characterClass))

    const openSheet = () => {
        if (mine.length === 1) navigate(`/characters/${mine[0].id}`)
        else navigate('/characters')
    }
    const openResearch = () => {
        if (mine.length === 1 && casters.length === 1) navigate(`/characters/${casters[0].id}/research`)
        else setPicking(true)
    }

    return (
        <div className="parchment-page">
            <PageHeader
                title="Приёмная"
                subtitle={`Добрый день, ${user.username}. Ваши дела на сегодня.`}
                actions={isGm && <Button variant="secondary" to="/admin">Панель ГМ</Button>}
            />

            <div className="reception">
                {characters && mine.length === 0 && (
                    <Hint>Начните с личного дела. Без него в сны не пускают.</Hint>
                )}

                {!availability.loading && availability.profile && !availability.profile.exists && (
                    <Hint>Отметьте своё свободное время, чтобы ГМ мог подобрать сессию. <Link to="/calendar?tab=time" className="reception-link">График присутствия →</Link></Hint>
                )}

                {nextSession && (
                    <section>
                        <div className="reception-row">
                            <h2 className="reception-section-title">Ближайшая сессия</h2>
                            <Link to="/calendar?tab=sessions" className="reception-link">Все сессии →</Link>
                        </div>
                        <Dossier className="reception-session"><SessionCard session={nextSession} zone={availability.zone} big /></Dossier>
                    </section>
                )}

                <section>
                    <h2 className="reception-section-title">Быстрые действия</h2>
                    <div className="reception-actions">
                        <Button to="/characters/new">Завести личное дело</Button>
                        <Button variant="secondary" onClick={openSheet} disabled={!characters || mine.length === 0}>Мой лист</Button>
                        <Button variant="secondary" onClick={openResearch} disabled={!characters || casters.length === 0}>Исследования</Button>
                        <Button variant="secondary" to="/chest" className="reception-chest-btn" disabled={!characters || mine.length === 0}>
                            <MimicChip count={sealed} size={24} /> Сундучок
                        </Button>
                    </div>
                </section>

                <section>
                    <h2 className="reception-section-title">Личные дела</h2>
                    {!characters && <Loader />}
                    {characters && mine.length === 0 && (
                        <EmptyState action={<Button to="/characters/new">Завести личное дело</Button>}>
                            Личного дела пока нет.
                        </EmptyState>
                    )}
                    {mine.length > 0 && (
                        <div className="reception-cards">
                            {mine.map((c) => (
                                <Link key={c.id} to={`/characters/${c.id}`} className="reception-card">
                                    <Dossier caseNo={c.id}>
                                        <p className="reception-card-name">{c.name}</p>
                                        <p className="reception-card-meta">
                                            {[className(c.characterClass), raceName(c.race)].filter(Boolean).join(', ') || '—'} · {c.level} уровень
                                        </p>
                                    </Dossier>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {isGm ? (
                    requests && (
                        <section>
                            <h2 className="reception-section-title">Заявки</h2>
                            <p>
                                Ждут решения: <strong>{requests.length}</strong>.{' '}
                                <Link to="/admin#requests" className="reception-link">Открыть в панели ГМ →</Link>
                            </p>
                        </section>
                    )
                ) : (
                    requests && requests.length > 0 && (
                        <section>
                            <h2 className="reception-section-title">Мои заявки</h2>
                            <RequestList requests={[
                                ...requests.filter((r) => r.status === 'PENDING'),
                                ...requests.filter((r) => r.status !== 'PENDING').slice(0, 3),
                            ]} />
                        </section>
                    )
                )}

                {fresh.length > 0 && (
                    <section>
                        <div className="reception-row">
                            <h2 className="reception-section-title">Новое в архиве</h2>
                            <Link to="/world" className="reception-link">Весь архив →</Link>
                        </div>
                        <div className="reception-news">
                            {fresh.map((a) => (
                                <Link key={a.slug} to={`/world/${a.slug}`} className="reception-news-item reception-archive-item">
                                    <p className="reception-news-title">{a.title}</p>
                                    {a.teaser && <p className="reception-archive-teaser">{a.teaser}</p>}
                                    <p className="reception-news-date">Открыто {formatDate(a.revealedAt)}</p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                <section>
                    <div className="reception-row">
                        <h2 className="reception-section-title">Свежие объявления</h2>
                        <Link to="/announcements" className="reception-link">Вся доска →</Link>
                    </div>
                    {!news && <Loader />}
                    {news && news.length === 0 && <p className="tome-empty">Объявлений нет. Секретарша проверит позже.</p>}
                    {news && news.length > 0 && (
                        <div className="reception-news">
                            {news.map((n) => (
                                <div key={n.id} className="reception-news-item">
                                    <p className="reception-news-title">{n.title}</p>
                                    <p className="reception-news-date">{formatDateTime(n.createdAt)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {picking && (
                <Modal title="Чьё исследование?" onClose={() => setPicking(false)} actions={<Button variant="ghost" onClick={() => setPicking(false)}>Отмена</Button>}>
                    <ul className="ui-pick-list">
                        {casters.map((c) => (
                            <li key={c.id}>
                                <Button variant="secondary" to={`/characters/${c.id}/research`} style={{ width: '100%' }}>
                                    {c.name} · {className(c.characterClass)}
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Modal>
            )}
        </div>
    )
}
