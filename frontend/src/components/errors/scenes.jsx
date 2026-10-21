import CatMascot from '../brand/CatMascot'
import CatHead from '../brand/CatHead'
import MimicMascot from '../brand/MimicMascot'
import { Emblem } from '../brand/Logo'
import Stamp from '../ui/Stamp'

// One small animated scene per error code. All motion lives in
// errors.css and stops under prefers-reduced-motion.

// 404: the cat at a filing cabinet - a drawer slides out, papers fly, the
// cat shakes its head.
function CabinetScene() {
    return (
        <div className="err-scene">
            <svg viewBox="0 0 200 240" width="170" height="204" aria-hidden="true" className="err-cabinet">
                <rect className="err-cabinet-body" x="30" y="30" width="140" height="205" rx="6" />
                <g className="err-drawer">
                    <rect className="err-cabinet-drawer" x="40" y="42" width="120" height="56" rx="3" />
                    <rect className="err-cabinet-handle" x="84" y="62" width="32" height="8" rx="3" />
                    <rect className="err-cabinet-label" x="88" y="76" width="24" height="12" />
                </g>
                <rect className="err-cabinet-drawer" x="40" y="108" width="120" height="56" rx="3" />
                <rect className="err-cabinet-handle" x="84" y="128" width="32" height="8" rx="3" />
                <rect className="err-cabinet-drawer" x="40" y="172" width="120" height="56" rx="3" />
                <rect className="err-cabinet-handle" x="84" y="192" width="32" height="8" rx="3" />
                {/* drawn last so the flying sheets pass in front of the cabinet */}
                <g className="err-papers">
                    <rect className="err-paper err-paper-1" x="70" y="34" width="34" height="44" rx="2" />
                    <rect className="err-paper err-paper-2" x="80" y="38" width="34" height="44" rx="2" />
                    <rect className="err-paper err-paper-3" x="62" y="40" width="34" height="44" rx="2" />
                </g>
            </svg>
            <CatMascot size={140} decorative className="err-cat-shake" />
        </div>
    )
}

// 403: a REJECTED stamp thumps a sheet while the chest slams its lid.
function DeniedScene() {
    return (
        <div className="err-scene">
            <div className="err-sheet" aria-hidden="true">
                <span /><span /><span /><span />
                <Stamp kind="rejected" className="err-stamp-loop" />
            </div>
            <MimicMascot size={150} decorative className="err-mimic-slam" />
        </div>
    )
}

// 500: the emblem's gear jams and steam bursts out; the cat's ears tremble.
function BoilerScene() {
    return (
        <div className="err-scene">
            <div className="err-boiler" aria-hidden="true">
                <Emblem size={150} mono={false} />
                <span className="err-burst err-burst-1" />
                <span className="err-burst err-burst-2" />
                <span className="err-burst err-burst-3" />
            </div>
            <CatMascot size={120} decorative className="err-cat-ears" />
        </div>
    )
}

// 503: the cat asleep on a stack of folders, Zzz drifting up like steam.
function SleepScene() {
    return (
        <div className="err-scene err-scene-sleep">
            <div className="err-nap" aria-hidden="true">
                <span className="err-zzz err-zzz-1">z</span>
                <span className="err-zzz err-zzz-2">z</span>
                <span className="err-zzz err-zzz-3">Z</span>
                <CatMascot size={130} pose="sleep" decorative className="err-cat-breathe" />
                <svg viewBox="0 0 220 70" width="220" height="70" className="err-folders">
                    <rect className="err-folder-a" x="10" y="44" width="200" height="22" rx="3" />
                    <rect className="err-folder-b" x="20" y="24" width="180" height="22" rx="3" />
                    <rect className="err-folder-a" x="30" y="4" width="160" height="22" rx="3" />
                </svg>
            </div>
        </div>
    )
}

// offline: a pneumatic-post capsule shoots into the tube and gets stuck.
function TubeScene() {
    return (
        <div className="err-scene">
            <svg viewBox="0 0 320 120" width="320" height="120" aria-hidden="true" className="err-tube">
                <rect className="err-tube-pipe" x="0" y="42" width="320" height="36" rx="18" />
                <g className="err-capsule">
                    <rect className="err-capsule-body" x="0" y="47" width="70" height="26" rx="13" />
                    <rect className="err-capsule-band" x="22" y="47" width="8" height="26" />
                    <rect className="err-capsule-band" x="40" y="47" width="8" height="26" />
                </g>
                <rect className="err-tube-glass" x="0" y="42" width="320" height="36" rx="18" />
                <rect className="err-tube-ring" x="96" y="36" width="12" height="48" rx="3" />
                <rect className="err-tube-ring" x="212" y="36" width="12" height="48" rx="3" />
            </svg>
            <CatHead size={70} className="err-cat-peek" />
        </div>
    )
}

// crash: the chest bites a document; scraps fly.
function BiteScene() {
    return (
        <div className="err-scene">
            <div className="err-bite" aria-hidden="true">
                <span className="err-bite-sheet"><span /><span /><span /></span>
                <MimicMascot size={160} decorative className="err-mimic-bite" />
                <span className="err-scrap err-scrap-1" />
                <span className="err-scrap err-scrap-2" />
                <span className="err-scrap err-scrap-3" />
                <span className="err-scrap err-scrap-4" />
            </div>
        </div>
    )
}

const SCENES = {
    404: CabinetScene,
    403: DeniedScene,
    500: BoilerScene,
    503: SleepScene,
    offline: TubeScene,
    crash: BiteScene,
}

export default function ErrorScene({ code }) {
    const Scene = SCENES[code] || CabinetScene
    return <Scene />
}
