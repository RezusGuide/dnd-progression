import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button, EmptyState, Loader, PageHeader } from '../../components/ui'
import Redacted from '../../components/world/Redacted'
import { CATEGORIES, formatDate, isRecent, matches, useWorldIndex } from '../../lib/world'
import '../../styles/world.css'

// «Мир»: the archive as a card index - one drawer per category, a search
// over titles and teasers. Redacted articles show only the title, the
// teaser and black bars.
export default function WorldPage() {
    const { isGm } = useAuth()
    const articles = useWorldIndex()
    const [query, setQuery] = useState('')

    if (!articles) return <div className="parchment-page"><Loader /></div>
    const shown = articles.filter((a) => matches(a, query))

    return (
        <div className="parchment-page world-page">
            <PageHeader title="Мир" subtitle="Архив конторы: что сотрудникам положено знать."
                actions={isGm && <Button variant="secondary" to="/gm/world">Править архив</Button>} />
            <div className="world-body">
                <label className="world-search">
                    <span className="sheet-label">Поиск по архиву</span>
                    <input type="search" className="sheet-input" value={query} onChange={(e) => setQuery(e.target.value)}
                        placeholder="Например, руна" />
                </label>
                {articles.length === 0 && <EmptyState>Архив пуст. Секретарша ещё не разобрала папки.</EmptyState>}
                {articles.length > 0 && shown.length === 0 && <EmptyState>В архиве такого нет.</EmptyState>}
                {CATEGORIES.map(([key, label]) => {
                    const inDrawer = shown.filter((a) => a.category === key)
                    if (inDrawer.length === 0) return null
                    return (
                        <section key={key} className="world-drawer" aria-label={label}>
                            <h2 className="world-drawer-label"><span>{label}</span> <span className="world-drawer-count">{inDrawer.length}</span></h2>
                            <div className="world-cards">
                                {inDrawer.map((a) => <ArticleCard key={a.slug} article={a} />)}
                            </div>
                        </section>
                    )
                })}
            </div>
        </div>
    )
}

export function ArticleCard({ article }) {
    const redacted = article.status === 'REDACTED'
    return (
        <Link to={`/world/${article.slug}`} className={`world-card ${redacted ? 'is-redacted' : ''}`}>
            <span className="world-card-title">{article.title}</span>
            {article.teaser && <span className="world-card-teaser">{article.teaser}</span>}
            {redacted && (
                <>
                    <Redacted lines={3} />
                    <span className="world-card-caption">Документ откроется по ходу дела.</span>
                </>
            )}
            {!redacted && isRecent(article.revealedAt) && <span className="world-plaque">Открыто {formatDate(article.revealedAt)}</span>}
        </Link>
    )
}
