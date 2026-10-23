import { useEffect, useState } from 'react'
import api from '../api/axios'

// «Мир» (prompts/09-dreams-and-world.md): categories, wiki links, the
// «recently opened» window. Article texts live in the database only.

export const CATEGORIES = [
    ['ORG', 'Организации'],
    ['PLACE', 'Места'],
    ['PHENOMENON', 'Явления'],
    ['LAW', 'Законы'],
    ['LEGEND', 'Легенды'],
    ['HISTORY', 'История'],
    ['PERSON', 'Лица'],
    ['OTHER', 'Прочее'],
]
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES)

export const STATUS_LABEL = { HIDDEN: 'Скрыто', REDACTED: 'Засекречено', OPEN: 'Открыто' }

export const RECENT_DAYS = 7

/** Opened within the last week. */
export function isRecent(revealedAt, now = Date.now()) {
    if (!revealedAt) return false
    const t = Date.parse(revealedAt)
    return !Number.isNaN(t) && now - t <= RECENT_DAYS * 24 * 3600 * 1000 && t <= now + 60000
}

export const WIKI = /\[\[([a-z0-9]+(?:-[a-z0-9]+)*)(?:\|([^\]\n]+))?\]\]/g

const escapeLinkText = (text) => text.replace(/([\\[\]])/g, '\\$1')

/**
 * [[slug|текст]] and [[slug]] become ordinary Markdown links to /world/slug.
 * Whether the target exists is decided when the link is drawn, so a link
 * to a hidden or missing article never shows where it points.
 */
export function wikiToMarkdown(body, titles = {}) {
    if (!body) return ''
    return body.replace(WIKI, (_, slug, text) => `[${escapeLinkText((text || titles[slug] || slug).trim())}](/world/${slug})`)
}

/** /world/slug → slug; anything else → null. */
export function wikiSlug(href) {
    const m = /^\/world\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(href || '')
    return m ? m[1] : null
}

/** Case-insensitive search over title and teaser, ё = е. */
export function matches(article, query) {
    const norm = (s) => (s || '').toLowerCase().replaceAll('ё', 'е')
    const q = norm(query).trim()
    if (!q) return true
    return norm(article.title).includes(q) || norm(article.teaser).includes(q)
}

/** The list players see (OPEN and REDACTED), null while loading. */
export function useWorldIndex() {
    const [articles, setArticles] = useState(null)
    useEffect(() => {
        api.get('/api/world').then((res) => setArticles(res.data)).catch(() => setArticles([]))
    }, [])
    return articles
}

export function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s*г\.$/, '')
}
