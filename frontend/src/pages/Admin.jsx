import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { ASPECTS } from '../constants/aspects'
import api from '../api/axios'

export default function Admin() {
    const { user, hasSection, login } = useAuth()
    const { t } = useLang()
    const isOwner = hasSection('*')

    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [roles, setRoles] = useState([])
    const [users, setUsers] = useState([])
    const [roleForm, setRoleForm] = useState({ key: '', label: '', sections: '' })
    const [grantChoice, setGrantChoice] = useState({})
    const [accountForm, setAccountForm] = useState({ username: '', email: '', password: '' })
    const [passwordChoice, setPasswordChoice] = useState({})
    const [showAdvancedRoles, setShowAdvancedRoles] = useState(false)

    // DM-only grants: items (equipment), aspects, and hint access - kept
    // as three separate forms/endpoints so each is a distinct, deliberate
    // action rather than one grant type doubling as another.
    const [characters, setCharacters] = useState([])
    const [spells, setSpells] = useState([])
    const [itemGrantForm, setItemGrantForm] = useState({ characterId: '', item: '' })
    const [materialGrantForm, setMaterialGrantForm] = useState({ characterId: '', material: '' })
    const [aspectGrantForm, setAspectGrantForm] = useState({ characterId: '', aspect: ASPECTS[0].key, amount: 1 })
    const [hintGrantForm, setHintGrantForm] = useState({ characterId: '', spellId: '' })

    const refresh = () => {
        api.get('/api/admin/roles').then((res) => setRoles(res.data)).catch(() => {})
        api.get('/api/admin/users').then((res) => setUsers(res.data)).catch(() => {})
        api.get('/api/characters').then((res) => setCharacters(res.data)).catch(() => {})
        api.get('/api/spells').then((res) => setSpells(res.data.filter((s) => s.level >= 1 && s.level <= 2))).catch(() => {})
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
            setError(err.response?.data?.message || 'Could not claim ownership')
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
            setError(err.response?.data?.message || 'Could not create role')
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
            setError(err.response?.data?.message || 'Could not create account')
        }
    }

    const handleGrantItem = async (e) => {
        e.preventDefault()
        setError('')
        setNotice('')
        if (!itemGrantForm.characterId || !itemGrantForm.item.trim()) return
        try {
            await api.post('/api/admin/items/grant', {
                characterId: Number(itemGrantForm.characterId),
                item: itemGrantForm.item.trim(),
            })
            setItemGrantForm({ ...itemGrantForm, item: '' })
            setNotice(t('adminGranted'))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not add item')
        }
    }

    const handleGrantMaterial = async (e) => {
        e.preventDefault()
        setError('')
        setNotice('')
        if (!materialGrantForm.characterId || !materialGrantForm.material.trim()) return
        try {
            await api.post('/api/admin/materials/grant', {
                characterId: Number(materialGrantForm.characterId),
                material: materialGrantForm.material.trim(),
            })
            setMaterialGrantForm({ ...materialGrantForm, material: '' })
            setNotice(t('adminGranted'))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not add material')
        }
    }

    const handleGrantAspect = async (e) => {
        e.preventDefault()
        setError('')
        setNotice('')
        if (!aspectGrantForm.characterId) return
        try {
            await api.post('/api/admin/aspects/grant', {
                characterId: Number(aspectGrantForm.characterId),
                aspect: aspectGrantForm.aspect,
                amount: Number(aspectGrantForm.amount),
            })
            setNotice(t('adminGranted'))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not grant aspects')
        }
    }

    const handleGrantHint = async (e) => {
        e.preventDefault()
        setError('')
        setNotice('')
        if (!hintGrantForm.characterId || !hintGrantForm.spellId) return
        try {
            await api.post('/api/admin/hints/grant', {
                characterId: Number(hintGrantForm.characterId),
                spellId: hintGrantForm.spellId,
            })
            setNotice(t('adminGranted'))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not grant hint access')
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
            setError(err.response?.data?.message || 'Could not reset password')
        }
    }

    if (!isOwner) {
        return (
            <div className="parchment-page">
                <div className="tome-panel">
                    <h1 className="tome-title">{t('adminTitle')}</h1>
                    <p className="tome-subtitle">{t('adminBecomeOwnerHint')}</p>
                    {error && <div className="tome-error">{error}</div>}
                    {user && <button className="tome-btn" onClick={handleClaim}>{t('adminBecomeOwner')}</button>}
                </div>
            </div>
        )
    }

    return (
        <div className="parchment-page">
            <h1 className="tome-title">{t('adminTitle')}</h1>
            <p className="tome-subtitle" style={{ marginBottom: '1.5rem' }}>{t('adminSubtitle')}</p>
            {error && <div className="tome-error">{error}</div>}
            {notice && <div className="tome-notice">{notice}</div>}

            <section className="sheet-section admin-section">
                <h2 className="sheet-column-title" style={{ background: 'transparent', color: 'var(--ink)', padding: 0, border: 0, marginBottom: '1rem' }}>
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
                <h2 className="sheet-column-title" style={{ background: 'transparent', color: 'var(--ink)', padding: 0, border: 0, marginBottom: '1rem' }}>
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
                                                    style={{ marginLeft: '0.4rem', background: 'none', border: 'none', color: 'var(--crimson)', cursor: 'pointer' }}
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
                <h2 className="sheet-column-title" style={{ background: 'transparent', color: 'var(--ink)', padding: 0, border: 0, marginBottom: '1rem' }}>
                    {t('adminItemGrant')}
                </h2>
                <p className="tome-subtitle" style={{ marginBottom: '1rem' }}>{t('adminItemGrantHint')}</p>
                <form onSubmit={handleGrantItem} className="tome-form codex-form">
                    <div className="tome-row">
                        <div className="tome-field">
                            <label>{t('adminSelectCharacter')}</label>
                            <select
                                value={itemGrantForm.characterId}
                                onChange={(e) => setItemGrantForm({ ...itemGrantForm, characterId: e.target.value })}
                                required
                            >
                                <option value="">{t('choose')}</option>
                                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="tome-field" style={{ flex: 2 }}>
                            <label>{t('adminItemLabel')}</label>
                            <input
                                type="text"
                                value={itemGrantForm.item}
                                onChange={(e) => setItemGrantForm({ ...itemGrantForm, item: e.target.value })}
                                placeholder={t('adminItemPlaceholder')}
                                required
                            />
                        </div>
                    </div>
                    <div className="tome-btn-row">
                        <button type="submit" className="tome-btn">{t('adminItemGrantBtn')}</button>
                    </div>
                </form>
            </section>

            <section className="sheet-section admin-section">
                <h2 className="sheet-column-title" style={{ background: 'transparent', color: 'var(--ink)', padding: 0, border: 0, marginBottom: '1rem' }}>
                    {t('adminMaterialGrant')}
                </h2>
                <p className="tome-subtitle" style={{ marginBottom: '1rem' }}>{t('adminMaterialGrantHint')}</p>
                <form onSubmit={handleGrantMaterial} className="tome-form codex-form">
                    <div className="tome-row">
                        <div className="tome-field">
                            <label>{t('adminSelectCharacter')}</label>
                            <select
                                value={materialGrantForm.characterId}
                                onChange={(e) => setMaterialGrantForm({ ...materialGrantForm, characterId: e.target.value })}
                                required
                            >
                                <option value="">{t('choose')}</option>
                                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="tome-field" style={{ flex: 2 }}>
                            <label>{t('adminMaterialLabel')}</label>
                            <input
                                type="text"
                                value={materialGrantForm.material}
                                onChange={(e) => setMaterialGrantForm({ ...materialGrantForm, material: e.target.value })}
                                placeholder={t('adminMaterialPlaceholder')}
                                required
                            />
                        </div>
                    </div>
                    <div className="tome-btn-row">
                        <button type="submit" className="tome-btn">{t('adminMaterialGrantBtn')}</button>
                    </div>
                </form>
            </section>

            <section className="sheet-section admin-section">
                <h2 className="sheet-column-title" style={{ background: 'transparent', color: 'var(--ink)', padding: 0, border: 0, marginBottom: '1rem' }}>
                    {t('adminAspectGrant')}
                </h2>
                <p className="tome-subtitle" style={{ marginBottom: '1rem' }}>{t('adminAspectGrantHint')}</p>
                <form onSubmit={handleGrantAspect} className="tome-form codex-form">
                    <div className="tome-row">
                        <div className="tome-field">
                            <label>{t('adminSelectCharacter')}</label>
                            <select
                                value={aspectGrantForm.characterId}
                                onChange={(e) => setAspectGrantForm({ ...aspectGrantForm, characterId: e.target.value })}
                                required
                            >
                                <option value="">{t('choose')}</option>
                                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="tome-field">
                            <label>{t('adminSelectAspect')}</label>
                            <select
                                value={aspectGrantForm.aspect}
                                onChange={(e) => setAspectGrantForm({ ...aspectGrantForm, aspect: e.target.value })}
                            >
                                {ASPECTS.map((a) => <option key={a.key} value={a.key}>{t(a.labelKey)}</option>)}
                            </select>
                        </div>
                        <div className="tome-field">
                            <label>{t('adminAmount')}</label>
                            <input
                                type="number" min="1" value={aspectGrantForm.amount}
                                onChange={(e) => setAspectGrantForm({ ...aspectGrantForm, amount: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="tome-btn-row">
                        <button type="submit" className="tome-btn">{t('adminGrantBtn')}</button>
                    </div>
                </form>
            </section>

            <section className="sheet-section admin-section">
                <h2 className="sheet-column-title" style={{ background: 'transparent', color: 'var(--ink)', padding: 0, border: 0, marginBottom: '1rem' }}>
                    {t('adminHintGrant')}
                </h2>
                <p className="tome-subtitle" style={{ marginBottom: '1rem' }}>{t('adminHintGrantHint')}</p>
                <form onSubmit={handleGrantHint} className="tome-form codex-form">
                    <div className="tome-row">
                        <div className="tome-field">
                            <label>{t('adminSelectCharacter')}</label>
                            <select
                                value={hintGrantForm.characterId}
                                onChange={(e) => setHintGrantForm({ ...hintGrantForm, characterId: e.target.value })}
                                required
                            >
                                <option value="">{t('choose')}</option>
                                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="tome-field">
                            <label>{t('adminSelectSpell')}</label>
                            <select
                                value={hintGrantForm.spellId}
                                onChange={(e) => setHintGrantForm({ ...hintGrantForm, spellId: e.target.value })}
                                required
                            >
                                <option value="">{t('choose')}</option>
                                {spells.map((s) => <option key={s.id} value={s.id}>{s.name} (Lv {s.level})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="tome-btn-row">
                        <button type="submit" className="tome-btn">{t('adminHintGrantBtn')}</button>
                    </div>
                </form>
            </section>

            <section className="sheet-section admin-section">
                <h2
                    className="sheet-column-title"
                    style={{ background: 'transparent', color: 'var(--ink)', padding: 0, border: 0, marginBottom: '0.5rem', cursor: 'pointer' }}
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
