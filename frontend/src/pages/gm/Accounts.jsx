import { useCallback, useEffect, useState } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'

// «Пропуска»: the GM hands out accounts and resets passwords. Two roles
// only - the GM and staff; there is nothing else to grant.
export default function Accounts() {
    const { t } = useLang()
    const [users, setUsers] = useState([])
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [accountForm, setAccountForm] = useState({ username: '', email: '', password: '' })
    const [passwordChoice, setPasswordChoice] = useState({})

    const refresh = useCallback(() => {
        api.get('/api/admin/users').then((res) => setUsers(res.data)).catch(() => {})
    }, [])
    useEffect(() => { refresh() }, [refresh])

    const handleCreateAccount = async (e) => {
        e.preventDefault()
        setError('')
        setNotice('')
        try {
            await api.post('/api/admin/users', accountForm)
            setAccountForm({ username: '', email: '', password: '' })
            setNotice(t('adminAccountCreated'))
            refresh()
        } catch (err) {
            setError(err.response?.data?.message || 'Допуск отклонён. Обратитесь в приёмную.')
        }
    }

    const handleResetPassword = async (userId) => {
        const password = passwordChoice[userId]
        if (!password) return
        setError('')
        setNotice('')
        try {
            await api.put(`/api/admin/users/${userId}/password`, { password })
            setPasswordChoice({ ...passwordChoice, [userId]: '' })
            setNotice(t('adminPasswordReset'))
        } catch (err) {
            setError(err.response?.data?.message || 'Допуск отклонён. Обратитесь в приёмную.')
        }
    }

    return (
        <section className="sheet-section admin-section">
            <h2 className="sheet-section-title" style={{ marginBottom: '0.5rem' }}>{t('adminAccounts')}</h2>
            <p className="tome-subtitle" style={{ marginBottom: '1rem' }}>{t('adminAccountsHint')}</p>
            {error && <div className="tome-error" role="alert">{error}</div>}
            {notice && <div className="tome-notice" role="status">{notice}</div>}
            <form onSubmit={handleCreateAccount} className="tome-form codex-form">
                <h3 className="tome-field-label">{t('adminNewAccount')}</h3>
                <div className="tome-row">
                    <div className="tome-field">
                        <label htmlFor="acc-name">{t('adminAccUsername')}</label>
                        <input id="acc-name" value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} required />
                    </div>
                    <div className="tome-field">
                        <label htmlFor="acc-email">{t('adminAccEmail')}</label>
                        <input id="acc-email" type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} required />
                    </div>
                    <div className="tome-field">
                        <label htmlFor="acc-password">{t('adminAccPassword')}</label>
                        <input id="acc-password" type="text" autoComplete="off" value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} required />
                    </div>
                </div>
                <div className="tome-btn-row">
                    <button type="submit" className="tome-btn">{t('adminCreateAccount')}</button>
                </div>
            </form>

            <h3 className="reception-section-title" style={{ margin: '1.5rem 0 0.75rem' }}>{t('adminUsers')}</h3>
            <div className="admin-users-list">
                {users.map((u) => (
                    <div key={u.id} className="campaign-card admin-user-row">
                        <div className="campaign-card-left">
                            <span className="campaign-name">{u.username}</span>
                            <span className="campaign-desc">{u.email}</span>
                            <div className="character-meta">
                                <span className={`meta-tag ${u.gm ? 'level-tag' : ''}`}>{u.gm ? 'ГМ' : 'Сотрудник'}</span>
                            </div>
                        </div>
                        <div className="tome-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <input type="text" autoComplete="off" aria-label={`${t('adminNewPassword')}: ${u.username}`} placeholder={t('adminNewPassword')}
                                value={passwordChoice[u.id] || ''}
                                onChange={(e) => setPasswordChoice({ ...passwordChoice, [u.id]: e.target.value })} />
                            <button type="button" className="tome-btn-ghost" onClick={() => handleResetPassword(u.id)}>{t('adminResetPasswordBtn')}</button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
