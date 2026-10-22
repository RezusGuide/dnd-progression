import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { classifyApiError } from '../api/apiErrors'
import { ERROR_COPY } from '../components/errors/errorCopy'
import Logo from '../components/brand/Logo'
import { Button, Dossier, Field, SteamBackground } from '../components/ui'

// Проходная: sign-in plus the recovery-code reset. No email is ever sent
// by this app; the recovery code is one the user generated for themselves
// while signed in (see Account.jsx) and wrote down ahead of time.
export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    // Where ProtectedRoute bounced the visitor from, if anywhere.
    const from = location.state?.from?.pathname
        ? `${location.state.from.pathname}${location.state.from.search || ''}`
        : '/'

    const [mode, setMode] = useState('login') // 'login' | 'reset'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const [resetForm, setResetForm] = useState({ email: '', recoveryCode: '', newPassword: '' })
    const [resetError, setResetError] = useState('')
    const [resetDone, setResetDone] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setBusy(true)
        try {
            const res = await api.post('/api/auth/login', { email, password })
            login({
                username: res.data.username,
                userId: res.data.userId,
                roles: res.data.roles,
                sections: res.data.sections,
            }, res.data.token)
            navigate(from, { replace: true })
        } catch (err) {
            // Server down / no connection is not a wrong password.
            const kind = classifyApiError(err)
            setError(kind ? `${ERROR_COPY[kind].title}. ${ERROR_COPY[kind].text}` : 'Пропуск не опознан. Проверьте почту и пароль.')
        } finally {
            setBusy(false)
        }
    }

    const handleReset = async (e) => {
        e.preventDefault()
        setResetError('')
        try {
            await api.post('/api/auth/reset-password', resetForm)
            setResetDone(true)
        } catch {
            setResetError('Почта или код не подходят.')
        }
    }

    const backToLogin = () => { setMode('login'); setResetDone(false); setResetError('') }

    return (
        <main className="gate-page">
            <SteamBackground />
            <div className="gate-content">
                <Logo variant="full" size={72} className="gate-logo" />

                {mode === 'login' ? (
                    <Dossier tab="Пропуск" className="gate-card">
                        <h1 className="gate-title">Проходная Санни</h1>
                        <p className="gate-subtitle">Предъявите пропуск, чтобы пройти в контору.</p>
                        <form onSubmit={handleSubmit} className="gate-form" noValidate={false}>
                            <Field label="Почта" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            <Field label="Пароль" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} required />
                            <Button type="submit" disabled={busy}>Пройти</Button>
                        </form>
                        <p className="gate-note">Пропуска выдаёт ГМ. Нет пропуска — напишите ему.</p>
                        <button type="button" className="gate-link" onClick={() => setMode('reset')}>Потеряли пропуск?</button>
                    </Dossier>
                ) : (
                    <Dossier tab="Пропуск" className="gate-card">
                        <h1 className="gate-title">Восстановление пропуска</h1>
                        <p className="gate-subtitle">
                            Писем мы не рассылаем. Введите почту и код восстановления, который вы сохранили в разделе «Мой пропуск». Кода нет — попросите ГМа задать новый пароль.
                        </p>
                        {resetDone ? (
                            <>
                                <p className="gate-success" role="status">Пропуск восстановлен. Можно проходить.</p>
                                <Button onClick={backToLogin}>Пройти</Button>
                            </>
                        ) : (
                            <form onSubmit={handleReset} className="gate-form">
                                <Field label="Почта" type="email" autoComplete="username" value={resetForm.email} onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })} required />
                                <Field label="Код восстановления" className="gate-code" value={resetForm.recoveryCode} onChange={(e) => setResetForm({ ...resetForm, recoveryCode: e.target.value })} placeholder="XXXX-XXXX-XXXX-XXXX" required />
                                <Field label="Новый пароль" type="password" autoComplete="new-password" value={resetForm.newPassword} onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })} error={resetError} required />
                                <Button type="submit">Восстановить</Button>
                            </form>
                        )}
                        <button type="button" className="gate-link" onClick={backToLogin}>← Назад на проходную</button>
                    </Dossier>
                )}

                <Link to="/" className="gate-home">← Назад в приёмную</Link>
            </div>
        </main>
    )
}
