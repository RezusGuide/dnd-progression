import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useLocation, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import ErrorScreen from '../components/errors/ErrorScreen'
import { Button, Dossier, Loader, PageHeader } from '../components/ui'
import AdminChest from './admin/AdminChest'
import AdminDreams from './admin/AdminDreams'
import AdminGrants from './admin/AdminGrants'
import AdminOptions from './admin/AdminOptions'
import AdminRequests from './admin/AdminRequests'
import AdminResearch from './admin/AdminResearch'
import AdminWorld from './admin/AdminWorld'
import '../styles/sheet.css'

export default function Admin() {
    const { user, hasSection, login } = useAuth()
    const { t } = useLang()
    const isOwner = hasSection('*')
    const [searchParams] = useSearchParams()
    const isSetup = searchParams.get('setup') === '1'
    // null while unknown; the claim panel only exists while no GM is set.
    const [ownerExists, setOwnerExists] = useState(null)
    useEffect(() => {
        if (!isSetup || isOwner) return
        api.get('/api/auth/setup-status')
            .then((res) => setOwnerExists(res.data.ownerExists))
            .catch(() => setOwnerExists(true))
    }, [isSetup, isOwner])

    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [roles, setRoles] = useState([])
    const [users, setUsers] = useState([])
    const [roleForm, setRoleForm] = useState({ key: '', label: '', sections: '' })
    const [grantChoice, setGrantChoice] = useState({})
    const [accountForm, setAccountForm] = useState({ username: '', email: '', password: '' })
    const [passwordChoice, setPasswordChoice] = useState({})
    const [showAdvancedRoles, setShowAdvancedRoles] = useState(false)

    // /admin#world, /admin#dreams: links from «Мир» and «Сны» land on their
    // section once it has rendered.
    const { hash } = useLocation()
    useEffect(() => {
        if (!hash || !isOwner) return
        let tries = 0
        const timer = setInterval(() => {
            const el = document.getElementById(hash.slice(1))
            if (el || ++tries > 20) {
                clearInterval(timer)
                el?.scrollIntoView({ block: 'start' })
            }
        }, 100)
        return () => clearInterval(timer)
    }, [hash, isOwner])

    const refresh = () => {
        api.get('/api/admin/roles').then((res) => setRoles(res.data)).catch(() => {})
        api.get('/api/admin/users').then((res) => setUsers(res.data)).catch(() => {})
    }

    useEffect(() => {
        if (isOwner) refresh()
    }, [isOwner])

    const handleClaim = async () => {
        setError('')
        try {
            await api.post('/api/admin/bootstrap-owner')
            const me = await api.get('/api/auth/me')
            login({
                username: me.data.username,
                userId: me.data.userId,
                roles: me.data.roles,
                sections: me.data.sections,
            }, me.data.token)
        } catch (err) {
            setError(err.response?.data?.message || 'Допуск отклонён. Обратитесь в приёмную.')
        }
    }

    const handleCreateRole = async (e) => {
        e.preventDefault()
        setError('')
        try {
            const sections = roleForm.sections.split(',').map((s) => s.trim()).filter(Boolean)
            await api.post('/api/admin/roles', { ...roleForm, sections })
            setRoleForm({ key: '', label: '', sections: '' })
            refresh()
        } catch (err) {
            setError(err.response?.data?.message || 'Допуск отклонён. Обратитесь в приёмную.')
        }
    }

    const handleGrant = async (userId) => {
        const roleKey = grantChoice[userId]
        if (!roleKey) return
        await api.post(`/api/admin/users/${userId}/roles/${roleKey}`)
        refresh()
    }

    const handleRevoke = async (userId, roleKey) => {
        await api.delete(`/api/admin/users/${userId}/roles/${roleKey}`)
        refresh()
    }

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

    // Not the GM: "access denied". The one exception is first-time setup -
    // /admin?setup=1 still shows the claim-ownership panel, since the
    // backend only honours bootstrap-owner while nobody holds OWNER yet.
    if (!isOwner && isSetup && ownerExists === null) {
        return <div className="parchment-page"><Loader /></div>
    }

    if (!isOwner && (!isSetup || ownerExists)) {
        return <ErrorScreen code={403} />
    }

    if (!isOwner) {
        return (
            <div className="parchment-page">
                <PageHeader title="Первичная настройка" />
                <Dossier tab="Панель ГМ" style={{ maxWidth: 480, width: '100%' }}>
                    <p style={{ marginBottom: '1rem' }}>{t('adminBecomeOwnerHint')}</p>
                    {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                    {user && <Button onClick={handleClaim}>{t('adminBecomeOwner')}</Button>}
                </Dossier>
            </div>
        )
    }

    return (
        <div className="parchment-page">
            <PageHeader title="Панель ГМ" subtitle={t('adminSubtitle')} />
            {error && <div className="tome-error">{error}</div>}
            {notice && <div className="tome-notice">{notice}</div>}

            <AdminRequests />

            <AdminResearch />

            <AdminGrants />

            <AdminChest />

            <AdminDreams />

            <AdminWorld />

            <AdminOptions />

            <section className="sheet-section admin-section">
                <h2 className="sheet-column-title" style={{ background: 'transparent', color: 'var(--text)', padding: 0, border: 0, marginBottom: '1rem' }}>
                    {t('adminAccounts')}
                </h2>
                <p className="tome-subtitle" style={{ marginBottom: '1rem' }}>{t('adminAccountsHint')}</p>
                <form onSubmit={handleCreateAccount} className="tome-form codex-form">
                    <h3 className="tome-field-label">{t('adminNewAccount')}</h3>
                    <div className="tome-row">
                        <div className="tome-field">
                            <label>{t('adminAccUsername')}</label>
                            <input value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} required />
                        </div>
                        <div className="tome-field">
                            <label>{t('adminAccEmail')}</label>
                            <input type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} required />
                        </div>
                        <div className="tome-field">
                            <label>{t('adminAccPassword')}</label>
                            <input type="text" value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} required />
                        </div>
                    </div>
                    <div className="tome-btn-row">
                        <button type="submit" className="tome-btn">{t('adminCreateAccount')}</button>
                    </div>
                </form>
            </section>

            <section className="sheet-section admin-section">
                <h2 className="sheet-column-title" style={{ background: 'transparent', color: 'var(--text)', padding: 0, border: 0, marginBottom: '1rem' }}>
                    {t('adminUsers')}
                </h2>
                <div className="admin-users-list">
                    {users.map((u) => (
                        <div key={u.id} className="campaign-card admin-user-row">
                            <div className="campaign-card-left">
                                <span className="campaign-name">{u.username}</span>
                                <span className="campaign-desc">{u.email}</span>
                                <div className="character-meta">
                                    {u.roles.map((r) => (
                                        <span key={r.id} className="meta-tag">
                                            {r.key}
                                            {r.key !== 'MEMBER' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRevoke(u.id, r.key)}
                                                    style={{ marginLeft: '0.4rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                                >✕</button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="tome-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    placeholder={t('adminNewPassword')}
                                    value={passwordChoice[u.id] || ''}
                                    onChange={(e) => setPasswordChoice({ ...passwordChoice, [u.id]: e.target.value })}
                                />
                                <button className="tome-btn-ghost" onClick={() => handleResetPassword(u.id)}>{t('adminResetPasswordBtn')}</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="sheet-section admin-section">
                <h2
                    className="sheet-column-title"
                    style={{ background: 'transparent', color: 'var(--text)', padding: 0, border: 0, marginBottom: '0.5rem', cursor: 'pointer' }}
                    onClick={() => setShowAdvancedRoles((v) => !v)}
                >
                    {showAdvancedRoles ? '▾' : '▸'} {t('adminRolesAdvanced')}
                </h2>
                {showAdvancedRoles && (
                    <>
                        <p className="tome-subtitle" style={{ marginBottom: '1rem' }}>{t('adminRolesAdvancedHint')}</p>
                        <div className="character-meta" style={{ marginBottom: '1rem' }}>
                            {roles.map((r) => (
                                <span key={r.id} className="meta-tag level-tag">{r.key} → {r.sections.join(', ')}</span>
                            ))}
                        </div>
                        <form onSubmit={handleCreateRole} className="tome-form codex-form">
                            <h3 className="tome-field-label">{t('adminNewRole')}</h3>
                            <div className="tome-row">
                                <div className="tome-field">
                                    <label>{t('adminRoleKey')}</label>
                                    <input value={roleForm.key} onChange={(e) => setRoleForm({ ...roleForm, key: e.target.value })} required />
                                </div>
                                <div className="tome-field">
                                    <label>{t('adminRoleLabel')}</label>
                                    <input value={roleForm.label} onChange={(e) => setRoleForm({ ...roleForm, label: e.target.value })} required />
                                </div>
                            </div>
                            <div className="tome-field">
                                <label>{t('adminRoleSections')}</label>
                                <input value={roleForm.sections} onChange={(e) => setRoleForm({ ...roleForm, sections: e.target.value })} required />
                            </div>
                            <div className="tome-btn-row">
                                <button type="submit" className="tome-btn">{t('adminCreateRole')}</button>
                            </div>
                            <div className="tome-row" style={{ marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {users.map((u) => (
                                    <div key={u.id} className="tome-row" style={{ alignItems: 'flex-end' }}>
                                        <select
                                            value={grantChoice[u.id] || ''}
                                            onChange={(e) => setGrantChoice({ ...grantChoice, [u.id]: e.target.value })}
                                        >
                                            <option value="">{u.username}</option>
                                            {roles.map((r) => <option key={r.id} value={r.key}>{r.key}</option>)}
                                        </select>
                                        <button type="button" className="tome-btn-ghost" onClick={() => handleGrant(u.id)}>{t('adminAssign')}</button>
                                    </div>
                                ))}
                            </div>
                        </form>
                    </>
                )}
            </section>
        </div>
    )
}
