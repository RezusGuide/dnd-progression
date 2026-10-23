import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { Loader } from '../../components/ui'
import SourceCode from '../../components/SourceCode'
import { OPTION_STATUS_LABELS } from '../../lib/refData'

// Пульт ГМ → «Справочник»: which races and classes players may pick.
// Statuses come from data/*.json; a change here is stored as an override
// in the database. Unlock conditions are neutral keys - what they mean is
// only the GM's own label.
const STATUS_LABELS = OPTION_STATUS_LABELS
const RACE_STATUSES = ['allowed', 'unlockable', 'undecided', 'closed']
const CLASS_STATUSES = [...RACE_STATUSES, 'npc_only']

export default function AdminOptions() {
    const [view, setView] = useState(null)
    const [filter, setFilter] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        api.get('/api/admin/options').then((res) => setView(res.data)).catch(() => setError('Справочник не загрузился. Обновите страницу.'))
    }, [])

    const save = async (request) => {
        setError('')
        try {
            const res = await request()
            setView(res.data)
        } catch (err) {
            setError(err.response?.data?.message || 'Не сохранилось. Повторите.')
        }
    }
    const setStatus = (kind, key, status) => save(() => api.put(`/api/admin/options/${kind}/${encodeURIComponent(key)}`, { status }))
    const setFlag = (key, patch) => save(() => api.put(`/api/admin/unlock-flags/${encodeURIComponent(key)}`, patch))

    return (
        <section id="options" className="sheet-section admin-section">
            <h2 className="sheet-section-title" style={{ marginBottom: '0.75rem' }}>Справочник</h2>
            <p className="tome-subtitle">Какие расы и классы видят игроки в мастере создания. Уже заведённых персонажей это не меняет.</p>
            {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
            {!view && !error && <Loader />}
            {view && (
                <>
                    <label className="options-filter">
                        <span className="sheet-label">Статус</span>
                        <select className="sheet-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="">Все</option>
                            {CLASS_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                    </label>
                    <OptionsTable title="Расы" kind="race" rows={view.races} statuses={RACE_STATUSES} filter={filter} flags={view.flags} onStatus={setStatus} />
                    <OptionsTable title="Классы" kind="class" rows={view.classes} statuses={CLASS_STATUSES} filter={filter} flags={view.flags} onStatus={setStatus} />
                    {/* Backgrounds: only "Своя" has a status worth switching. */}
                    <OptionsTable title="Предыстории" kind="background" rows={(view.backgrounds || []).filter((r) => r.key === 'CUSTOM')}
                        statuses={RACE_STATUSES} filter={filter} flags={view.flags} onStatus={setStatus} />
                    <UnlockFlags flags={view.flags} onChange={setFlag} />
                </>
            )}
        </section>
    )
}

function counters(rows, statuses) {
    return statuses
        .map((s) => [s, rows.filter((r) => r.status === s).length])
        .filter(([, n]) => n > 0)
        .map(([s, n]) => `${STATUS_LABELS[s]} ${n}`)
        .join(' · ')
}

function OptionsTable({ title, kind, rows, statuses, filter, flags, onStatus }) {
    const shown = filter ? rows.filter((r) => r.status === filter) : rows
    const flagOpen = (key) => flags.find((f) => f.key === key)?.unlocked
    return (
        <div className="options-block">
            <h3 className="reception-section-title">{title}</h3>
            <p className="options-counters">{counters(rows, statuses)}</p>
            {shown.length > 0 && <div className="options-table-wrap">
                <table className="options-table">
                    <thead>
                        <tr><th scope="col">Название</th><th scope="col">Источник</th><th scope="col">Статус</th><th scope="col">Открытие</th></tr>
                    </thead>
                    <tbody>
                        {shown.map((r) => (
                            <tr key={r.key} className={r.overridden ? 'is-overridden' : ''}>
                                <th scope="row">
                                    {r.nameRu}
                                    {r.srd && <span className="options-tag">SRD</span>}
                                </th>
                                <td className="options-source"><SourceCode code={r.source} /></td>
                                <td>
                                    <select className="sheet-input" aria-label={`Статус: ${r.nameRu}`} value={r.status}
                                        onChange={(e) => onStatus(kind, r.key, e.target.value)}>
                                        {statuses.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                                    </select>
                                    {r.overridden && <span className="options-note">изменено ГМ, в списке: {STATUS_LABELS[r.defaultStatus]}</span>}
                                </td>
                                <td>
                                    {r.status === 'unlockable' && (r.unlock
                                        ? <span className={flagOpen(r.unlock) ? 'options-open' : ''}><code>{r.unlock}</code> · {flagOpen(r.unlock) ? 'открыто' : 'закрыто'}</span>
                                        : <span className="options-note">без условия: откройте статусом «Доступно»</span>)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>}
            {shown.length === 0 && <p className="wiz-help">С этим статусом ничего нет.</p>}
        </div>
    )
}

function UnlockFlags({ flags, onChange }) {
    return (
        <div className="options-block">
            <h3 className="reception-section-title">Условия открытия</h3>
            <p className="tome-subtitle">Подпись видите только вы. Игрокам показывается лишь «Пока закрыто».</p>
            <ul className="options-flags">
                {/* Keyed by the saved label too, so the field resets after a save. */}
                {flags.map((f) => <FlagRow key={`${f.key}:${f.gmLabel || ''}`} flag={f} onChange={onChange} />)}
            </ul>
        </div>
    )
}

function FlagRow({ flag, onChange }) {
    const [label, setLabel] = useState(flag.gmLabel || '')
    return (
        <li className="options-flag">
            <code className="options-flag-key">{flag.key}</code>
            <label className="options-flag-label">
                <span className="sheet-label">Подпись</span>
                <input className="sheet-input" value={label} onChange={(e) => setLabel(e.target.value)}
                    onBlur={() => { if (label !== (flag.gmLabel || '')) onChange(flag.key, { gmLabel: label }) }} />
            </label>
            <label className="wiz-skill options-flag-toggle">
                <input type="checkbox" checked={flag.unlocked} onChange={(e) => onChange(flag.key, { unlocked: e.target.checked })} />
                <span>Открыто</span>
            </label>
            {flag.options.length > 0 && <p className="options-note">Открывает: {flag.options.join(', ')}</p>}
        </li>
    )
}
