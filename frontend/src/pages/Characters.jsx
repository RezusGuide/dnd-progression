import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const CLASSES = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Monk', 'Paladin', 'Bard', 'Druid', 'Sorcerer', 'Warlock', 'Barbarian']
const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc', 'Half-Elf', 'Tiefling', 'Dragonborn']

export default function Characters() {
    const { user, logout } = useAuth()
    const [characters, setCharacters] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', characterClass: '', race: '', backstory: '' })
    const [error, setError] = useState('')

    useEffect(() => {
        fetchCharacters()
    }, [])

    const fetchCharacters = async () => {
        try {
            const res = await api.get('/api/characters')
            setCharacters(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        setError('')
        try {
            await api.post('/api/characters', form)
            setForm({ name: '', characterClass: '', race: '', backstory: '' })
            setShowForm(false)
            fetchCharacters()
        } catch (err) {
            setError('Failed to create character')
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Erase this soul from the annals?')) return
        try {
            await api.delete(`/api/characters/${id}`)
            fetchCharacters()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="parchment-page">
            <div className="tome-header">
                <h1 className="tome-title">The Adventurer's Vault</h1>
                <div className="tome-header-right">
                    <span className="tome-username">{user?.username}</span>
                    <button className="tome-btn-ghost" onClick={logout}>Leave</button>
                </div>
            </div>

            <div className="characters-grid">
                {characters.map((char) => (
                    <div key={char.id} className="character-card">
                        <div className="character-card-top">
                            <h2 className="character-name">{char.name}</h2>
                            <button className="tome-btn-danger" onClick={() => handleDelete(char.id)}>✕</button>
                        </div>
                        <div className="character-meta">
                            <span className="meta-tag">{char.characterClass || '—'}</span>
                            <span className="meta-tag">{char.race || '—'}</span>
                            <span className="meta-tag level-tag">Level {char.level}</span>
                        </div>
                        {char.backstory && (
                            <p className="character-backstory">{char.backstory}</p>
                        )}
                    </div>
                ))}

                <div className="character-card new-card" onClick={() => setShowForm(true)}>
                    <span className="new-card-icon">✦</span>
                    <span className="new-card-label">Forge New Character</span>
                </div>
            </div>

            {showForm && (
                <div className="tome-overlay">
                    <div className="tome-modal">
                        <h2 className="tome-title">Forge a Legend</h2>
                        {error && <div className="tome-error">{error}</div>}
                        <form onSubmit={handleCreate} className="tome-form">
                            <div className="tome-field">
                                <label>Character Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Name your hero"
                                    required
                                />
                            </div>
                            <div className="tome-row">
                                <div className="tome-field">
                                    <label>Class</label>
                                    <select
                                        value={form.characterClass}
                                        onChange={(e) => setForm({ ...form, characterClass: e.target.value })}
                                    >
                                        <option value="">— Choose —</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="tome-field">
                                    <label>Race</label>
                                    <select
                                        value={form.race}
                                        onChange={(e) => setForm({ ...form, race: e.target.value })}
                                    >
                                        <option value="">— Choose —</option>
                                        {RACES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="tome-field">
                                <label>Backstory</label>
                                <textarea
                                    value={form.backstory}
                                    onChange={(e) => setForm({ ...form, backstory: e.target.value })}
                                    placeholder="Who were you before the adventure began..."
                                    rows={3}
                                />
                            </div>
                            <div className="tome-btn-row">
                                <button type="button" className="tome-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="tome-btn">Seal in Blood</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}