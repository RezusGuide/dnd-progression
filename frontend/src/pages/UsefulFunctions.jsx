import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'
import RelationshipGraph from '../components/RelationshipGraph'
import '../styles/cyberpunk.css'

function daysUntilNextBirthday(birthday) {
    if (!birthday) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [, m, d] = birthday.split('-').map(Number)
    let next = new Date(today.getFullYear(), m - 1, d)
    if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d)
    return Math.round((next - today) / (1000 * 60 * 60 * 24))
}

export default function UsefulFunctions() {
    const { user, hasSection } = useAuth()
    const { t } = useLang()
    const isOwner = hasSection('*')

    const [people, setPeople] = useState([])
    const [connections, setConnections] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [showPersonForm, setShowPersonForm] = useState(false)
    const [personForm, setPersonForm] = useState({ name: '', birthday: '', category: '', notes: '', photoUrl: '' })
    const [showConnForm, setShowConnForm] = useState(false)
    const [connForm, setConnForm] = useState({ personAId: '', personBId: '', label: '' })

    const refresh = () => {
        api.get('/api/people').then((res) => setPeople(res.data)).catch(() => {})
        api.get('/api/people/connections').then((res) => setConnections(res.data)).catch(() => {})
    }

    useEffect(() => {
        if (isOwner) refresh()
    }, [isOwner])

    const selected = people.find((p) => p.id === selectedId) || null

    const upcoming = useMemo(() => {
        return people
            .filter((p) => p.birthday)
            .map((p) => ({ ...p, daysUntil: daysUntilNextBirthday(p.birthday) }))
            .sort((a, b) => a.daysUntil - b.daysUntil)
    }, [people])

    if (!user || !isOwner) {
        return (
            <div className="cp-page">
                <div className="cp-denied">
                    <div className="cp-denied-code">{t('usefulDeniedCode')}</div>
                    <p>{t('usefulDeniedBody')}</p>
                </div>
            </div>
        )
    }

    const handleNodeClick = (person) => {
        setSelectedId(person.id)
        setEditing(false)
    }

    const startEdit = () => {
        setEditForm({ ...selected, birthday: selected.birthday || '' })
        setEditing(true)
    }

    const saveEdit = async (e) => {
        e.preventDefault()
        const res = await api.put(`/api/people/${editForm.id}`, { ...editForm, birthday: editForm.birthday || null })
        setPeople(people.map((p) => (p.id === res.data.id ? res.data : p)))
        setEditing(false)
    }

    const deletePerson = async (id) => {
        await api.delete(`/api/people/${id}`)
        setPeople(people.filter((p) => p.id !== id))
        setConnections(connections.filter((c) => c.personAId !== id && c.personBId !== id))
        if (selectedId === id) setSelectedId(null)
    }

    const handleCreatePerson = async (e) => {
        e.preventDefault()
        const payload = { ...personForm, birthday: personForm.birthday || null }
        const res = await api.post('/api/people', payload)
        setPeople([...people, res.data])
        setPersonForm({ name: '', birthday: '', category: '', notes: '', photoUrl: '' })
        setShowPersonForm(false)
    }

    const handleCreateConnection = async (e) => {
        e.preventDefault()
        if (!connForm.personAId || !connForm.personBId || connForm.personAId === connForm.personBId) return
        const payload = {
            personAId: Number(connForm.personAId),
            personBId: Number(connForm.personBId),
            label: connForm.label,
        }
        const res = await api.post('/api/people/connections', payload)
        setConnections([...connections, res.data])
        setConnForm({ personAId: '', personBId: '', label: '' })
        setShowConnForm(false)
    }

    const deleteConnection = async (id) => {
        await api.delete(`/api/people/connections/${id}`)
        setConnections(connections.filter((c) => c.id !== id))
    }

    return (
        <div className="cp-page">
            <h1 className="cp-heading">{t('usefulTitle')}</h1>
            <p className="cp-sub">{t('usefulSub')}</p>

            <div className="cp-panel">
                <h2 className="cp-panel-title">{t('usefulBirthdays')}</h2>
                {upcoming.length === 0 && <p className="cp-detail-empty">{t('usefulBirthdaysEmpty')}</p>}
                <div className="cp-birthday-list">
                    {upcoming.map((p) => (
                        <span key={p.id} className={`cp-birthday-chip${p.daysUntil <= 14 ? ' soon' : ''}`}>
                            {p.name} — {p.daysUntil === 0 ? 'today' : `${p.daysUntil}d`}
                        </span>
                    ))}
                </div>
            </div>

            <div className="cp-layout">
                <div>
                    <div className="cp-panel">
                        <h2 className="cp-panel-title">{t('usefulGraph')}</h2>
                        <RelationshipGraph
                            people={people}
                            connections={connections}
                            onNodeClick={handleNodeClick}
                            selectedId={selectedId}
                        />
                    </div>

                    <div className="cp-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <button className="cp-btn" onClick={() => setShowPersonForm((v) => !v)}>{t('usefulAddPerson')}</button>
                            <button className="cp-btn cp-btn-magenta" onClick={() => setShowConnForm((v) => !v)}>{t('usefulAddConnection')}</button>
                        </div>

                        {showPersonForm && (
                            <form onSubmit={handleCreatePerson} className="cp-form" style={{ marginTop: '1rem' }}>
                                <div className="cp-row">
                                    <div>
                                        <label className="cp-label">{t('usefulPersonName')}</label>
                                        <input className="cp-input" value={personForm.name} onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="cp-label">{t('usefulPersonBirthday')}</label>
                                        <input type="date" className="cp-input" value={personForm.birthday} onChange={(e) => setPersonForm({ ...personForm, birthday: e.target.value })} />
                                    </div>
                                </div>
                                <div className="cp-row">
                                    <div>
                                        <label className="cp-label">{t('usefulPersonCategory')}</label>
                                        <input className="cp-input" value={personForm.category} onChange={(e) => setPersonForm({ ...personForm, category: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="cp-label">{t('usefulPersonPhoto')}</label>
                                        <input className="cp-input" value={personForm.photoUrl} onChange={(e) => setPersonForm({ ...personForm, photoUrl: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="cp-label">{t('usefulPersonNotes')}</label>
                                    <textarea className="cp-textarea" rows={2} value={personForm.notes} onChange={(e) => setPersonForm({ ...personForm, notes: e.target.value })} />
                                </div>
                                <button type="submit" className="cp-btn">{t('save')}</button>
                            </form>
                        )}

                        {showConnForm && (
                            <form onSubmit={handleCreateConnection} className="cp-form" style={{ marginTop: '1rem' }}>
                                <div className="cp-row">
                                    <div>
                                        <label className="cp-label">{t('usefulConnFrom')}</label>
                                        <select className="cp-select" value={connForm.personAId} onChange={(e) => setConnForm({ ...connForm, personAId: e.target.value })} required>
                                            <option value="">—</option>
                                            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="cp-label">{t('usefulConnTo')}</label>
                                        <select className="cp-select" value={connForm.personBId} onChange={(e) => setConnForm({ ...connForm, personBId: e.target.value })} required>
                                            <option value="">—</option>
                                            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="cp-label">{t('usefulConnLabel')}</label>
                                    <input className="cp-input" value={connForm.label} onChange={(e) => setConnForm({ ...connForm, label: e.target.value })} required />
                                </div>
                                <button type="submit" className="cp-btn cp-btn-magenta">{t('save')}</button>
                            </form>
                        )}

                        <h2 className="cp-panel-title" style={{ marginTop: '1.5rem' }}>{t('usefulPeopleList')}</h2>
                        <div className="cp-people-list">
                            {people.map((p) => (
                                <div key={p.id} className="cp-people-item">
                                    <span onClick={() => handleNodeClick(p)} style={{ cursor: 'pointer' }}>{p.name}</span>
                                    <button className="cp-btn-danger" onClick={() => deletePerson(p.id)}>✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="cp-panel" style={{ alignSelf: 'flex-start' }}>
                    <h2 className="cp-panel-title">{selected ? selected.name : t('usefulDetailEmpty')}</h2>
                    {selected && !editing && (
                        <>
                            {selected.category && <div className="cp-tag">{selected.category}</div>}
                            {selected.birthday && <div className="cp-detail-row"><strong>{t('usefulPersonBirthday')}:</strong> {selected.birthday}</div>}
                            {selected.photoUrl && <img src={selected.photoUrl} alt={selected.name} style={{ width: '100%', marginBottom: '0.75rem', border: '1px solid var(--cp-cyan)' }} />}
                            <div className="cp-detail-row">{selected.notes || t('usefulNoBio')}</div>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <button className="cp-btn" onClick={startEdit}>{t('usefulEdit')}</button>
                                <button className="cp-btn cp-btn-magenta" onClick={() => deletePerson(selected.id)}>{t('usefulDelete')}</button>
                            </div>
                            <h3 className="cp-panel-title" style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>{t('usefulGraph')}</h3>
                            {connections.filter((c) => c.personAId === selected.id || c.personBId === selected.id).map((c) => {
                                const otherId = c.personAId === selected.id ? c.personBId : c.personAId
                                const other = people.find((p) => p.id === otherId)
                                return (
                                    <div key={c.id} className="cp-detail-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{c.label} — {other?.name || '?'}</span>
                                        <button className="cp-btn-danger" onClick={() => deleteConnection(c.id)}>✕</button>
                                    </div>
                                )
                            })}
                        </>
                    )}
                    {editing && editForm && (
                        <form onSubmit={saveEdit} className="cp-form">
                            <div>
                                <label className="cp-label">{t('usefulPersonName')}</label>
                                <input className="cp-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="cp-label">{t('usefulPersonBirthday')}</label>
                                <input type="date" className="cp-input" value={editForm.birthday} onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })} />
                            </div>
                            <div>
                                <label className="cp-label">{t('usefulPersonCategory')}</label>
                                <input className="cp-input" value={editForm.category || ''} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
                            </div>
                            <div>
                                <label className="cp-label">{t('usefulPersonPhoto')}</label>
                                <input className="cp-input" value={editForm.photoUrl || ''} onChange={(e) => setEditForm({ ...editForm, photoUrl: e.target.value })} />
                            </div>
                            <div>
                                <label className="cp-label">{t('usefulPersonNotes')}</label>
                                <textarea className="cp-textarea" rows={3} value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="cp-btn">{t('usefulSave')}</button>
                                <button type="button" className="cp-btn cp-btn-magenta" onClick={() => setEditing(false)}>✕</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
