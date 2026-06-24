import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        try {
            const res = await api.post('/api/auth/login', { email, password })
            login({ username: res.data.username, userId: res.data.userId }, res.data.token)
            navigate('/characters')
        } catch (err) {
            setError('Invalid email or password')
        }
    }

    return (
        <div className="parchment-page">
            <div className="tome-panel">
                <h1 className="tome-title">Enter the Realm</h1>
                <p className="tome-subtitle">Sign in to your adventurer's vault</p>

                {error && <div className="tome-error">{error}</div>}

                <form onSubmit={handleSubmit} className="tome-form">
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
                    <button type="submit" className="tome-btn">Begin Journey</button>
                </form>

                <p className="tome-link">
                    No account yet? <Link to="/register">Register your name</Link>
                </p>
            </div>
        </div>
    )
}