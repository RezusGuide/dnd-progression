import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import LangToggle from '../components/LangToggle'
import api from '../api/axios'

export default function Register() {
    const [username, setUsername] = useState('')
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
            const res = await api.post('/api/auth/register', { username, email, password })
            login({ username: res.data.username, userId: res.data.userId }, res.data.token)
            navigate('/characters')
        } catch (err) {
            setError(err.response?.data?.message || t('registrationFailed'))
        }
    }

    return (
        <div className="parchment-page">
            <LangToggle />
            <div className="tome-panel">
                <h1 className="tome-title">{t('inscribeName')}</h1>
                <p className="tome-subtitle">{t('beginLegend')}</p>

                {error && <div className="tome-error">{error}</div>}

                <form onSubmit={handleSubmit} className="tome-form">
                    <div className="tome-field">
                        <label>{t('adventurerName')}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t('nameInAnnals')}
                            required
                        />
                    </div>
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
                    <button type="submit" className="tome-btn">{t('sealPact')}</button>
                </form>

                <p className="tome-link">
                    {t('alreadyBound')} <Link to="/login">{t('returnGate')}</Link>
                </p>
            </div>
        </div>
    )
}