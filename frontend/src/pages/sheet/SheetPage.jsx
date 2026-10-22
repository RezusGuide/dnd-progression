import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ErrorScreen from '../../components/errors/ErrorScreen'
import { Loader } from '../../components/ui'
import useCharacterSheet from './useCharacterSheet'
import SheetHeader from './SheetHeader'
import CombatBar from './CombatBar'
import AbilitiesPanel from './AbilitiesPanel'
import SavesSkillsPanel from './SavesSkillsPanel'
import AttacksPanel from './AttacksPanel'
import MagicTab from './MagicTab'
import GearTab from './GearTab'
import PersonaTab from './PersonaTab'
import NotesTab from './NotesTab'
import '../../styles/sheet.css'

const TABS = [
    ['combat', 'Бой'],
    ['magic', 'Магия'],
    ['gear', 'Снаряжение'],
    ['persona', 'Личность'],
    ['notes', 'Заметки'],
]

// Character sheet (docs/zlatopryady/sheet-ux.md). The active tab lives in
// the URL (?tab=magic) so a link opens the right one. Edit mode is local:
// only the owner / GM ever gets the "Править дело" button.
export default function SheetPage() {
    const { id } = useParams()
    const sheet = useCharacterSheet(id)
    const { character, form, update, canEdit, saveState, loadError } = sheet
    const [params, setParams] = useSearchParams()
    const [editingRaw, setEditing] = useState(false)
    const editing = canEdit && editingRaw

    const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'combat'
    const selectTab = (key) => setParams(key === 'combat' ? {} : { tab: key }, { replace: true })

    if (loadError) return <ErrorScreen code={loadError} />
    if (!character || !form) return <div className="parchment-page"><Loader /></div>

    const panelProps = { character, form, update, canEdit, editing }

    return (
        <div className="sheet-page">
            <SheetHeader {...panelProps} setEditing={setEditing} saveState={saveState} requests={sheet.requests} requestLevelUp={sheet.requestLevelUp} />
            <CombatBar {...panelProps} />

            <div className="sheet-tabs" role="tablist" aria-label="Разделы листа">
                {TABS.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        id={`sheet-tab-${key}`}
                        aria-selected={tab === key}
                        aria-controls="sheet-panel"
                        className={`sheet-tab ${tab === key ? 'is-active' : ''}`}
                        onClick={() => selectTab(key)}
                    >{label}</button>
                ))}
            </div>

            <div id="sheet-panel" role="tabpanel" aria-labelledby={`sheet-tab-${tab}`} className="sheet-panel">
                {tab === 'combat' && (
                    <>
                        <AbilitiesPanel {...panelProps} />
                        <SavesSkillsPanel {...panelProps} />
                        <AttacksPanel {...panelProps} />
                    </>
                )}
                {tab === 'magic' && (
                    <MagicTab {...panelProps} knownSpells={sheet.knownSpells} notes={sheet.notes} catalog={sheet.catalog} addCantrip={sheet.addCantrip} />
                )}
                {tab === 'gear' && <GearTab {...panelProps} />}
                {tab === 'persona' && <PersonaTab {...panelProps} />}
                {tab === 'notes' && <NotesTab {...panelProps} />}
            </div>
        </div>
    )
}
