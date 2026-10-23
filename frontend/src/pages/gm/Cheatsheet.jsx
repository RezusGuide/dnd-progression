import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { Button, Dossier, EmptyState } from '../../components/ui'
import Markdown from '../../components/world/Markdown'
import {
    CHALLENGE_RATINGS, CR_XP, XP_THRESHOLDS, abilityMod, encounterDifficulty, formatMod, proficiencyBonus,
} from '../../lib/dnd-rules'
import { DIFFICULTY_LABEL } from '../../lib/gm'
import '../../styles/world.css'

// «Шпаргалка»: rules at hand (SRD 5.1, in our own words), the encounter
// calculator (DMG 2014 thresholds and multipliers), and «Мои правила
// мира» - the GM's note, kept in the database and shown to nobody else.
export default function Cheatsheet() {
    return (
        <section className="gm-section">
            <h1 className="gm-title">Шпаргалка</h1>
            <EncounterCalculator />
            <WorldRules />
            <Rules />
        </section>
    )
}

function EncounterCalculator() {
    const [staff, setStaff] = useState([])
    const [campaign, setCampaign] = useState('')
    const [party, setParty] = useState([])
    const [monsters, setMonsters] = useState([{ cr: '1', count: 1 }])
    useEffect(() => {
        api.get('/api/admin/staff').then((res) => setStaff(res.data.filter((r) => r.approvalStatus === 'APPROVED'))).catch(() => {})
    }, [])
    const campaigns = [...new Map(staff.filter((r) => r.campaignId).map((r) => [r.campaignId, r.campaignName])).entries()]
    const pickCampaign = (id) => {
        setCampaign(id)
        if (id) setParty(staff.filter((r) => String(r.campaignId) === id).map((r) => r.id))
    }
    const toggle = (id) => setParty((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    const setMonster = (i, patch) => setMonsters(monsters.map((m, j) => (j === i ? { ...m, ...patch } : m)))
    const levels = staff.filter((r) => party.includes(r.id)).map((r) => r.level)
    const result = levels.length ? encounterDifficulty(levels, monsters.map((m) => ({ cr: m.cr, count: Number(m.count) || 0 }))) : null

    return (
        <Dossier tab="Сложность боя" className="gm-card">
            <div className="gm-calc">
                <div>
                    <p className="sheet-label">Отряд</p>
                    <select className="sheet-input" aria-label="Кампания" value={campaign} onChange={(e) => pickCampaign(e.target.value)}>
                        <option value="">— Выбрать кампанию —</option>
                        {campaigns.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                    <div className="gm-calc-party">
                        {staff.length === 0 && <span className="calendar-help">Одобренных персонажей нет.</span>}
                        {staff.map((r) => (
                            <label key={r.id} className="wiz-skill">
                                <input type="checkbox" checked={party.includes(r.id)} onChange={() => toggle(r.id)} />
                                <span>{r.name} · {r.level} ур.</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="sheet-label">Монстры</p>
                    {monsters.map((m, i) => (
                        <div key={i} className="gm-calc-monster">
                            <label>ПО <select className="sheet-input" aria-label={`Показатель опасности ${i + 1}`} value={m.cr} onChange={(e) => setMonster(i, { cr: e.target.value })}>
                                {CHALLENGE_RATINGS.map((cr) => <option key={cr} value={cr}>{cr} ({CR_XP[cr].toLocaleString('ru-RU')} оп.)</option>)}
                            </select></label>
                            <label>× <input type="number" min="1" max="99" className="sheet-input sheet-input-num" aria-label={`Сколько ${i + 1}`} value={m.count}
                                onChange={(e) => setMonster(i, { count: e.target.value })} /></label>
                            <Button variant="ghost" onClick={() => setMonsters(monsters.filter((_, j) => j !== i))} disabled={monsters.length === 1}>Убрать</Button>
                        </div>
                    ))}
                    <Button variant="secondary" onClick={() => setMonsters([...monsters, { cr: '1/2', count: 1 }])}>+ Монстр</Button>
                </div>
            </div>
            {!result ? <p className="calendar-help">Выберите отряд.</p> : (
                <div className="gm-calc-result">
                    <p className={`gm-difficulty is-${result.difficulty.toLowerCase()}`}>{DIFFICULTY_LABEL[result.difficulty]}</p>
                    <p>Опыт монстров {result.baseXp.toLocaleString('ru-RU')} × {result.multiplier} (монстров {result.monsters}, в отряде {levels.length}) = <b>{result.adjustedXp.toLocaleString('ru-RU')}</b></p>
                    <p className="calendar-help">Пороги отряда: лёгкий {result.thresholds[0]}, средний {result.thresholds[1]}, сложный {result.thresholds[2]}, смертельный {result.thresholds[3]}.
                        Каждому за бой: {Math.floor(result.baseXp / levels.length).toLocaleString('ru-RU')} опыта (без множителя).</p>
                </div>
            )}
        </Dossier>
    )
}

function WorldRules() {
    const [body, setBody] = useState('')
    const [saved, setSaved] = useState(null)
    const [state, setState] = useState('idle')
    useEffect(() => {
        api.get('/api/admin/gm-note').then((res) => { setBody(res.data.body || ''); setSaved(res.data.body || '') }).catch(() => setSaved(''))
    }, [])
    const save = async () => {
        setState('saving')
        try {
            const res = await api.put('/api/admin/gm-note', { body })
            setSaved(res.data.body || '')
            setState('saved')
        } catch {
            setState('error')
        }
    }
    return (
        <Dossier tab="Мои правила мира" className="gm-card">
            <p className="calendar-help">Видите только вы. Хранится в базе, в репозиторий не попадает.</p>
            <div className="gm-note">
                <textarea className="sheet-input sheet-textarea gm-note-input" rows={12} aria-label="Мои правила мира (Markdown)"
                    value={body} onChange={(e) => { setBody(e.target.value); setState('idle') }} placeholder="## Свои правила&#10;&#10;- …" />
                <div className="gm-note-preview">
                    {body.trim() ? <Markdown body={body} known={new Set()} /> : <EmptyState>Заметка пуста.</EmptyState>}
                </div>
            </div>
            <div className="tome-btn-row">
                <Button onClick={save} disabled={saved === null || body === saved || state === 'saving'}>Подшить</Button>
                {state === 'saved' && <span className="calendar-saved" role="status">Подшито</span>}
                {state === 'error' && <span className="ui-field-error" role="alert">Не подшилось. Повторите.</span>}
            </div>
        </Dossier>
    )
}

const DCS = [['Очень лёгкая', 5], ['Лёгкая', 10], ['Средняя', 15], ['Трудная', 20], ['Очень трудная', 25], ['Почти невозможная', 30]]
const SCORES = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]

function Rules() {
    return (
        <div className="gm-rules">
            <Dossier tab="Модификаторы" className="gm-card">
                <table className="gm-mini"><tbody>
                    <tr><th scope="row">Значение</th>{SCORES.map((s) => <td key={s}>{s === 1 ? '1' : `${s}–${s + 1}`}</td>)}</tr>
                    <tr><th scope="row">Модиф.</th>{SCORES.map((s) => <td key={s}>{formatMod(abilityMod(s))}</td>)}</tr>
                </tbody></table>
                <p className="sheet-label">Бонус мастерства</p>
                <p>{[1, 5, 9, 13, 17].map((l) => `${l}–${l + 3} ур.: ${formatMod(proficiencyBonus(l))}`).join(' · ')}</p>
            </Dossier>
            <Dossier tab="Сложность проверок" className="gm-card">
                <ul className="gm-facts">{DCS.map(([n, dc]) => <li key={dc}>{n}: СЛ {dc}</li>)}</ul>
            </Dossier>
            <Dossier tab="Деньги" className="gm-card">
                <ul className="gm-facts">
                    <li>1 пм = 10 зм</li><li>1 зм = 2 эм = 10 см = 100 мм</li><li>1 эм = 5 см</li><li>50 монет весят 1 фунт</li>
                </ul>
            </Dossier>
            <Dossier tab="Путешествия" className="gm-card">
                <ul className="gm-facts">
                    <li>Быстрый темп: 400 фт в минуту, 4 мили в час, 30 миль в день; −5 к пассивному Восприятию.</li>
                    <li>Обычный: 300 фт, 3 мили, 24 мили.</li>
                    <li>Медленный: 200 фт, 2 мили, 18 миль; можно двигаться скрытно.</li>
                    <li>Больше 8 часов в день — спасбросок Телосложения против истощения, СЛ 10 + 1 за каждый лишний час.</li>
                </ul>
            </Dossier>
            <Dossier tab="Отдых" className="gm-card">
                <ul className="gm-facts">
                    <li>Короткий: от 1 часа. Можно тратить Кости хитов: бросок + модификатор Телосложения.</li>
                    <li>Долгий: от 8 часов, из них не меньше 6 — сон. Все хиты и половина Костей хитов (не меньше одной). Не чаще раза в сутки.</li>
                </ul>
            </Dossier>
            <Dossier tab="Укрытия" className="gm-card">
                <ul className="gm-facts">
                    <li>Половинное: +2 к КД и спасброскам Ловкости.</li>
                    <li>На три четверти: +5 к КД и спасброскам Ловкости.</li>
                    <li>Полное: цель нельзя выбрать атакой или заклинанием напрямую.</li>
                </ul>
            </Dossier>
            <Dossier tab="Падение и удушье" className="gm-card">
                <ul className="gm-facts">
                    <li>Падение: 1к6 дробящего урона за каждые 10 футов, не больше 20к6. Упавший лежит ничком, если урона не избежал.</li>
                    <li>Задержать дыхание можно на 1 + модификатор Телосложения минут (не меньше 30 секунд).</li>
                    <li>Потом существо держится столько раундов, каков модификатор Телосложения (не меньше одного), затем падает до 0 хитов.</li>
                </ul>
            </Dossier>
            <Dossier tab="Концентрация" className="gm-card">
                <ul className="gm-facts">
                    <li>Получив урон, спасбросок Телосложения: СЛ 10 или половина урона, что больше. За каждый источник урона отдельно.</li>
                    <li>Срывается, если сотворить другое заклинание с концентрацией, стать недееспособным или погибнуть.</li>
                </ul>
            </Dossier>
            <Dossier tab="Опыт по уровням" className="gm-card">
                <table className="gm-mini"><tbody>
                    <tr><th scope="row">Уровень</th>{XP_THRESHOLDS.map((_, i) => <td key={i}>{i + 1}</td>)}</tr>
                    <tr><th scope="row">Опыт</th>{XP_THRESHOLDS.map((xp, i) => <td key={i}>{xp.toLocaleString('ru-RU')}</td>)}</tr>
                </tbody></table>
            </Dossier>
            <Dossier tab="Опыт за монстров" className="gm-card">
                <table className="gm-mini"><tbody>
                    <tr><th scope="row">ПО</th>{CHALLENGE_RATINGS.slice(0, 16).map((cr) => <td key={cr}>{cr}</td>)}</tr>
                    <tr><th scope="row">Опыт</th>{CHALLENGE_RATINGS.slice(0, 16).map((cr) => <td key={cr}>{CR_XP[cr].toLocaleString('ru-RU')}</td>)}</tr>
                    <tr><th scope="row">ПО</th>{CHALLENGE_RATINGS.slice(16).map((cr) => <td key={cr}>{cr}</td>)}</tr>
                    <tr><th scope="row">Опыт</th>{CHALLENGE_RATINGS.slice(16).map((cr) => <td key={cr}>{CR_XP[cr].toLocaleString('ru-RU')}</td>)}</tr>
                </tbody></table>
            </Dossier>
        </div>
    )
}
