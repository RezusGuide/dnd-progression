// "Папка-дело": a paper document card with thin brass corners, an optional
// tab label on top and an optional case number in PT Mono.
export default function Dossier({ tab, caseNo, as: Tag = 'section', className = '', children, ...rest }) {
    return (
        <Tag className={`ui-dossier ${tab ? 'has-tab' : ''} ${className}`.trim()} {...rest}>
            {tab && <span className="ui-dossier-tab">{tab}</span>}
            {caseNo != null && <span className="ui-dossier-no">Дело № {String(caseNo).padStart(4, '0')}</span>}
            <span className="ui-corner ui-corner-tl" aria-hidden="true" />
            <span className="ui-corner ui-corner-tr" aria-hidden="true" />
            <span className="ui-corner ui-corner-bl" aria-hidden="true" />
            <span className="ui-corner ui-corner-br" aria-hidden="true" />
            {children}
        </Tag>
    )
}
