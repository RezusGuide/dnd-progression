import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import api from '../../api/axios'
import { Button, EmptyState, Hint, Loader, Modal, PageHeader, Stamp } from '../../components/ui'
import ErrorScreen from '../../components/errors/ErrorScreen'
import AspectIcon from '../../components/aspects/AspectIcon'
import HexGrid from '../../components/aspects/HexGrid'
import { spellDescription, spellName } from '../../constants/spellText'
import { bagEntries, useMagicData } from '../../lib/magic'
import {
    allowedCells, ancestry, bagLeft, brokenJoints, cellKey, jointText, ruleText, spentCounts, submitBlocker, validate,
} from '../../lib/research'
import '../../styles/sheet.css'
import '../../styles/research.css'
import { useNightTheme } from '../../lib/theme'

// "Стол исследований" (magic-v2.md, section 8): catalog of topics on the
// left, the hex grid in the middle, the bag on the right. The grid is
// checked live with the same rule the server applies on submit.

const STATUS_TEXT = { KNOWN: 'Изучено', PENDING: 'На рассмотрении', AVAILABLE: 'Доступно' }
const HINT_KEY = 'sunny:research-hint-seen'

function hintSeen() {
    try { return localStorage.getItem(HINT_KEY) === '1' } catch { return true }
}
function markHintSeen() {
    try { localStorage.setItem(HINT_KEY, '1') } catch { /* storage unavailable */ }
}

export default function ResearchPage() {
    useNightTheme()
    const { characterId } = useParams()
    const [params, setParams] = useSearchParams()
    const spellId = params.get('topic')
    const [magic, magicError] = useMagicData()

    const [character, setCharacter] = useState(null)
    const [topics, setTopics] = useState(null)
    const [spells, setSpells] = useState([])
    const [notes, setNotes] = useState([])
    const [loadError, setLoadError] = useState(null)

    const refresh = useCallback(() => {
        api.get(`/api/characters/${characterId}`).then((res) => setCharacter(res.data)).catch(setLoadError)
        api.get(`/api/characters/${characterId}/research/topics`).then((res) => setTopics(res.data)).catch(setLoadError)
        api.get(`/api/characters/${characterId}/research/notes`).then((res) => setNotes(res.data)).catch(() => setNotes([]))
    }, [characterId])

    useEffect(() => { refresh() }, [refresh])
    useEffect(() => {
        api.get('/api/spells').then((res) => setSpells(Array.isArray(res.data) ? res.data : [])).catch(() => setSpells([]))
    }, [])

    const [panel, setPanel] = useState(null) // narrow screens: 'catalog' | 'bag'
    const [showHint, setShowHint] = useState(() => !hintSeen())

    if (loadError || magicError) {
        const status = (loadError || magicError).response?.status
        return <ErrorScreen code={status === 403 ? 403 : status === 404 ? 404 : status ? 500 : 'offline'} />
    }
    if (!character || !topics || !magic) return <div className="parchment-page" data-theme="night"><Loader /></div>

    const select = (id) => {
        setParams(id ? { topic: id } : {})
        setPanel(null)
    }

    return (
        <div className="parchment-page research-page" data-theme="night">
            <PageHeader
                title="Стол исследований"
                subtitle={character.name}
                back={`/characters/${characterId}?tab=magic`}
                backLabel="← Личное дело"
                actions={<Button variant="ghost" to={`/characters/${characterId}/craft`}>Соединить аспекты</Button>}
            />
            {showHint && (
                <div className="research-hint">
                    <Hint>Соедините якоря цепочкой соседних клеток. {ruleText(magic.byKey)} Пример цепочки: Рассвет → Мираж → Сон (Мираж = Сон + Рассвет).</Hint>
                    <Button variant="ghost" onClick={() => { markHintSeen(); setShowHint(false) }}>Понятно</Button>
                </div>
            )}
            <div className="research-panels-toggle">
                <Button variant="secondary" onClick={() => setPanel(panel === 'catalog' ? null : 'catalog')} aria-expanded={panel === 'catalog'}>Темы</Button>
                <Button variant="secondary" onClick={() => setPanel(panel === 'bag' ? null : 'bag')} aria-expanded={panel === 'bag'}>Сумка</Button>
            </div>
            <ResearchTable
                key={spellId || 'none'}
                characterId={characterId}
                spellId={spellId}
                character={character}
                topics={topics}
                spells={spells}
                notes={notes}
                magic={magic}
                panel={panel}
                onSelect={select}
                onChanged={refresh}
            />
        </div>
    )
}

