import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { Button, Dossier, EmptyState, Field, Loader, Modal, PageHeader } from '../components/ui'
import { formatDateTime } from '../constants/dnd-ru'

// Доска объявлений: every notice is a document pinned to the board.
// Only the GM can post or take one down.
export default function Announcements() {
    const { isGm } = useAuth()
    const canEdit = isGm

    const [posts, setPosts] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ title: '', body: '' })
    const [error, setError] = useState('')
    const [removing, setRemoving] = useState(null)

    useEffect(() => {
        api.get('/api/announcements')
            .then((res) => {
                const list = Array.isArray(res.data) ? [...res.data] : []
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                setPosts(list)
            })
            .catch(() => setPosts([]))
    }, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        setError('')
        try {
            const res = await api.post('/api/announcements', form)
            setPosts([res.data, ...(posts || [])])
            setForm({ title: '', body: '' })
            setShowForm(false)
        } catch {
            setError('Допуск отклонён. Обратитесь в приёмную.')
        }
    }

    const confirmDelete = async () => {
        const id = removing.id
        setRemoving(null)
        try {
            await api.delete(`/api/announcements/${id}`)
            setPosts(posts.filter((p) => p.id !== id))
        } catch {
            setError('Допуск отклонён. Обратитесь в приёмную.')
        }
    }

    return (
        <div className="parchment-page">
            <PageHeader
                title="Доска объявлений"
                subtitle="Распоряжения и новости конторы."
                actions={canEdit && !showForm && <Button onClick={() => setShowForm(true)}>Вывесить объявление</Button>}
            />

            <div className="board">
                {showForm && (
                    <Dossier tab="Новое объявление">
                        <form onSubmit={handleCreate} className="board-form">
                            <Field label="Заголовок" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                            <Field label="Текст" as="textarea" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} error={error} required />
                            <div className="ui-modal-actions">
                                <Button variant="ghost" onClick={() => setShowForm(false)}>Отмена</Button>
                                <Button type="submit">Вывесить</Button>
                            </div>
                        </form>
                    </Dossier>
                )}

                {!posts && <Loader />}
                {posts && posts.length === 0 && !showForm && <EmptyState>Объявлений нет. Секретарша проверит позже.</EmptyState>}

                {posts && posts.map((post) => (
                    <Dossier key={post.id} as="article" className="board-note">
                        <span className="board-pin" aria-hidden="true" />
                        <div className="board-note-head">
                            <div>
                                <h2 className="board-note-title">{post.title}</h2>
                                <p className="board-note-date">
                                    {formatDateTime(post.createdAt)}{post.authorName ? ` · ${post.authorName}` : ''}
                                </p>
                            </div>
                            {canEdit && (
                                <Button variant="danger" onClick={() => setRemoving(post)} aria-label={`Снять объявление «${post.title}»`}>Снять</Button>
                            )}
                        </div>
                        <p className="board-note-body">{post.body}</p>
                    </Dossier>
                ))}
            </div>

            {removing && (
                <Modal
                    title="Снять объявление?"
                    onClose={() => setRemoving(null)}
                    actions={<>
                        <Button variant="ghost" onClick={() => setRemoving(null)}>Отмена</Button>
                        <Button variant="danger" onClick={confirmDelete}>Снять</Button>
                    </>}
                >
                    <p>«{removing.title}» исчезнет с доски. Отменить нельзя.</p>
                </Modal>
            )}
        </div>
    )
}
