import CatHead from '../brand/CatHead'
import Gear from './Gear'

// Loading placeholder: cat head with a turning gear, "Ищем в картотеке…".
export default function Loader({ text = 'Ищем в картотеке…', className = '' }) {
    return (
        <div className={`ui-loader ${className}`.trim()} role="status" aria-live="polite">
            <span className="ui-loader-art" aria-hidden="true">
                <CatHead size={56} />
                <Gear size={28} className="ui-loader-gear" />
            </span>
            <span className="ui-loader-text">{text}</span>
        </div>
    )
}
