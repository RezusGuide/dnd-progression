import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { ALIGNMENTS, CLASSES, RACES, className, raceName } from '../../constants/dnd-ru'
import { canLevelUp, nextLevelXp } from '../../lib/dnd-rules'
import { resizeImageFile } from '../../lib/image'
import { KeySelect, Labelled, NumberValue, TextValue } from './parts'

const SAVE_TEXT = { saving: 'Подшиваю…', saved: 'Подшито в дело', error: 'Не подшилось. Повторите.' }

// Top bar (back, save status, share link) and the "Личное дело" card:
// portrait, name, one-line summary, XP bar. In edit mode the summary
// turns into fields.
export default function SheetHeader({ character, form, update, canEdit, editing, setEditing, saveState }) {
    const [copied, setCopied] = useState('')

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
                                    <NumberValue editing value={form.level} min={1} max={20} label="Уровень" onChange={(v) => update({ level: v ?? 1 })} />
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
                        {/* Rune level caps arrive in stage 5; this is where they'll show. */}
                        {ready && <p className="sheet-levelup" role="status">Можно повышать уровень. Повышение утверждает ГМ.</p>}
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
        </>
    )
}
