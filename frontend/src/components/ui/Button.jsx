import { Link } from 'react-router-dom'

// variant: primary (dawn fill, night text) | secondary (brass outline) |
// ghost (no border) | danger. Pass `to` for a router link, `href` for a
// plain link, otherwise it renders a <button>.
export default function Button({ variant = 'primary', to, href, className = '', type = 'button', ...rest }) {
    const cls = `ui-btn ui-btn-${variant} ${className}`.trim()
    if (to) return <Link to={to} className={cls} {...rest} />
    if (href) return <a href={href} className={cls} {...rest} />
    return <button type={type} className={cls} {...rest} />
}