function ResearchTable({ characterId, spellId, character, topics, spells, notes, magic, panel, onSelect, onChanged }) {
    const [topic, setTopic] = useState(null)
    const [topicError, setTopicError] = useState('')
    const [placed, setPlaced] = useState([])
    const [selected, setSelected] = useState(null)
    const [hover, setHover] = useState(null)
    const [confirm, setConfirm] = useState(false)
    const [showAncestry, setShowAncestry] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const loaded = useRef(false)

    useEffect(() => {
        if (!spellId) return
        api.get(`/api/characters/${characterId}/research/topics/${spellId}`)
            .then((res) => {
                const t = res.data
                const note = notes.find((n) => n.spellId === spellId && (t.status === 'PENDING' ? n.status === 'PENDING' : n.status === 'APPROVED'))
                setTopic(t)
                setPlaced(t.status === 'AVAILABLE' ? t.draft || [] : note?.grid?.placed || [])
                loaded.current = true
            })
            .catch((err) => setTopicError(err.response?.data?.message || 'Тема не открылась. Обновите страницу.'))
    }, [characterId, spellId, notes])

    const editable = topic?.status === 'AVAILABLE'

    // Autosave the draft a moment after the last change.
    useEffect(() => {
        if (!loaded.current || !editable) return
        const timer = setTimeout(() => {
            api.put(`/api/characters/${characterId}/research/topics/${spellId}/draft`, { placed }).catch(() => {})
        }, 700)
        return () => clearTimeout(timer)
    }, [placed, editable, characterId, spellId])

    const bag = character.aspects || {}
    const used = spentCounts(placed)
    // A note on review or approved was already written off by the server.
    const left = bagLeft(bag, placed, editable)
    const result = useMemo(
        () => (topic ? validate(magic.graph, topic.radius, topic.anchors, placed) : null),
        [topic, placed, magic],
    )
    const joints = useMemo(
        () => (topic && result ? brokenJoints(magic.graph, topic.anchors, placed, result).map((j) => ({ ...j, text: jointText(j, magic.byKey) })) : []),
        [topic, placed, result, magic],
    )
    const allowed = useMemo(
        () => (topic && editable && selected ? allowedCells(magic.graph, topic.radius, topic.anchors, placed, selected) : null),
        [topic, editable, selected, placed, magic],
    )
    const blocker = editable ? submitBlocker(result, placed, bag) : null

    const onCellClick = (cell, item) => {
        if (!editable) return
        setError('')
        if (item) {
            setPlaced((p) => p.filter((x) => cellKey(x.q, x.r) !== cellKey(cell.q, cell.r)))
            return
        }
        if (!selected) { setError('Сначала выберите аспект в сумке.'); return }
        if (left(selected) <= 0) { setError(`В сумке больше нет: ${magic.byKey[selected]?.nameRu}.`); return }
        setPlaced((p) => [...p, { q: cell.q, r: cell.r, aspect: selected }])
    }

    const submit = async () => {
        setBusy(true)
        setError('')
        try {
            await api.post(`/api/characters/${characterId}/research/topics/${spellId}/notes`, { placed })
            setConfirm(false)
            setTopic((t) => ({ ...t, status: 'PENDING' }))
            onChanged()
        } catch (err) {
            setError(err.response?.data?.message || 'Записка не ушла. Повторите.')
            setConfirm(false)
        } finally {
            setBusy(false)
        }
    }

    const spell = spells.find((s) => s.id === spellId)
    const school = topic && magic.schoolByKey[topic.school]
    const spent = Object.entries(used)
    const focus = hover || selected

    return (
        <div className={`research-layout ${panel ? `show-${panel}` : ''}`}>
            <Catalog topics={topics} spells={spells} magic={magic} current={spellId} onSelect={onSelect} />

            <section className="research-main" aria-label="Сетка">
                {!spellId && <EmptyState>Выберите тему в каталоге слева.</EmptyState>}
                {spellId && topicError && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {topicError}</p>}
                {spellId && !topic && !topicError && <Loader />}
                {topic && (
                    <>
                        <div className="research-topic-head">
                            <h2 className="research-topic-title">{spellName(spell) || topic.nameRu || topic.name}</h2>
                            <p className="research-topic-meta">{topic.level} круг · {school?.nameRu || topic.school} · якорей {topic.anchors.length}</p>
                        </div>
                        <div className="research-grid-wrap">
                            <HexGrid
                                radius={topic.radius}
                                anchors={topic.anchors}
                                placed={placed}
                                byKey={magic.byKey}
                                graph={magic.graph}
                                result={result}
                                hoverAspect={focus}
                                onCellClick={onCellClick}
                                onHoverAspect={setHover}
                                readOnly={!editable}
                                joints={joints}
                                allowed={allowed}
                            />
                            {topic.status === 'PENDING' && <Stamp kind="pending" className="research-stamp" />}
                            {topic.status === 'KNOWN' && <Stamp kind="approved" className="research-stamp" />}
                        </div>
                        {topic.status === 'LOCKED' && <p className="research-locked">Недоступно: {topic.reason}.</p>}
                        {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                        <div className="research-statusbar" role="status">
                            <span>Якоря соединены: <strong>{result?.anchorsConnected || 0} из {topic.anchors.length}</strong></span>
                            {result?.dangling.size > 0 && <span className="research-bad">Висят отдельно: {result.dangling.size}</span>}
                            {result?.valid && <span className="research-good">Записка сходится.</span>}
                            {editable && (
                                <span className="research-actions">
                                    <Button variant="ghost" onClick={() => setPlaced([])} disabled={placed.length === 0}>Очистить</Button>
                                    {blocker && <span className="research-blocker">{blocker}</span>}
                                    <Button onClick={() => setConfirm(true)} disabled={!!blocker} title={blocker || undefined}>Подать записку</Button>
                                </span>
                            )}
                        </div>
                        <p className="research-rule">{ruleText(magic.byKey)}</p>
                        {joints.length > 0 && (
                            <div className="research-joints" role="status">
                                <p>Красный пунктир на стыке клеток — соседи не связаны:</p>
                                <ul>{[...new Set(joints.map((j) => j.text))].map((t) => <li key={t}>{t}</li>)}</ul>
                            </div>
                        )}
                        <div className="research-ancestry">
                            <Button variant="ghost" aria-expanded={showAncestry} onClick={() => setShowAncestry(!showAncestry)}>
                                {showAncestry ? 'Скрыть подсказку' : 'Подсказка: родство якорей'}
                            </Button>
                            {showAncestry && <Ancestry anchors={topic.anchors} magic={magic} />}
                        </div>
                    </>
                )}
            </section>

            <Bag magic={magic} bag={bag} left={left} selected={selected} focus={focus} hovered={hover}
                onSelect={(k) => setSelected(selected === k ? null : k)} onHover={setHover} characterId={characterId} />

            {confirm && (
                <Modal
                    title="Подать исследовательскую записку"
                    onClose={() => setConfirm(false)}
                    actions={<>
                        <Button variant="ghost" onClick={() => setConfirm(false)}>Отмена</Button>
                        <Button onClick={submit} disabled={busy}>Подать записку</Button>
                    </>}
                >
                    <p>Тема: «{spellName(spell) || topic.nameRu}». Записка уйдёт ГМ на рассмотрение.</p>
                    <p className="sheet-label">Из сумки спишется</p>
                    <ul className="research-spent">
                        {spent.map(([k, n]) => (
                            <li key={k}><AspectIcon aspect={magic.byKey[k]} size={26} /> {magic.byKey[k]?.nameRu} × {n}</li>
                        ))}
                    </ul>
                    <p className="research-note">При отказе аспекты вернутся в сумку.</p>
                </Modal>
            )}
        </div>
    )
}

function Catalog({ topics, spells, magic, current, onSelect }) {
    const [query, setQuery] = useState('')
    const [level, setLevel] = useState('')
    const [school, setSchool] = useState('')
    const [onlyOpen, setOnlyOpen] = useState(false)
    const [open, setOpen] = useState(null)
    const byId = useMemo(() => Object.fromEntries(spells.map((s) => [s.id, s])), [spells])
    const q = query.trim().toLowerCase()
    const shown = topics.filter((t) => (!q || (t.nameRu || t.name).toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
        && (!level || t.level === Number(level))
        && (!school || t.school === school)
        && (!onlyOpen || t.status !== 'LOCKED'))

    return (
        <aside className="research-catalog" aria-label="Каталог тем">
            <h2 className="research-side-title">Каталог тем</h2>
            <input className="sheet-input" type="search" placeholder="Поиск" aria-label="Поиск темы" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="research-filters">
                <select className="sheet-input" aria-label="Круг" value={level} onChange={(e) => setLevel(e.target.value)}>
                    <option value="">Все круги</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((l) => <option key={l} value={l}>{l} круг</option>)}
                </select>
                <select className="sheet-input" aria-label="Школа" value={school} onChange={(e) => setSchool(e.target.value)}>
                    <option value="">Все школы</option>
                    {magic.schools.map((s) => <option key={s.key} value={s.key}>{s.nameRu}</option>)}
                </select>
            </div>
            <label className="wiz-skill research-only-open">
                <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
                <span>Только доступные</span>
            </label>
            <ul className="research-topics">
                {shown.map((t) => (
                    <li key={t.spellId} className={`research-topic ${t.spellId === current ? 'is-current' : ''} is-${t.status.toLowerCase()}`}>
                        <button type="button" className="research-topic-btn" onClick={() => onSelect(t.spellId)} aria-current={t.spellId === current || undefined}>
                            <span className="research-topic-name">{t.nameRu || t.name}</span>
                            <span className="research-topic-sub">{t.level} круг · {magic.schoolByKey[t.school]?.nameRu || t.school}</span>
                            <span className="research-topic-status">{t.status === 'LOCKED' ? `Недоступно: ${t.reason}` : STATUS_TEXT[t.status]}</span>
                        </button>
                        <button type="button" className="gate-link research-desc-btn" aria-expanded={open === t.spellId}
                            onClick={() => setOpen(open === t.spellId ? null : t.spellId)}>
                            {open === t.spellId ? 'Скрыть' : 'Описание'}
                        </button>
                        {open === t.spellId && <p className="research-desc">{spellDescription(byId[t.spellId])}</p>}
                    </li>
                ))}
                {shown.length === 0 && <li className="research-empty">Ничего не нашлось.</li>}
            </ul>
        </aside>
    )
}

function Bag({ magic, bag, left, selected, focus, hovered, onSelect, onHover, characterId }) {
    const entries = bagEntries(bag, magic.aspects)
    const info = focus && magic.byKey[focus]
    return (
        <aside className="research-bag" aria-label="Сумка">
            <h2 className="research-side-title">Сумка</h2>
            <p className="research-links-line" aria-live="polite">
                {hovered ? `${magic.byKey[hovered]?.nameRu} связан с: ${magic.graph.linkedTo(hovered).map((k) => magic.byKey[k]?.nameRu).join(', ')}` : 'Наведите на аспект, чтобы увидеть, с чем он связан.'}
            </p>
            {entries.length === 0 && <p className="research-empty">Сумка пуста. Аспекты выдаёт ГМ.</p>}
            <ul className="research-bag-list">
                {entries.map(({ aspect, count }) => {
                    const related = focus && magic.graph.linked(focus, aspect.key)
                    const chosen = selected === aspect.key
                    return (
                        <li key={aspect.key}>
                            <button type="button"
                                className={`research-bag-item ${chosen ? 'is-selected' : ''} ${related && !chosen ? 'is-related' : ''}`}
                                aria-pressed={chosen}
                                onClick={() => onSelect(aspect.key)}
                                onMouseEnter={() => onHover(aspect.key)}
                                onMouseLeave={() => onHover(null)}
                                onFocus={() => onHover(aspect.key)}
                                onBlur={() => onHover(null)}
                            >
                                <AspectIcon aspect={aspect} size={30} />
                                <span className="research-bag-name">{aspect.nameRu}</span>
                                <span className="research-bag-count">осталось {Math.max(0, left(aspect.key))} из {count}</span>
                                {related && !chosen && <ChainIcon />}
                            </button>
                        </li>
                    )
                })}
            </ul>
            {info && (
                <div className="research-aspect-info" role="status">
                    <p className="research-aspect-name"><AspectIcon aspect={info} size={24} /> {info.nameRu}</p>
                    <p>{info.hint}</p>
                    {info.components.length > 0 && <p>Рецепт: {info.components.map((c) => magic.byKey[c]?.nameRu).join(' + ')}</p>}
                    <p>Связан с: {magic.graph.linkedTo(info.key).map((k) => magic.byKey[k]?.nameRu).join(', ')}</p>
                </div>
            )}
            <Link className="gate-link" to={`/characters/${characterId}/craft`}>Соединить аспекты →</Link>
        </aside>
    )
}

const cellsWord = (n) => {
    const m10 = n % 10
    const m100 = n % 100
    if (m10 === 1 && m100 !== 11) return 'клетка'
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'клетки'
    return 'клеток'
}

// «Подсказка: родство якорей»: for every pair of anchors the shortest chain
// by the reference and a ready sequence of a length that fits on the grid.
function Ancestry({ anchors, magic }) {
    const names = (keys) => keys.map((k) => magic.byKey[k]?.nameRu || k).join(' → ')
    return (
        <ul className="research-ancestry-list">
            {ancestry(magic.graph, anchors).map((p) => (
                <li key={`${p.from}-${p.to}`}>
                    <p><strong>{names([p.from])} и {names([p.to])}:</strong> {p.shortest ? names(p.shortest) : 'по справочнику не связаны'}.</p>
                    <p>Якоря стоят в {p.distance} {p.distance % 10 === 1 && p.distance % 100 !== 11 ? 'клетке' : 'клетках'} друг от друга. Удлиняйте цепочку ходами туда-обратно (Тень → Туман → Тень) или обходом по дуге.</p>
                    {p.fit ? (
                        <p className="research-ancestry-fit">
                            {p.fit.cells} {cellsWord(p.fit.cells)}: {names(p.fit.chain)}
                            {p.fit.cells === p.straight ? ' (по прямой)' : ` (обходите по дуге, по прямой здесь ${p.straight} ${cellsWord(p.straight)})`}
                        </p>
                    ) : (
                        <p className="research-ancestry-fit">На {p.straight}–{p.straight + 2} {cellsWord(p.straight + 2)} цепочки нет: нужна дуга длиннее.</p>
                    )}
                </li>
            ))}
        </ul>
    )
}

function ChainIcon() {
    return (
        <svg className="research-chain" width="16" height="16" viewBox="0 0 16 16" aria-label="связан" role="img">
            <rect x="1.5" y="5" width="7" height="6" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <rect x="7.5" y="5" width="7" height="6" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    )
}
