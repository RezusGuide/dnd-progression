import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { Button, Dossier, Loader, Modal } from '../../components/ui'
import WeekGrid from '../../components/calendar/WeekGrid'
import MonthCalendar from '../../components/calendar/MonthCalendar'
import { GRID_LENGTH, PRESETS, SLOTS, allZones, browserZone, cityName, clearSleep, slotLabel, timeToSlot } from '../../lib/calendar'

// «Моё время»: zone, sleep, the weekly grid and exceptions on dates. All in
// local time; the server turns it into UTC when it looks for windows.

const TIMES = Array.from({ length: SLOTS }, (_, s) => slotLabel(s))
const TIMES_END = [...TIMES.slice(1), '24:00']
const minutes = (hhmm) => (hhmm === '24:00' ? 1440 : timeToSlot(hhmm) * 30)
const hhmm = (min) => (min >= 1440 ? '24:00' : slotLabel(min / 30))

export default function MyTimeTab() {
    const [form, setForm] = useState(null)
    const [saveState, setSaveState] = useState('') // '' | saving | saved | error
    const [error, setError] = useState('')
    const [exceptions, setExceptions] = useState([])
    const [picked, setPicked] = useState(null) // a date for the exception dialog
    const zones = allZones()

    useEffect(() => {
        api.get('/api/me/availability', { params: { zone: browserZone() } })
            .then((res) => setForm({ ...res.data, timezone: res.data.timezone || browserZone() }))
            .catch(() => setForm({ exists: false, timezone: browserZone(), sleepStart: '00:00', sleepEnd: '08:00', weeklyGrid: '0'.repeat(GRID_LENGTH) }))
        api.get('/api/me/availability/exceptions').then((res) => setExceptions(res.data)).catch(() => {})
    }, [])

    if (!form) return <Loader />

    const set = (patch) => {
        setSaveState('')
        setForm((f) => {
            const next = { ...f, ...patch }
            if (patch.sleepStart || patch.sleepEnd) next.weeklyGrid = clearSleep(next.weeklyGrid, next.sleepStart, next.sleepEnd)
            return next
        })
    }

    const save = async () => {
        setSaveState('saving')
        setError('')
        try {
            const res = await api.put('/api/me/availability', form)
            setForm(res.data)
            setSaveState('saved')
        } catch (err) {
            setSaveState('error')
            setError(err.response?.data?.message || 'Не подшилось. Повторите.')
        }
    }

    const zoneKnown = zones.includes(form.timezone)
    const marks = Object.fromEntries(exceptions.map((e) => [e.date, e.kind]))

    return (
        <div className="calendar-time">
            <Dossier tab="График присутствия" className="calendar-card">
                <div className="calendar-fields">
                    <label className="calendar-field">
                        <span className="sheet-label">Часовой пояс</span>
                        <input className="sheet-input" list="calendar-zones" value={form.timezone}
                            onChange={(e) => set({ timezone: e.target.value })} aria-describedby="zone-city" />
                        <datalist id="calendar-zones">{zones.map((z) => <option key={z} value={z}>{cityName(z)}</option>)}</datalist>
                        <span id="zone-city" className={`calendar-zone-city ${zoneKnown ? '' : 'is-bad'}`}>
                            {zoneKnown ? cityName(form.timezone) : 'Такого пояса нет в списке'}
                        </span>
                    </label>
                    <Button variant="ghost" onClick={() => set({ timezone: browserZone() })}>Определить автоматически</Button>
                    <label className="calendar-field">
                        <span className="sheet-label">Сон с</span>
                        <select className="sheet-input" value={form.sleepStart} onChange={(e) => set({ sleepStart: e.target.value })}>
                            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                    <label className="calendar-field">
                        <span className="sheet-label">до</span>
                        <select className="sheet-input" value={form.sleepEnd} onChange={(e) => set({ sleepEnd: e.target.value })}>
                            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                </div>

                <p className="calendar-help">Зажмите мышь и проведите по клеткам, чтобы отметить свободное время. Штриховка — сон, его не отметить.</p>
                <div className="calendar-presets">
                    <Button variant="secondary" onClick={() => set({ weeklyGrid: PRESETS.weekdayEvenings(form.weeklyGrid, form.sleepStart, form.sleepEnd) })}>Будни вечером 19–23</Button>
                    <Button variant="secondary" onClick={() => set({ weeklyGrid: PRESETS.weekendDays(form.weeklyGrid, form.sleepStart, form.sleepEnd) })}>Выходные днём 12–20</Button>
                    <Button variant="ghost" onClick={() => set({ weeklyGrid: '0'.repeat(GRID_LENGTH) })}>Очистить</Button>
                </div>
                <WeekGrid grid={form.weeklyGrid} sleepStart={form.sleepStart} sleepEnd={form.sleepEnd} onChange={(g) => set({ weeklyGrid: g })} />

                {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                <div className="calendar-save">
                    <Button onClick={save} disabled={saveState === 'saving' || !zoneKnown}>Подшить расписание</Button>
                    {saveState === 'saved' && <span className="calendar-saved" role="status">Подшито</span>}
                    {!form.exists && saveState !== 'saved' && <span className="calendar-help">Расписание ещё не подшито.</span>}
                </div>
            </Dossier>

            <Dossier tab="Исключения" className="calendar-card calendar-exceptions">
                <p className="calendar-help">Даты, когда всё не как обычно. Нажмите на дату.</p>
                <MonthCalendar marks={marks} onPick={setPicked} />
                {exceptions.length > 0 && (
                    <ul className="calendar-exception-list">
                        {exceptions.map((e) => (
                            <li key={e.id}>
                                <span className={`calendar-kind is-${e.kind.toLowerCase()}`}>{e.kind === 'BUSY' ? 'Занят' : 'Свободен'}</span>
                                {' '}{new Date(`${e.date}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                                {e.startMinute != null ? `, ${hhmm(e.startMinute)}–${hhmm(e.endMinute)}` : ', весь день'}
                                <button type="button" className="gate-link" onClick={async () => {
                                    await api.delete(`/api/me/availability/exceptions/${e.id}`).catch(() => {})
                                    setExceptions((list) => list.filter((x) => x.id !== e.id))
                                }}>Убрать</button>
                            </li>
                        ))}
                    </ul>
                )}
            </Dossier>

            {picked && (
                <ExceptionDialog date={picked} onClose={() => setPicked(null)}
                    onSaved={(e) => { setExceptions((list) => [...list, e].sort((a, b) => a.date.localeCompare(b.date))); setPicked(null) }} />
            )}
        </div>
    )
}

function ExceptionDialog({ date, onClose, onSaved }) {
    const [mode, setMode] = useState('BUSY_DAY')
    const [from, setFrom] = useState('18:00')
    const [to, setTo] = useState('22:00')
    const [error, setError] = useState('')
    const save = async () => {
        setError('')
        const body = mode === 'BUSY_DAY'
            ? { date, kind: 'BUSY', startMinute: null, endMinute: null }
            : { date, kind: mode === 'BUSY' ? 'BUSY' : 'FREE', startMinute: minutes(from), endMinute: minutes(to) }
        try {
            const res = await api.post('/api/me/availability/exceptions', body)
            onSaved(res.data)
        } catch (err) {
            setError(err.response?.data?.message || 'Не подшилось. Повторите.')
        }
    }
    const label = new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
    return (
        <Modal title={`Исключение: ${label}`} onClose={onClose}
            actions={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button onClick={save}>Подшить</Button></>}>
            <fieldset className="calendar-modes">
                <legend className="visually-hidden">Что в этот день</legend>
                {[['BUSY_DAY', 'Занят весь день'], ['BUSY', 'Занят с… по…'], ['FREE', 'Свободен с… по…']].map(([k, text]) => (
                    <label key={k} className="wiz-skill"><input type="radio" name="exc-mode" checked={mode === k} onChange={() => setMode(k)} /> <span>{text}</span></label>
                ))}
            </fieldset>
            {mode !== 'BUSY_DAY' && (
                <div className="calendar-fields">
                    <label className="calendar-field"><span className="sheet-label">С</span>
                        <select className="sheet-input" value={from} onChange={(e) => setFrom(e.target.value)}>{TIMES.map((t) => <option key={t}>{t}</option>)}</select>
                    </label>
                    <label className="calendar-field"><span className="sheet-label">По</span>
                        <select className="sheet-input" value={to} onChange={(e) => setTo(e.target.value)}>{TIMES_END.map((t) => <option key={t}>{t}</option>)}</select>
                    </label>
                </div>
            )}
            {mode === 'FREE' && <p className="calendar-help">Сон остаётся сном: свободное время внутри сна не засчитывается.</p>}
            {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
        </Modal>
    )
}
