import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api/axios'
import { Button, Dossier, EmptyState, Loader, PageHeader } from '../../components/ui'
import ErrorScreen from '../../components/errors/ErrorScreen'
import AspectIcon from '../../components/aspects/AspectIcon'
import { bagEntries, useMagicData } from '../../lib/magic'
import { recipeFor } from '../../lib/research'
import '../../styles/sheet.css'
import '../../styles/research.css'

// "Соединение аспектов" (magic-v2.md, section 9): two slots, the bag below,
// the result on the right, and the full recipe book. Two aspects with a
// recipe become their compound; there is no taking it apart again.
export default function CombinePage() {
    const { characterId } = useParams()
    const [magic, magicError] = useMagicData()
    const [character, setCharacter] = useState(null)
    const [loadError, setLoadError] = useState(null)
    const [slots, setSlots] = useState([null, null])
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        api.get(`/api/characters/${characterId}`).then((res) => setCharacter(res.data)).catch(setLoadError)
    }, [characterId])

    if (loadError || magicError) {
        const status = (loadError || magicError).response?.status
        return <ErrorScreen code={status === 404 ? 404 : status ? 500 : 'offline'} />
    }
    if (!character || !magic) return <div className="parchment-page" data-theme="night"><Loader /></div>

    const bag = character.aspects || {}
    const [a, b] = slots
    const result = a && b ? recipeFor(magic.aspects, a, b) : null
    // A slot holds one unit; the same aspect in both needs two in the bag.
    const free = (key) => (bag[key] || 0) - slots.filter((s) => s === key).length

    const put = (key) => {
        setMessage('')
        setError('')
        if (free(key) <= 0) return
        setSlots(([x, y]) => (x === null ? [key, y] : y === null ? [x, key] : [x, key]))
    }

    const combine = async () => {
        setBusy(true)
        setError('')
        try {
            const res = await api.post(`/api/characters/${characterId}/aspects/combine`, { a, b })
            setCharacter((c) => ({ ...c, aspects: res.data }))
            setMessage(`Соединено: ${magic.byKey[result]?.nameRu}. Подшито в сумку.`)
            setSlots([null, null])
        } catch (err) {
            setError(err.response?.data?.message || 'Не соединилось. Повторите.')
        } finally {
            setBusy(false)
        }
    }

    const slot = (index) => {
        const key = slots[index]
        return (
            <button type="button" className={`combine-slot ${key ? 'is-filled' : ''}`}
                onClick={() => setSlots((s) => s.map((v, i) => (i === index ? null : v)))}
                aria-label={key ? `${magic.byKey[key].nameRu}, убрать` : 'Пустое место'}>
                {key ? <><AspectIcon aspect={magic.byKey[key]} size={48} /><span>{magic.byKey[key].nameRu}</span></> : <span className="combine-slot-empty">пусто</span>}
            </button>
        )
    }

    const entries = bagEntries(bag, magic.aspects)
    const compounds = magic.aspects.filter((x) => x.components.length === 2)

    return (
        <div className="parchment-page research-page" data-theme="night">
            <PageHeader
                title="Соединение аспектов"
                subtitle={character.name}
                back={`/characters/${characterId}/research`}
                backLabel="← Стол исследований"
            />
            <div className="combine-layout">
                <Dossier tab="Бланк соединения" className="combine-form">
                    <p className="research-note">Положите два аспекта. Если для них есть рецепт, оба расходуются и в сумку ложится составной. Обратно не разбирается.</p>
                    <div className="combine-row">
                        {slot(0)}
                        <span className="combine-op" aria-hidden="true">+</span>
                        {slot(1)}
                        <span className="combine-op" aria-hidden="true">=</span>
                        <div className={`combine-result ${result ? 'is-ready' : ''}`} role="status">
                            {result
                                ? <><AspectIcon aspect={magic.byKey[result]} size={56} /><span>{magic.byKey[result].nameRu}</span></>
                                : <span className="combine-slot-empty">{a && b ? 'Рецепта нет' : '?'}</span>}
                        </div>
                    </div>
                    <div className="combine-actions">
                        <Button onClick={combine} disabled={!result || busy}>Соединить</Button>
                        <Button variant="ghost" onClick={() => setSlots([null, null])} disabled={!a && !b}>Очистить</Button>
                    </div>
                    {message && <p className="research-good" role="status">{message}</p>}
                    {error && <p className="ui-field-error" role="alert"><span aria-hidden="true">✕</span> {error}</p>}

                    <h2 className="research-side-title">Сумка</h2>
                    {entries.length === 0 && <EmptyState>Сумка пуста. Аспекты выдаёт ГМ.</EmptyState>}
                    <ul className="combine-bag">
                        {entries.map(({ aspect }) => (
                            <li key={aspect.key}>
                                <button type="button" className="research-bag-item" onClick={() => put(aspect.key)} disabled={free(aspect.key) <= 0}>
                                    <AspectIcon aspect={aspect} size={30} />
                                    <span className="research-bag-name">{aspect.nameRu}</span>
                                    <span className="research-bag-count">× {Math.max(0, free(aspect.key))}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </Dossier>

                <Dossier tab="Справочник рецептов" className="combine-recipes">
                    <table className="combine-table">
                        <thead><tr><th scope="col">Составляющие</th><th scope="col">Результат</th></tr></thead>
                        <tbody>
                            {compounds.map((x) => (
                                <tr key={x.key}>
                                    <td>
                                        <span className="combine-recipe">
                                            <AspectIcon aspect={magic.byKey[x.components[0]]} size={24} /> {magic.byKey[x.components[0]].nameRu}
                                            <span aria-hidden="true"> + </span>
                                            <AspectIcon aspect={magic.byKey[x.components[1]]} size={24} /> {magic.byKey[x.components[1]].nameRu}
                                        </span>
                                    </td>
                                    <th scope="row"><span className="combine-recipe"><AspectIcon aspect={x} size={24} /> {x.nameRu}</span></th>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Dossier>
            </div>
        </div>
    )
}
