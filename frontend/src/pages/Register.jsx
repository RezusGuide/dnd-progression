import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Register() {
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        try {
            const res = await api.post('/api/auth/register', { username, email, password })
            login({ username: res.data.username, userId: res.data.userId }, res.data.token)
            navigate('/characters')
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed')
        }
    }

    return (
        <div className="parchment-page">
            <div className="tome-panel">
                <h1 className="tome-title">Inscribe Your Name</h1>
                <p className="tome-subtitle">Begin your legend</p>

                {error && <div className="tome-error">{error}</div>}

                <form onSubmit={handleSubmit} className="tome-form">
                    <div className="tome-field">
                        <label>Adventurer Name</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Your name in the annals"
                            required
                        />
                    </div>
                    <div className="tome-field">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <div className="tome-field">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button type="submit" className="tome-btn">Seal the Pact</button>
                </form>

                <p className="tome-link">
                    Already bound? <Link to="/login">Return to the gate</Link>
                </p>
            </div>
        </div>
    )
}