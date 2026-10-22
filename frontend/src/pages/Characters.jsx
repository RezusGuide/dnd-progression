import { useState, useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import api from '../api/axios'
import { classifyApiError } from '../api/apiErrors'
import ErrorScreen from '../components/errors/ErrorScreen'
import { Button, EmptyState, Loader, Modal, PageHeader } from '../components/ui'
import { className, raceName } from '../constants/dnd-ru'

// D&D is publicly viewable now (see SecurityConfig) - only logged-in
// accounts can create characters, so the "new character" tile only shows
// up once someone's signed in. Per-card delete is further restricted to
// that character's own creator (or an OWNER-role/DM account) - see
// CharacterService#deleteCharacter, which already enforced this
// server-side; the button itself now matches, instead of showing to
// every signed-in account and failing silently for non-owners.


export default function Characters() {
    const { user, hasSection } = useAuth()
    const { t } = useLang()
    const navigate = useNavigate()
    const [characters, setCharacters] = useState([])
    // Old links to /characters?new=1 go straight to the wizard.
    const [searchParams] = useSearchParams()
    const [removing, setRemoving] = useState(null)
    const [copiedId, setCopiedId] = useState(null)
    // 'loading' | 'ok' | an ErrorScreen code when the list itself failed
    const [status, setStatus] = useState('loading')

    const handleShare = async (e, charId) => {
        e.stopPropagation()
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/characters/${charId}`)
            setCopiedId(charId)
            setTimeout(() => setCopiedId((id) => (id === charId ? null : id)), 1500)
        } catch { /* clipboard not available - ignore */ }
    }

    useEffect(() => {
        fetchCharacters()
    }, [])

    const fetchCharacters = async () => {
        try {
            const res = await api.get('/api/characters')
            setCharacters(Array.isArray(res.data) ? res.data : [])
            setStatus('ok')
        } catch (err) {
            console.error(err)
            setCharacters([])
            setStatus(classifyApiError(err) || 'ok')
        }
    }

    const confirmDelete = async () => {
        const id = removing.id
        setRemoving(null)
        try {
            await api.delete(`/api/characters/${id}`)
            fetchCharacters()
        } catch (err) {
            console.error(err)
        }
    }

    if (searchParams.get('new') === '1') return <Navigate to="/characters/new" replace />

    // The list itself didn't load (server down / no connection): a full
    // error screen beats an empty vault that looks like "no characters".
    if (status !== 'loading' && status !== 'ok') {
        return <ErrorScreen code={status} onRetry={() => { setStatus('loading'); fetchCharacters() }} />
    }

    return (
        <div className="parchment-page">

            <PageHeader
                title="Личные дела"
                subtitle="Сотрудники в вашем ведении."
                actions={user && <Button to="/characters/new">Завести личное дело</Button>}
            />

            {status === 'loading' && <Loader />}

            {/* This list only ever shows your own characters now (or
                everyone's, for the DM) - a signed-out visitor with zero
                characters would otherwise see a totally blank vault with
                no explanation why. Direct share links to a specific
                character still work regardless - see sheetShareLink. */}
            {status === 'ok' && characters.length === 0 && (
                <EmptyState>{user ? 'Личных дел пока нет. Секретарша проверит позже.' : t('vaultSignInHint')}</EmptyState>
            )}

            {status === 'ok' && <div className="characters-grid">
                {characters.map((char) => (
                    <div
                        key={char.id}
                        className="character-card"
                        onClick={() => navigate(`/characters/${char.id}`)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="character-card-top">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                <span className="character-portrait">
                                    {char.portraitData ? <img src={char.portraitData} alt="" /> : '🗡'}
                                </span>
                                <h2 className="character-name">{char.name}</h2>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button
                                    className="tome-btn-ghost"
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                    onClick={(e) => handleShare(e, char.id)}
                                    title={t('sheetShareLink')}
                                >{copiedId === char.id ? '✓' : '🔗'}</button>
                                {user && (hasSection('*') || char.ownerId === user.userId) && (
                                    <button
                                        className="tome-btn-danger"
                                        aria-label={`Удалить личное дело «${char.name}»`}
                                        onClick={(e) => { e.stopPropagation(); setRemoving(char) }}
                                    >✕</button>
                                )}
                            </div>
                        </div>
                        <div className="character-meta">
                            <span className="meta-tag">{className(char.characterClass) || '—'}</span>
                            <span className="meta-tag">{raceName(char.race) || '—'}</span>
                            <span className="meta-tag level-tag">{t('level')} {char.level}</span>
                            {char.approvalStatus === 'PENDING' && <span className="meta-tag pending-tag">На рассмотрении</span>}
                            {char.approvalStatus === 'REJECTED' && <span className="meta-tag pending-tag">Отказано</span>}
                            {char.campaign && (
                                <span className="meta-tag campaign-tag">⚔ {char.campaign.name}</span>
                            )}
                        </div>
                        {char.backstory && (
                            <p className="character-backstory">{char.backstory}</p>
                        )}
                    </div>
                ))}

                {user && (
                    <div className="character-card new-card" role="link" tabIndex={0} onClick={() => navigate('/characters/new')} onKeyDown={(e) => { if (e.key === 'Enter') navigate('/characters/new') }}>
                        <span className="new-card-icon">✦</span>
                        <span className="new-card-label">{t('forgeNewCharacter')}</span>
                    </div>
                )}
            </div>}

            {removing && (
                <Modal
                    title="Удалить личное дело"
                    onClose={() => setRemoving(null)}
                    actions={<>
                        <Button variant="ghost" onClick={() => setRemoving(null)}>Отмена</Button>
                        <Button variant="danger" onClick={confirmDelete}>Удалить</Button>
                    </>}
                >
                    <p>Удалить личное дело «{removing.name}»? Отменить нельзя.</p>
                </Modal>
            )}
        </div>
    )
}