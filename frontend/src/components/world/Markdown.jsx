import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { wikiSlug, wikiToMarkdown } from '../../lib/world'

// Article text, rendered safely (react-markdown + remark-gfm):
// - raw HTML is never rendered: react-markdown shows it as text unless a
//   rehype-raw plugin is added, and there is none;
// - URLs go through defaultUrlTransform, which drops javascript:, data: and
//   the like;
// - images are not drawn at all, only their alt text;
// - [[slug|text]] links go to /world/slug when that article is in the
//   player's list (`known`), otherwise they are struck out, «нет в архиве».
export default function Markdown({ body, known, titles }) {
    const components = {
        a({ href, children }) {
            const slug = wikiSlug(href)
            if (slug) {
                if (known?.has(slug)) return <Link to={`/world/${slug}`} className="wiki-link">{children}</Link>
                return <span className="wiki-missing"><del>{children}</del> <span className="wiki-missing-note">нет в архиве</span></span>
            }
            if (/^https?:\/\//i.test(href || '')) return <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>
            return <span>{children}</span>
        },
        img({ alt }) {
            return alt ? <span className="md-img-alt">[{alt}]</span> : null
        },
        table({ children }) {
            return <div className="md-table-wrap"><table>{children}</table></div>
        },
    }
    return (
        <div className="md">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} urlTransform={defaultUrlTransform}>
                {wikiToMarkdown(body, titles)}
            </ReactMarkdown>
        </div>
    )
}
