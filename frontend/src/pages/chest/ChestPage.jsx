import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { Button, EmptyState, Loader, Modal, PageHeader } from '../../components/ui'
import ErrorScreen from '../../components/errors/ErrorScreen'
import MimicMascot from '../../components/brand/MimicMascot'
import AspectIcon from '../../components/aspects/AspectIcon'
import ChestContentsList, { RarityTag } from '../../components/chest/ChestContentsList'
import { BITE_TEXT, coinsText, countdown, deadlineFrom, prefersReducedMotion, useTick } from '../../lib/chest'
import { useMagicData } from '../../lib/magic'
import { formatDateTime } from '../../constants/dnd-ru'
import '../../styles/sheet.css'
import '../../styles/chest.css'

// Сундучок (prompts/07-chest.md): the mimic storekeeper on the left, sealed
// parcels on the right, the inventory and the archive below. /chest picks
// the character; /characters/:id/chest opens one directly.

const OPEN_MS = 1400
const BITE_MS = 900

export default function ChestPage() {
    const { characterId } = useParams()
    const navigate = useNavigate()
    const { user, hasSection } = useAuth()
    const [characters, setCharacters] = useState(null)

    useEffect(() => {
        api.get('/api/characters').then((res) => setCharacters(Array.isArray(res.data) ? res.data : [])).catch(() => setCharacters([]))
    }, [])

    if (!characters) return <div className="parchment-page"><Loader /></div>
    const mine = characters.filter((c) => c.ownerId === user.userId || (hasSection('*') && String(c.id) === characterId))
    const currentId = characterId || (mine.length === 1 ? String(mine[0].id) : null)

    return (
        <div className="parchment-page chest-page">
            <PageHeader title="Сундучок" subtitle="Мимик-кладовщик конторы. Посылки, опись, архив." />
            {mine.length > 1 && (
                <label className="chest-picker">
                    <span className="sheet-label">Чей Сундучок</span>
                    <select className="sheet-input" value={currentId || ''} onChange={(e) => navigate(e.target.value ? `/characters/${e.target.value}/chest` : '/chest')}>
                        <option value="">— Выбрать личное дело —</option>
                        {mine.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </label>
            )}
            {mine.length === 0 && !characterId && <EmptyState action={<Button to="/characters/new">Завести личное дело</Button>}>Сундучок выдаётся к личному делу.</EmptyState>}
            {currentId && <div className="chest-body"><Chest key={currentId} characterId={currentId} /></div>}
        </div>
    )
}

function Chest({ characterId }) {
    const [magic] = useMagicData()
    const [rewards, setRewards] = useState(null)
    const [items, setItems] = useState(null)
    const [loadError, setLoadError] = useState(null)
    const [tab, setTab] = useState('items')
    const [mood, setMood] = useState('idle') // idle | opening | open | biting
    const [flying, setFlying] = useState(null) // contents flying out
    const [received, setReceived] = useState(null) // opened reward for «Получено»
    const [riddle, setRiddle] = useState(null) // reward being answered
    const [answer, setAnswer] = useState('')
    const [bite, setBite] = useState(null) // { penalty, deadline, locked }
    const [deadlines, setDeadlines] = useState({}) // reward id -> lock deadline (ms)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const refresh = useCallback(() => {
        api.get(`/api/characters/${characterId}/chest`).then((res) => {
            setRewards(res.data)
            setDeadlines(Object.fromEntries(res.data.filter((r) => r.lockSeconds > 0).map((r) => [r.id, deadlineFrom(r.lockSeconds)])))
        }).catch(setLoadError)
        api.get(`/api/characters/${characterId}/inventory`).then((res) => setItems(res.data)).catch(() => setItems([]))
    }, [characterId])
    useEffect(() => { refresh() }, [refresh])

    const sealed = (rewards || []).filter((r) => r.status === 'SEALED')
    const opened = (rewards || []).filter((r) => r.status === 'OPENED')
    useTick(Object.keys(deadlines).length > 0 || !!bite?.deadline)

    if (loadError) {
        const status = loadError.response?.status
        return <ErrorScreen code={status === 403 ? 403 : status === 404 ? 404 : status ? 500 : 'offline'} />
    }
    if (!rewards || !items) return <Loader />

    // The open animation, then «Получено». Instant with reduced motion.
    const celebrate = (reward) => {
        if (prefersReducedMotion()) {
            setMood('open')
            setReceived(reward)
            return
        }
        setMood('opening')
        setFlying(reward.contents)
        setTimeout(() => {
            setFlying(null)
            setMood('open')
            setReceived(reward)
        }, OPEN_MS)
    }

    const open = async (reward, withAnswer) => {
        setBusy(true)
        setError('')
        try {
            const res = await api.post(`/api/characters/${characterId}/chest/${reward.id}/open`, withAnswer != null ? { answer: withAnswer } : {})
            setRiddle(null)
            setBite(null)
            setAnswer('')
            celebrate(res.data)
        } catch (err) {
            const data = err.response?.data
            if (err.response?.status === 409 && data?.bitten) {
                setBite({ penalty: data.penalty, deadline: deadlineFrom(data.lockSeconds) })
                if (!prefersReducedMotion()) {
                    setMood('biting')
                    setTimeout(() => setMood('idle'), BITE_MS)
                }
                refresh()
            } else if (err.response?.status === 423) {
                setBite({ penalty: 'LOCK_10_MIN', deadline: deadlineFrom(data?.lockSeconds), locked: true })
            } else {
                setError(data?.message || 'Сундучок не открылся. Повторите.')
            }
        } finally {
            setBusy(false)
        }
    }

    const start = (reward) => {
        setError('')
        setBite(countdown(deadlines[reward.id]) ? { penalty: reward.penalty, deadline: deadlines[reward.id], locked: true } : null)
        if (reward.hasRiddle) setRiddle(reward)
        else open(reward)
    }

    const take = () => {
        setReceived(null)
        setMood('idle')
        refresh()
    }

    const lockLeft = countdown(bite?.deadline)

    return (
        <>
            <div className="chest-top">
                <div className={`chest-mimic mimic-${mood}`}>
                    <MimicMascot size={220} count={sealed.length || null} label={`Сундучок: запечатанных посылок ${sealed.length}`} />
                    {mood === 'biting' && <span className="chest-ouch" aria-hidden="true">Ай!</span>}
                    {flying && (
                        <div className="chest-flying" aria-hidden="true">
                            {Object.entries(flying.aspects || {}).map(([k], i) => (
                                <span key={k} className="chest-fly" style={{ '--i': i }}><AspectIcon aspect={magic?.byKey[k] || k} size={36} /></span>
                            ))}
                            {coinsText(flying.coins) && <span className="chest-fly chest-fly-coin" style={{ '--i': 4 }}>◎</span>}
                            {(flying.items || []).map((item, i) => (
                                <span key={`${item.name}-${i}`} className="chest-fly chest-fly-card" style={{ '--i': 5 + i }}>{item.name}</span>
                            ))}
                        </div>
                    )}
                </div>

                <section className="chest-inbox" aria-labelledby="chest-inbox-title">
                    <h2 id="chest-inbox-title" className="sheet-section-title">Входящие</h2>
                    {sealed.length === 0 && <EmptyState>Сундучок пуст. Секретарша проверит позже.</EmptyState>}
                    <ul className="chest-parcels">
                        {sealed.map((r) => {
                            const left = countdown(deadlines[r.id])
                            return (
                                <li key={r.id} className={`chest-parcel ${left ? 'is-locked' : ''}`}>
                                    <span className="chest-seal" aria-hidden="true">С</span>
                                    <div className="chest-parcel-body">
                                        <p className="chest-parcel-kicker">Вам посылка от конторы</p>
                                        <p className="chest-parcel-title">{r.title}</p>
                                        <p className="chest-parcel-meta">
                                            {r.hasRiddle && <span className="chest-riddle-mark">С загадкой</span>}
                                            {left && <span className="chest-lock-mark">Сундучок обижен: {left}</span>}
                                        </p>
                                    </div>
                                    <Button onClick={() => start(r)} disabled={busy || !!left}>Открыть</Button>
                                </li>
                            )
                        })}
                    </ul>
                    {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                </section>
            </div>

            <div className="sheet-tabs chest-tabs" role="tablist" aria-label="Сундучок">
                {[['items', 'Предметы'], ['archive', 'Архив наград']].map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key}
                        className={`sheet-tab ${tab === key ? 'is-active' : ''}`} onClick={() => setTab(key)}>{label}</button>
                ))}
            </div>
            {tab === 'items' && <Inventory characterId={characterId} items={items} onChanged={refresh} />}
            {tab === 'archive' && <Archive rewards={opened} />}

            {riddle && (
                <Modal
                    title={riddle.title}
                    onClose={() => { setRiddle(null); setBite(null); setAnswer('') }}
                    actions={<>
                        <Button variant="ghost" onClick={() => { setRiddle(null); setBite(null); setAnswer('') }}>Отложить</Button>
                        <Button onClick={() => open(riddle, answer)} disabled={busy || !answer.trim() || !!lockLeft}>Ответить</Button>
                    </>}
                >
                    <p className="chest-riddle-kicker">Сундучок спрашивает:</p>
                    <p className="chest-riddle-question">{riddle.riddleQuestion}</p>
                    <label className="sheet-label" htmlFor="chest-answer">Ответ</label>
                    <input id="chest-answer" className="sheet-input" value={answer} autoComplete="off"
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && answer.trim() && !lockLeft) open(riddle, answer) }} />
                    {bite && (
                        <p className={`chest-bite ${prefersReducedMotion() ? '' : 'is-shaking'}`} role="alert">
                            {bite.locked ? 'Сундучок обиделся и молчит.' : BITE_TEXT[bite.penalty] || BITE_TEXT.NONE}
                            {lockLeft && <span className="chest-timer"> До примирения {lockLeft}.</span>}
                        </p>
                    )}
                </Modal>
            )}

            {received && (
                <Modal title="Получено" onClose={take} actions={<Button onClick={take}>Забрать в дело</Button>}>
                    <p className="chest-received-kicker">Сундучок открыт. Опись приложена.</p>
                    <p className="chest-parcel-title">{received.title}</p>
                    <ChestContentsList contents={received.contents} />
                    {received.gmNote && <p className="chest-gm-note">Записка ГМ: {received.gmNote}</p>}
                </Modal>
            )}
        </>
    )
}

