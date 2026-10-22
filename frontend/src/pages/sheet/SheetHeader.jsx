import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button, HelpTip, Modal, Stamp } from '../../components/ui'
import RuneBadge from '../../components/brand/RuneBadge'
import { useRefData } from '../../lib/refData'
import { ALIGNMENTS, CLASSES, RACES, className, raceName } from '../../constants/dnd-ru'
import { abilityMod, averageHitDie, canLevelUp, formatMod, levelUpHp, nextLevelXp } from '../../lib/dnd-rules'
import { resizeImageFile } from '../../lib/image'
import { KeySelect, Labelled, NumberValue, TextValue } from './parts'

const SAVE_TEXT = { saving: 'Подшиваю…', saved: 'Подшито в дело', error: 'Не подшилось. Повторите.' }

// Top bar (back, save status, share link) and the "Личное дело" card:
// portrait, name, one-line summary, XP bar. In edit mode the summary
// turns into fields.
const STAMP = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' }

export default function SheetHeader({ character, form, update, canEdit, editing, setEditing, saveState, requests = [], requestLevelUp }) {
    const [copied, setCopied] = useState('')
    const { hasSection } = useAuth()
    const isGm = hasSection('*')
    const [runes] = useRefData('runes')
    const [askOpen, setAskOpen] = useState(false)
    const [askComment, setAskComment] = useState('')
    const [askError, setAskError] = useState('')
    // Hit points for the new level: AVERAGE (half the die + 1) or ROLL.
    const [askHp, setAskHp] = useState({ method: 'AVERAGE', roll: '' })

    const share = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href.split('?')[0])
            setCopied('ok')
        } catch {
            setCopied('failed')
        }
        setTimeout(() => setCopied(''), 2500)
    }

    const onPortrait = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = '' // re-selecting the same file re-fires onChange
        if (!file) return
        try {
            update({ portraitData: await resizeImageFile(file) })
        } catch (err) {
            console.error(err)
        }
    }

    const caseNo = String(character.id).padStart(4, '0')
    const summary = [
        className(form.characterClass),
        raceName(form.race),
        `${form.level} уровень`,
        form.background,
        form.alignment,
    ].filter(Boolean).join(' · ')

    const next = nextLevelXp(form.level)
    const xp = form.experiencePoints ?? 0
    const pct = next ? Math.min(100, Math.round((xp / next) * 100)) : 100
    const ready = canLevelUp(xp, form.level)

    const tier = character.runeTier || 'COMMON'
    const rune = runes?.find((r) => r.key === tier)
    const levelCap = character.levelCap ?? rune?.levelCap ?? 10
    const status = character.approvalStatus || 'APPROVED'
    const creation = requests.find((r) => r.type === 'CREATION')
    const openLevelUp = requests.find((r) => r.type === 'LEVEL_UP' && r.status === 'PENDING')
    const nextAboveCap = form.level + 1 > levelCap

    const die = parseInt(String(form.hitDiceType || 'd8').slice(1), 10) || 8
    const conMod = abilityMod(form.constitution)
    const rolled = parseInt(askHp.roll, 10)
    const rollOk = rolled >= 1 && rolled <= die
    const dieValue = askHp.method === 'ROLL' ? (rollOk ? rolled : null) : averageHitDie(die)

    const submitAsk = async () => {
        setAskError('')
        if (askHp.method === 'ROLL' && !rollOk) {
            setAskError(`Бросок кости хитов — от 1 до ${die}.`)
            return
        }
        const error = await requestLevelUp(askComment, { hpMethod: askHp.method, hpRoll: askHp.method === 'ROLL' ? rolled : null })
        if (error) setAskError(error)
        else { setAskOpen(false); setAskComment(''); setAskHp({ method: 'AVERAGE', roll: '' }) }
    }

    return (
        <>
            <div className="sheet-topbar">
                <Link to="/characters" className="ui-page-back">← Личные дела</Link>
                <div className="sheet-topbar-right">
                    {canEdit && saveState !== 'idle' && (
                        <span className={`sheet-save sheet-save-${saveState}`} role="status">{SAVE_TEXT[saveState]}</span>
                    )}
                    <Button variant="ghost" onClick={share}>
                        {copied === 'ok' ? 'Копия снята.' : copied === 'failed' ? 'Скопируйте адрес из строки браузера' : 'Копия ссылки'}
                    </Button>
                </div>
            </div>

            <section className="sheet-header ui-dossier" aria-label="Личное дело">
                <span className="ui-dossier-tab">Личное дело</span>
                <span className="ui-dossier-no">Дело № {caseNo}</span>
                <span className="ui-corner ui-corner-tl" aria-hidden="true" />
                <span className="ui-corner ui-corner-tr" aria-hidden="true" />
                <span className="ui-corner ui-corner-bl" aria-hidden="true" />
                <span className="ui-corner ui-corner-br" aria-hidden="true" />

                <div className="sheet-header-main">
                    <label className={`sheet-portrait ${editing ? 'is-editable' : ''}`} aria-label={editing ? 'Сменить портрет' : undefined}>
                        {form.portraitData ? <img src={form.portraitData} alt="" /> : <span aria-hidden="true">🗡</span>}
                        {editing && <input type="file" accept="image/*" onChange={onPortrait} hidden />}
                    </label>

                    <div className="sheet-header-text">
                        {editing ? (
                            <input className="sheet-input sheet-name-input" value={form.name} aria-label="Имя" onChange={(e) => update({ name: e.target.value })} />
                        ) : (
                            <h1 className="sheet-name">{form.name || 'Без имени'}</h1>
                        )}

                        {editing ? (
                            <div className="sheet-header-fields">
                                <Labelled label="Класс">
                                    <KeySelect editing value={form.characterClass} options={Object.keys(CLASSES)} display={className} label="Класс" onChange={(v) => update({ characterClass: v })} />
                                </Labelled>
                                <Labelled label="Раса">
                                    <KeySelect editing value={form.race} options={Object.keys(RACES)} display={raceName} label="Раса" onChange={(v) => update({ race: v })} />
                                </Labelled>
                                <Labelled label="Уровень">
                                    {isGm ? (
                                        <NumberValue editing value={form.level} min={1} max={20} label="Уровень" onChange={(v) => update({ level: v ?? 1 })} />
                                    ) : (
                                        <span className="sheet-text">
                                            {form.level} <HelpTip label="Уровень">Уровень повышает ГМ. Подайте заявку, когда хватит опыта.</HelpTip>
                                        </span>
                                    )}
                                </Labelled>
                                <Labelled label="Предыстория">
                                    <TextValue editing value={form.background} label="Предыстория" onChange={(v) => update({ background: v })} />
                                </Labelled>
                                <Labelled label="Мировоззрение">
                                    <KeySelect editing value={form.alignment} options={ALIGNMENTS} display={(a) => a} label="Мировоззрение" onChange={(v) => update({ alignment: v })} />
                                </Labelled>
                                <Labelled label="Имя игрока">
                                    <TextValue editing value={form.playerName} label="Имя игрока" onChange={(v) => update({ playerName: v })} />
                                </Labelled>
                                <Labelled label="Опыт">
                                    <NumberValue editing value={form.experiencePoints} min={0} label="Опыт" onChange={(v) => update({ experiencePoints: v ?? 0 })} />
                                </Labelled>
                            </div>
                        ) : (
                            <p className="sheet-summary">
                                {summary}
                                {form.playerName && <span className="sheet-player"> · игрок {form.playerName}</span>}
                                {character.campaign && <span className="sheet-player"> · кампания «{character.campaign.name}»</span>}
                            </p>
                        )}

                        <div className="sheet-xp">
                            <div
                                className="sheet-xp-bar"
                                role="progressbar"
                                aria-label="Опыт"
                                aria-valuemin={0}
                                aria-valuemax={next ?? xp}
                                aria-valuenow={xp}
                            >
                                <span style={{ width: `${pct}%` }} />
                            </div>
                            <span className="sheet-xp-text">
                                {next ? `Опыт ${xp.toLocaleString('ru-RU')} / ${next.toLocaleString('ru-RU')} до ${form.level + 1} уровня` : `Опыт ${xp.toLocaleString('ru-RU')} · высший уровень`}
                            </span>
                        </div>
                        <p className="sheet-rune">
                            <RuneBadge tier={tier} size={24} />
                            <span>Руна: {(rune?.nameRu || 'обычная').toLowerCase()} · потолок {levelCap}</span>
                            {character.clearanceLevel && <span className="sheet-clearance">допуск до {character.clearanceLevel} уровня</span>}
                        </p>

                        {canEdit && status === 'APPROVED' && ready && (
                            openLevelUp ? (
                                <p className="sheet-levelup" role="status">Заявка на рассмотрении: {openLevelUp.requestedLevel} уровень.</p>
                            ) : (
                                <div className="sheet-levelup-row">
                                    <Button onClick={() => setAskOpen(true)}>Заявка на повышение</Button>
                                    <span className="sheet-levelup-note">Можно повышать уровень. Повышение утверждает ГМ.</span>
                                </div>
                            )
                        )}
                    </div>

                    <div className="sheet-status">
                        <Stamp kind={STAMP[status] || 'approved'}>
                            {status === 'PENDING' ? 'На рассмотрении' : status === 'REJECTED' ? 'Отказано' : 'Одобрено'}
                        </Stamp>
                        {status === 'REJECTED' && creation?.gmComment && <p className="sheet-gm-comment">ГМ: {creation.gmComment}</p>}
                        {status === 'PENDING' && <p className="sheet-gm-comment">Дело ждёт решения ГМ.</p>}
                    </div>

                    {canEdit && (
                        <div className="sheet-edit-toggle">
                            <Button variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing(!editing)} aria-pressed={editing}>
                                {editing ? 'Готово' : 'Править дело'}
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            {askOpen && (
                <Modal
                    title="Заявка на повышение"
                    onClose={() => setAskOpen(false)}
                    actions={<>
                        <Button variant="ghost" onClick={() => setAskOpen(false)}>Отмена</Button>
                        <Button onClick={submitAsk}>Подать заявку</Button>
                    </>}
                >
                    <p>Повысить до {form.level + 1} уровня.</p>
                    {nextAboveCap && <p className="sheet-gm-comment">Сверх потолка руны: нужен допуск.</p>}
                    <p className="sheet-label">Хиты за уровень</p>
                    <div className="sheet-tabs levelup-hp-tabs" role="tablist" aria-label="Хиты за уровень">
                        {[['AVERAGE', 'Среднее'], ['ROLL', 'Бросок']].map(([key, label]) => (
                            <button key={key} type="button" role="tab" aria-selected={askHp.method === key}
                                className={`sheet-tab ${askHp.method === key ? 'is-active' : ''}`}
                                onClick={() => setAskHp((h) => ({ ...h, method: key }))}>{label}</button>
                        ))}
                    </div>
                    {askHp.method === 'AVERAGE' ? (
                        <p className="levelup-hp-help">Половина кости к{die} + 1 = {averageHitDie(die)}.</p>
                    ) : (
                        <div className="levelup-hp-roll">
                            <label className="sheet-label" htmlFor="levelup-roll">Выпало на к{die}</label>
                            <input id="levelup-roll" className="sheet-input" type="number" inputMode="numeric" min={1} max={die}
                                value={askHp.roll} onChange={(e) => setAskHp((h) => ({ ...h, roll: e.target.value }))} />
                        </div>
                    )}
                    <p className="levelup-hp-total" role="status">
                        {dieValue === null
                            ? `Введите число от 1 до ${die}.`
                            : `Хиты: +${levelUpHp(dieValue, conMod)} (${dieValue} ${formatMod(conMod)} ТЕЛ, не меньше 1). Начислятся после одобрения.`}
                    </p>
                    <label className="sheet-label" htmlFor="levelup-comment">Комментарий для ГМ</label>
                    <textarea id="levelup-comment" className="sheet-input sheet-textarea" rows={3} value={askComment} onChange={(e) => setAskComment(e.target.value)} />
                    {askError && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {askError}</p>}
                </Modal>
            )}
        </>
    )
}
