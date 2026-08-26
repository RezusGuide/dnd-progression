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

    // 'login' | 'reset' - the recovery-code reset form, toggled from a
    // "Forgot password?" link. No email is ever sent by this app; the
    // recovery code is one the user generated for themselves while logged
    // in (see Account.jsx) and wrote down ahead of time.
    const [mode, setMode] = useState('login')
    const [resetForm, setResetForm] = useState({ email: '', recoveryCode: '', newPassword: '' })
    const [resetError, setResetError] = useState('')
    const [resetDone, setResetDone] = useState(false)

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

    const handleReset = async (e) => {
        e.preventDefault()
        setResetError('')
        try {
            await api.post('/api/auth/reset-password', resetForm)
            setResetDone(true)
        } catch (err) {
            setResetError(err.response?.data?.message || t('resetPasswordFailed'))
        }
    }

    if (mode === 'reset') {
        return (
            <div className="parchment-page">
                <div className="tome-panel">
                    <h1 className="tome-title">{t('resetPasswordTitle')}</h1>
                    <p className="tome-subtitle">{t('resetPasswordHint')}</p>

                    {resetError && <div className="tome-error">{resetError}</div>}

                    {resetDone ? (
                        <>
                            <div className="tome-notice">{t('resetPasswordDone')}</div>
                            <button className="tome-btn" style={{ marginTop: '1rem' }} onClick={() => { setMode('login'); setResetDone(false) }}>
                                {t('enterRealm')}
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleReset} className="tome-form">
                            <div className="tome-field">
                                <label>{t('email')}</label>
                                <input type="email" value={resetForm.email} onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })} required />
                            </div>
                            <div className="tome-field">
                                <label>{t('resetPasswordCode')}</label>
                                <input value={resetForm.recoveryCode} onChange={(e) => setResetForm({ ...resetForm, recoveryCode: e.target.value })} placeholder="XXXX-XXXX-XXXX-XXXX" required />
                            </div>
                            <div className="tome-field">
                                <label>{t('resetPasswordNew')}</label>
                                <input type="password" value={resetForm.newPassword} onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })} required />
                            </div>
                            <button type="submit" className="tome-btn">{t('resetPasswordSubmit')}</button>
                        </form>
                    )}

                    <button type="button" className="tome-btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setMode('login')}>
                        {t('backToLogin')}
                    </button>
                </div>
            </div>
        )
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

                <button type="button" className="tome-btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setMode('reset')}>
                    {t('forgotPassword')}
                </button>
            </div>
        </div>
    )
}