function Inventory({ characterId, items, onChanged }) {
    const [openId, setOpenId] = useState(null)
    const [drop, setDrop] = useState(null)
    const [error, setError] = useState('')

    const patch = async (item, body) => {
        setError('')
        try {
            await api.patch(`/api/characters/${characterId}/inventory/${item.id}`, body)
            onChanged()
        } catch (err) {
            setError(err.response?.data?.message || 'Не подшилось. Повторите.')
        }
    }
    const remove = async () => {
        try {
            await api.delete(`/api/characters/${characterId}/inventory/${drop.id}`)
            setDrop(null)
            onChanged()
        } catch (err) {
            setError(err.response?.data?.message || 'Не выбросилось. Повторите.')
            setDrop(null)
        }
    }

    if (items.length === 0) return <EmptyState>Опись пуста. Предметы приходят посылками.</EmptyState>
    return (
        <>
            {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
            <div className="chest-table-wrap">
                <table className="chest-table">
                    <thead>
                        <tr><th scope="col">№</th><th scope="col">Предмет</th><th scope="col">Редкость</th><th scope="col">Кол-во</th><th scope="col">Происхождение</th><th scope="col"><span className="visually-hidden">Действия</span></th></tr>
                    </thead>
                    {items.map((item, i) => (
                        <tbody key={item.id} className={openId === item.id ? 'is-open' : ''}>
                            <tr>
                                <td className="chest-num">{String(i + 1).padStart(3, '0')}</td>
                                <th scope="row">
                                    <button type="button" className="chest-item-name" aria-expanded={openId === item.id}
                                        onClick={() => setOpenId(openId === item.id ? null : item.id)}>{item.name}</button>
                                </th>
                                <td><RarityTag rarity={item.rarity} /></td>
                                <td className="chest-num">{item.quantity}</td>
                                <td className="chest-origin">{item.origin || '—'}</td>
                                <td className="chest-actions">
                                    <Button variant="ghost" onClick={() => patch(item, { quantity: item.quantity - 1 })}>Израсходовать 1</Button>
                                    <Button variant="ghost" onClick={() => setDrop(item)}>Выбросить</Button>
                                </td>
                            </tr>
                            {openId === item.id && (
                                <tr className="chest-item-details">
                                    <td />
                                    <td colSpan={5}>
                                        <p className="sheet-prose">{item.description || 'Описания нет.'}</p>
                                        <label className="sheet-label" htmlFor={`notes-${item.id}`}>Мои заметки</label>
                                        <textarea id={`notes-${item.id}`} className="sheet-input sheet-textarea" rows={2} defaultValue={item.notes || ''}
                                            onBlur={(e) => { if (e.target.value !== (item.notes || '')) patch(item, { notes: e.target.value }) }} />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    ))}
                </table>
            </div>
            {drop && (
                <Modal title="Выбросить предмет" onClose={() => setDrop(null)}
                    actions={<><Button variant="ghost" onClick={() => setDrop(null)}>Отмена</Button><Button variant="danger" onClick={remove}>Выбросить</Button></>}>
                    <p>Выбросить «{drop.name}»{drop.quantity > 1 ? ` (все ${drop.quantity})` : ''}? Вернуть нельзя.</p>
                </Modal>
            )}
        </>
    )
}

function Archive({ rewards }) {
    if (rewards.length === 0) return <EmptyState>Архив пуст. Открытые посылки будут здесь.</EmptyState>
    return (
        <ul className="chest-archive">
            {rewards.map((r) => (
                <li key={r.id} className="chest-archive-row">
                    <div className="chest-archive-head">
                        <p className="chest-parcel-title">{r.title}</p>
                        <p className="chest-parcel-meta">Открыта {formatDateTime(r.openedAt)}</p>
                    </div>
                    <ChestContentsList contents={r.contents} />
                    {r.gmNote && <p className="chest-gm-note">Записка ГМ: {r.gmNote}</p>}
                </li>
            ))}
        </ul>
    )
}
