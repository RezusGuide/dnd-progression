import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { Button, Dossier, EmptyState, Loader, PageHeader } from '../../components/ui'
import ErrorScreen from '../../components/errors/ErrorScreen'
import Markdown from '../../components/world/Markdown'
import Redacted from '../../components/world/Redacted'
import { CATEGORY_LABEL, formatDate, isRecent, useWorldIndex } from '../../lib/world'
import '../../styles/world.css'

// One article. Wiki links resolve against the player's own list, so a link
// to anything hidden never says where it leads.
export default function ArticlePage() {
    const { slug } = useParams()
    const { isGm } = useAuth()
    const index = useWorldIndex()
    const [article, setArticle] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        setArticle(null)
        setError(null)
        api.get(`/api/world/${slug}`).then((res) => setArticle(res.data)).catch(setError)
    }, [slug])

    if (error) {
        const status = error.response?.status
        if (status === 404) {
            return (
                <div className="parchment-page world-page">
                    <PageHeader title="Нет в архиве" back="/world" backLabel="← Мир" />
                    <EmptyState>Такой папки в архиве нет. Может, её ещё не завели.</EmptyState>
                </div>
            )
        }
        return <ErrorScreen code={status ? 500 : 'offline'} />
    }
    if (!article || !index) return <div className="parchment-page"><Loader /></div>

    const known = new Set(index.map((a) => a.slug))
    const titles = Object.fromEntries(index.map((a) => [a.slug, a.title]))
    const redacted = article.status === 'REDACTED'

    return (
        <div className="parchment-page world-page">
            <PageHeader title={article.title} back="/world" backLabel="← Мир"
                subtitle={CATEGORY_LABEL[article.category]}
                actions={isGm && <Button variant="secondary" to="/gm/world">Править</Button>} />
            <div className="world-body">
                <Dossier tab={redacted ? 'Засекречено' : 'Архив'} className="world-article">
                    {!redacted && isRecent(article.revealedAt) && <p className="world-plaque">Открыто {formatDate(article.revealedAt)}</p>}
                    {article.teaser && <p className="world-teaser">{article.teaser}</p>}
                    {redacted ? (
                        <>
                            <Redacted lines={6} />
                            <p className="world-card-caption">Документ откроется по ходу дела.</p>
                        </>
                    ) : (
                        <Markdown body={article.body} known={known} titles={titles} />
                    )}
                </Dossier>
            </div>
        </div>
    )
}
