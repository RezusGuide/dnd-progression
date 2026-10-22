import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/ui'
import MyTimeTab from './MyTimeTab'
import PollsTab from './PollsTab'
import SessionsTab from './SessionsTab'
import '../../styles/sheet.css'
import '../../styles/calendar.css'

// Календарь (prompts/08-calendar.md): own free time, session polls and
// scheduled sessions. The tab lives in ?tab= so links can point at one.
const TABS = [['time', 'Моё время'], ['polls', 'Подбор сессии'], ['sessions', 'Сессии']]

export default function CalendarPage() {
    const [params, setParams] = useSearchParams()
    const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'time'
    return (
        <div className="parchment-page calendar-page">
            <PageHeader title="Календарь" subtitle="График присутствия и подбор сессий. Каждый видит время в своём поясе." />
            <div className="calendar-body">
                <div className="sheet-tabs" role="tablist" aria-label="Календарь">
                    {TABS.map(([key, label]) => (
                        <button key={key} type="button" role="tab" aria-selected={tab === key}
                            className={`sheet-tab ${tab === key ? 'is-active' : ''}`}
                            onClick={() => setParams({ tab: key })}>{label}</button>
                    ))}
                </div>
                {tab === 'time' && <MyTimeTab />}
                {tab === 'polls' && <PollsTab />}
                {tab === 'sessions' && <SessionsTab />}
            </div>
        </div>
    )
}
