import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api/axios'
import { Dossier, EmptyState, Loader, PageHeader } from '../../components/ui'
import ErrorScreen from '../../components/errors/ErrorScreen'
import ImmersionTracker from '../../components/dreams/ImmersionTracker'
import DreamFormIcon from '../../components/dreams/DreamFormIcon'
import { caseNumber, closedText, useStageLabels } from '../../lib/dreams'
import { DreamStamp } from './DreamsPage'
import '../../styles/dreams.css'
import { useNightTheme } from '../../lib/theme'

// One case: what the staff know, the reward, and for the player's own
// characters the immersion stage, what changed and the form in the dream.
export default function DreamPage() {
    useNightTheme()
    const { dreamId } = useParams()
    const labels = useStageLabels()
    const [dream, setDream] = useState(null)
    const [error, setError] = useState(null)
    useEffect(() => {
        api.get(`/api/dreams/${dreamId}`).then((res) => setDream(res.data)).catch(setError)
    }, [dreamId])

    if (error) {
        const status = error.response?.status
        return <ErrorScreen code={status === 404 ? 404 : status === 403 ? 403 : status ? 500 : 'offline'} />
    }
    if (!dream) return <div className="parchment-page" data-theme="night"><Loader /></div>

    const mine = dream.participants.filter((p) => p.mine && !p.left)
    const others = dream.participants.filter((p) => !p.mine && !p.left)
    const ended = closedText(dream.status)

    return (
        <div className="parchment-page dreams-page" data-theme="night">
            <PageHeader title={dream.title} back="/dreams" backLabel="← Сны"
                subtitle={[`Дело ${caseNumber(dream.number)}`, dream.campaignName && `кампания «${dream.campaignName}»`].filter(Boolean).join(' · ')}
                actions={<DreamStamp status={dream.status} />} />
            <div className="dreams-body">
                {ended && <p className="dream-ended" role="status">{ended}</p>}
                <Dossier tab="Что известно" className="dream-card">
                    {dream.summary ? <p className="dream-summary">{dream.summary}</p> : <p className="calendar-help">Сотрудникам пока ничего не сообщили.</p>}
                    {dream.rewardSummary && <p className="dream-reward"><span className="sheet-label">Награда</span><span className="dream-text">{dream.rewardSummary}</span></p>}
                </Dossier>

                {mine.map((p) => (
                    <Dossier key={p.characterId} tab={p.characterName} className="dream-card dream-mine">
                        <ImmersionTracker stage={p.immersionStage ?? 0} labels={labels} />
                        {p.stageNote && <p className="dream-note"><span className="sheet-label">Что изменилось</span><span className="dream-text">{p.stageNote}</span></p>}
                        {p.dreamForm && (
                            <p className="dream-form"><DreamFormIcon /> Во сне вы — {p.dreamFormName || p.dreamForm}.</p>
                        )}
                    </Dossier>
                ))}

                <Dossier tab="Участники" className="dream-card">
                    {mine.length + others.length === 0 ? <EmptyState>В деле пока никого.</EmptyState> : (
                        <p className="dream-folder-people">
                            {[...mine, ...others].map((p) => <span key={p.characterId} className={`dream-person ${p.mine ? 'is-mine' : ''}`}>{p.characterName}</span>)}
                        </p>
                    )}
                </Dossier>
            </div>
        </div>
    )
}
