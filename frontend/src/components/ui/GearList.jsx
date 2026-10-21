import { Children } from 'react'
import Gear from './Gear'

// Bulleted list with small brass gears instead of dots.
export default function GearList({ children, className = '' }) {
    return (
        <ul className={`ui-gear-list ${className}`.trim()}>
            {Children.map(children, (child) => child && (
                <li>
                    <Gear size={14} className="ui-gear-bullet" />
                    <span>{child}</span>
                </li>
            ))}
        </ul>
    )
}
