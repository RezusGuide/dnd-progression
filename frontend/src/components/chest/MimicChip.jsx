import MimicMascot from '../brand/MimicMascot'

// A small mimic with the number of sealed parcels, for the navbar, the
// sheet header and the reception. Without parcels just the mimic.
export default function MimicChip({ count = 0, size = 22, label = 'Сундучок' }) {
    return (
        <span className="mimic-chip">
            <MimicMascot size={size} decorative />
            {count > 0 && <span className="mimic-chip-count" aria-label={`${label}: запечатанных посылок ${count}`}>{count}</span>}
        </span>
    )
}
