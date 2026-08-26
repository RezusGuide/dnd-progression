import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'
import '../styles/minecraft.css'

export default function Minecraft() {
    const { user, hasSection } = useAuth()
    const { t } = useLang()
    const canEdit = hasSection('*')
    const canCrud = !!user

    // Matches the backend's own default MinecraftServer shape (see
    // MinecraftController) so the page renders immediately instead of
    // going blank while the fetch is in flight or if the API is briefly
    // unreachable.
    const DEFAULT_SERVER = {
        ip: 'd2pt.ru', port: 25565, version: '1.20.1',
        motd: 'Bussy server.', status: 'Alive',
        driveUrl: 'https://drive.google.com/drive/folders/1EoiMlww5ziXWTTXAXXL9kMYy3RZgvXGG?hl=ru',
    }

    const [server, setServer] = useState(DEFAULT_SERVER)
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState(null)
    const [copied, setCopied] = useState(false)
    // Live status - an actual Server List Ping to the real server, distinct
    // from the DM-editable `server.status` free-text field above. null
    // while the first ping is still in flight.
    const [liveStatus, setLiveStatus] = useState(null)

    const [polls, setPolls] = useState([])
    const [showPollForm, setShowPollForm] = useState(false)
    const [pollForm, setPollForm] = useState({ question: '', options: '' })

    const fetchLiveStatus = () => {
        api.get('/api/minecraft/status').then((res) => setLiveStatus(res.data)).catch(() => setLiveStatus({ online: false }))
    }

    useEffect(() => {
        api.get('/api/minecraft').then((res) => setServer(res.data)).catch(() => {})
        api.get('/api/polls').then((res) => setPolls(res.data)).catch(() => setPolls([]))
        fetchLiveStatus()
        // A ping is a live network round-trip, not something worth hammering
        // - refresh every 30s while the tab is actually open, not on a timer
        // that keeps running after the user's navigated away.
        const interval = setInterval(fetchLiveStatus, 30000)
        return () => clearInterval(interval)
    }, [])

    const startEdit = () => {
        setForm(server)
        setEditing(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        const res = await api.put('/api/minecraft', form)
        setServer(res.data)
        setEditing(false)
    }

    const handleCopy = async () => {
        if (!server) return
        try {
            await navigator.clipboard.writeText(server.ip)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch { /* clipboard not available - ignore */ }
    }

    const handleCreatePoll = async (e) => {
        e.preventDefault()
        const options = pollForm.options.split('\n').map((o) => o.trim()).filter(Boolean)
        if (!pollForm.question || options.length < 2) return
        const res = await api.post('/api/polls', { question: pollForm.question, options })
        setPolls([res.data, ...polls])
        setPollForm({ question: '', options: '' })
        setShowPollForm(false)
    }

    const handleVote = async (pollId, optionId) => {
        const res = await api.post(`/api/polls/${pollId}/vote`, { optionId })
        setPolls(polls.map((p) => (p.id === pollId ? res.data : p)))
    }

    const handleTogglePollClosed = async (poll) => {
        const res = await api.put(`/api/polls/${poll.id}/${poll.closed ? 'reopen' : 'close'}`)
        setPolls(polls.map((p) => (p.id === poll.id ? res.data : p)))
    }

    const handleDeletePoll = async (id) => {
        await api.delete(`/api/polls/${id}`)
        setPolls(polls.filter((p) => p.id !== id))
    }

    return (
        <div className="mc-page">
            <h1 className="mc-title">{t('minecraftTitle')}</h1>
            <p className="mc-sub">{t('minecraftSubtitle')}</p>

            <div className="mc-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h2 className="mc-panel-title">SERVER.INFO</h2>
                    {canEdit && !editing && <button className="mc-btn-ghost" onClick={startEdit}>{t('minecraftEdit')}</button>}
                </div>

                {editing ? (
                    <form onSubmit={handleSave} className="mc-form">
                        <div className="mc-row">
                            <div>
                                <label className="mc-label">{t('minecraftIp')}</label>
                                <input className="mc-input" value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} />
                            </div>
                            <div>
                                <label className="mc-label">Port</label>
                                <input type="number" className="mc-input" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div className="mc-row">
                            <div>
                                <label className="mc-label">{t('minecraftVersion')}</label>
                                <input className="mc-input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
                            </div>
                            <div>
                                <label className="mc-label">{t('minecraftStatus')}</label>
                                <input className="mc-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="mc-label">MOTD</label>
                            <input className="mc-input" value={form.motd} onChange={(e) => setForm({ ...form, motd: e.target.value })} />
                        </div>
                        <div>
                            <label className="mc-label">{t('minecraftDriveUrl')}</label>
                            <input className="mc-input" value={form.driveUrl || ''} onChange={(e) => setForm({ ...form, driveUrl: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="submit" className="mc-btn">{t('save')}</button>
                            <button type="button" className="mc-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                    </form>
                ) : (
                    <>
                        <p className="mc-motd">{server.motd}</p>
                        <div className="mc-ip-row">
                            <span className="mc-ip-code">{server.ip}:{server.port}</span>
                            <button className="mc-btn-ghost" onClick={handleCopy}>{copied ? t('minecraftCopied') : t('minecraftCopy')}</button>
                        </div>
                        <div className="mc-tags">
                            <span className="mc-tag">{t('minecraftVersion')}: {server.version}</span>
                            <span className="mc-tag">{t('minecraftStatus')}: {server.status}</span>
                        </div>

                        {/* Actual Server List Ping result, separate from the DM-set
                            `status` text tag above - refreshes itself every 30s. */}
                        <div className="mc-tags" style={{ marginTop: '0.4rem' }}>
                            {liveStatus === null ? (
                                <span className="mc-tag">{t('minecraftPinging')}</span>
                            ) : liveStatus.online ? (
                                <span className="mc-tag mc-tag-online">
                                    🟢 {t('minecraftOnline')}
                                    {liveStatus.playersOnline != null && ` — ${liveStatus.playersOnline}/${liveStatus.playersMax ?? '?'} ${t('minecraftPlayers')}`}
                                </span>
                            ) : (
                                <span className="mc-tag mc-tag-offline">🔴 {t('minecraftOffline')}</span>
                            )}
                            <button className="mc-btn-ghost" onClick={fetchLiveStatus} title={t('minecraftRefresh')}>↻</button>
                        </div>
                        {server.driveUrl && (
                            <div>
                                <a href={server.driveUrl} target="_blank" rel="noreferrer" className="mc-drive-link">
                                    📁 {t('minecraftDrive')}
                                </a>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div style={{ maxWidth: 720 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <h2 className="mc-title" style={{ fontSize: '1.1rem' }}>{t('mcPolls')}</h2>
                    {canCrud && <button className="mc-btn" onClick={() => setShowPollForm((v) => !v)}>{t('mcNewPoll')}</button>}
                </div>

                {showPollForm && (
                    <form onSubmit={handleCreatePoll} className="mc-poll-card mc-form">
                        <div>
                            <label className="mc-label">{t('mcPollQuestion')}</label>
                            <input className="mc-input" value={pollForm.question} onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })} required />
                        </div>
                        <div>
                            <label className="mc-label">{t('mcPollOptions')}</label>
                            <textarea className="mc-textarea" rows={4} value={pollForm.options} onChange={(e) => setPollForm({ ...pollForm, options: e.target.value })} required />
                        </div>
                        <button type="submit" className="mc-btn">{t('mcPollCreate')}</button>
                    </form>
                )}

                {polls.length === 0 && !showPollForm && <p className="mc-empty">{t('mcNoPolls')}</p>}

                {polls.map((poll) => {
                    const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0)
                    return (
                        <div key={poll.id} className="mc-poll-card">
                            <p className="mc-poll-question">
                                {poll.question}
                                {poll.closed && <span className="mc-poll-closed">{t('mcPollClosed')}</span>}
                            </p>
                            {poll.options.map((opt) => {
                                const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0
                                return (
                                    <div
                                        key={opt.id}
                                        className="mc-poll-option"
                                        onClick={() => canCrud && !poll.closed && handleVote(poll.id, opt.id)}
                                    >
                                        <span>{opt.label}</span>
                                        <div className="mc-poll-bar-bg">
                                            <div className="mc-poll-bar-fill" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span>{opt.votes} {t('mcPollVotes')} ({pct}%)</span>
                                    </div>
                                )
                            })}
                            <p className="mc-poll-meta">by {poll.authorName}</p>
                            {canCrud && (
                                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
                                    <button className="mc-btn-ghost" onClick={() => handleTogglePollClosed(poll)}>
                                        {poll.closed ? t('mcPollReopen') : t('mcPollClose')}
                                    </button>
                                    <button className="mc-btn-danger" onClick={() => handleDeletePoll(poll.id)}>{t('mcPollDelete')}</button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
