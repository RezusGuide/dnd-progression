import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const { login } = useAuth()
    const { t } = useLang()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        try {
            const res = await api.post('/api/auth/login', { email, password })
            login({
                username: res.data.username,
                userId: res.data.userId,
                roles: res.data.roles,
                sections: res.data.sections,
            }, res.data.token)
            navigate('/')
        } catch (err) {
            setError(t('invalidCredentials'))
        }
    }

    return (
        <div className="parchment-page">
            <div className="tome-panel">
                <h1 className="tome-title">{t('enterRealm')}</h1>
                <p className="tome-subtitle">{t('signInVault')}</p>

                {error && <div className="tome-error">{error}</div>}

                <form onSubmit={handleSubmit} className="tome-form">
                    <div className="tome-field">
                        <label>{t('email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <div className="tome-field">
                        <label>{t('password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button type="submit" className="tome-btn">{t('beginJourney')}</button>
                </form>
            </div>
        </div>
    )
}