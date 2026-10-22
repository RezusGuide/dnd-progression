import AspectIcon from '../aspects/AspectIcon'
import { RARITY_LABEL, coinsText } from '../../lib/chest'
import { useMagicData } from '../../lib/magic'

// What a reward holds, as a short inventory list: aspects with icons,
// coins, items with a rarity tag. Used in «Получено», the archive and the
// GM preview.
export function RarityTag({ rarity }) {
    return <span className={`rarity-tag rarity-${(rarity || 'COMMON').toLowerCase()}`}>{RARITY_LABEL[rarity] || RARITY_LABEL.COMMON}</span>
}

export default function ChestContentsList({ contents }) {
    const [magic] = useMagicData()
    const aspects = Object.entries(contents?.aspects || {}).filter(([, n]) => n > 0)
    const coins = coinsText(contents?.coins)
    const items = contents?.items || []
    return (
        <ul className="chest-contents">
            {aspects.map(([k, n]) => (
                <li key={k} className="chest-contents-row">
                    <AspectIcon aspect={magic?.byKey[k] || k} size={26} />
                    <span>{magic?.byKey[k]?.nameRu || k} × {n}</span>
                </li>
            ))}
            {coins && (
                <li className="chest-contents-row">
                    <span className="chest-coin" aria-hidden="true">◎</span>
                    <span>{coins}</span>
                </li>
            )}
            {items.map((item, i) => (
                <li key={`${item.name}-${i}`} className="chest-contents-row">
                    <span className="chest-item-mark" aria-hidden="true">✦</span>
                    <span>{item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
                    <RarityTag rarity={item.rarity} />
                </li>
            ))}
        </ul>
    )
}
