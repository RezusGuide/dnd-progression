import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { Button, Dossier, PageHeader } from '../components/ui'

// Мой пропуск. The recovery code is the only way back in after a forgotten
// password: this app sends no email, and only the GM can reset someone
// else's password from /admin. A new code invalidates the previous one.
export default function Account() {
    const { user } = useAuth()
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [confirmed, setConfirmed] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleGenerate = async () => {
        setError('')
        setConfirmed(false)
        setCopied(false)
        try {
            const res = await api.post('/api/auth/recovery-code')
            setCode(res.data.recoveryCode)
        } catch {
            setError('Код не выдан. Повторите позже.')
        }
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
        } catch { /* clipboard not available - the code is on screen anyway */ }
    }

    return (
        <div className="parchment-page">
            <PageHeader title="Мой пропуск" subtitle={user?.username} />
            <Dossier tab="Код восстановления" className="pass">
                <p className="pass-text">
                    Если забудете пароль, вернуться можно только по коду восстановления. Создайте его и сохраните в надёжном месте.
                </p>

                {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}

                {code && (
                    <>
                        <p>Ваш код восстановления. Он показывается один раз, запишите его сейчас:</p>
                        <code className="pass-code">{code}</code>
                        <div className="pass-row">
                            <Button variant="secondary" onClick={handleCopy}>Копировать</Button>
                            <span role="status">{copied ? 'Копия снята.' : ''}</span>
                        </div>
                        <label className="pass-check">
                            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                            Я сохранил(а) код
                        </label>
                    </>
                )}

                {(!code || confirmed) && (
                    <div style={{ marginTop: '1rem' }}>
                        <Button onClick={handleGenerate}>{code ? 'Создать новый код' : 'Создать код'}</Button>
                    </div>
                )}
            </Dossier>
        </div>
    )
}
