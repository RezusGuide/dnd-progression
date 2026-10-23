import { useEffect, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'
import ErrorScreen from '../components/errors/ErrorScreen'
import { Button, Dossier, Loader, PageHeader } from '../components/ui'
import '../styles/sheet.css'

// Old address of the GM panel. The GM goes straight to the console (/gm);
// /admin?setup=1 still offers to claim the GM seat while nobody holds it.
const OLD_ANCHORS = { '#world': '/gm/world', '#dreams': '/gm/dreams', '#chest': '/gm/chest', '#grants': '/gm/grants', '#options': '/gm/options' }

export default function Admin() {
    const { user, isGm, login } = useAuth()
    const { t } = useLang()
    const { hash } = useLocation()
    const [searchParams] = useSearchParams()
    const isSetup = searchParams.get('setup') === '1'
    // null while unknown; the claim panel only exists while no GM is set.
    const [ownerExists, setOwnerExists] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => {
        if (!isSetup || isGm) return
        api.get('/api/auth/setup-status')
            .then((res) => setOwnerExists(res.data.ownerExists))
            .catch(() => setOwnerExists(true))
    }, [isSetup, isGm])

    const handleClaim = async () => {
        setError('')
        try {
            await api.post('/api/admin/bootstrap-owner')
            const me = await api.get('/api/auth/me')
            login({ username: me.data.username, userId: me.data.userId, roles: me.data.roles, gm: me.data.gm }, me.data.token)
        } catch (err) {
            setError(err.response?.data?.message || 'Допуск отклонён. Обратитесь в приёмную.')
        }
    }

    if (isGm) return <Navigate to={OLD_ANCHORS[hash] || '/gm'} replace />
    if (isSetup && ownerExists === null) return <div className="parchment-page"><Loader /></div>
    if (!isSetup || ownerExists) return <ErrorScreen code={403} />

    return (
        <div className="parchment-page">
            <PageHeader title="Первичная настройка" />
            <Dossier tab="Пульт ГМ" style={{ maxWidth: 480, width: '100%' }}>
                <p style={{ marginBottom: '1rem' }}>{t('adminBecomeOwnerHint')}</p>
                {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}
                {user && <Button onClick={handleClaim}>{t('adminBecomeOwner')}</Button>}
            </Dossier>
        </div>
    )
}
