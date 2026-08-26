import { useState } from 'react'
import { useLang } from '../context/LangContext'
import api from '../api/axios'

// Self-service recovery code - the only way back in if you forget your own
// password, since there's no email-based reset (this app sends no email at
// all) and only the owner can reset other accounts' passwords from /admin.
// Generating a new code invalidates whatever code existed before.
export default function Account() {
    const { t } = useLang()
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [confirmed, setConfirmed] = useState(false)

    const handleGenerate = async () => {
        setError('')
        setConfirmed(false)
        try {
            const res = await api.post('/api/auth/recovery-code')
            setCode(res.data.recoveryCode)
        } catch (err) {
            setError(err.response?.data?.message || t('accountRecoveryFailed'))
        }
    }

    return (
        <div className="parchment-page">
            <div className="tome-panel">
                <h1 className="tome-title">{t('accountTitle')}</h1>
                <p className="tome-subtitle">{t('accountRecoveryHint')}</p>

                {error && <div className="tome-error">{error}</div>}

                {code && (
                    <div className="tome-notice">
                        <p>{t('accountRecoveryCodeShown')}</p>
                        <p style={{ fontFamily: 'monospace', fontSize: '1.4rem', letterSpacing: '0.1em', textAlign: 'center', margin: '0.75rem 0' }}>
                            {code}
                        </p>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                            {t('accountRecoveryCodeConfirm')}
                        </label>
                    </div>
                )}

                {(!code || confirmed) && (
                    <button className="tome-btn" onClick={handleGenerate} style={{ marginTop: '1rem' }}>
                        {code ? t('accountRegenerateCode') : t('accountGenerateCode')}
                    </button>
                )}
            </div>
        </div>
    )
}
