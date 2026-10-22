import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'
import AspectIcon from '../../components/aspects/AspectIcon'
import { bagEntries, useMagicData } from '../../lib/magic'

// Панель ГМ → «Выдачи»: items, materials and aspects for a character. Each
// is its own form and endpoint, so one grant never doubles as another.
export default function AdminGrants() {
    const { t } = useLang()
    const [magic] = useMagicData()
    const [characters, setCharacters] = useState([])
    const [notice, setNotice] = useState('')
    const [error, setError] = useState('')
    const [itemForm, setItemForm] = useState({ characterId: '', item: '' })
    const [materialForm, setMaterialForm] = useState({ characterId: '', material: '' })
    const [aspectForm, setAspectForm] = useState({ characterId: '', aspect: 'dawn', amount: 1 })
    const [bag, setBag] = useState(null)

    useEffect(() => {
        api.get('/api/characters').then((res) => setCharacters(res.data)).catch(() => {})
    }, [])

    // The bag of the character picked in the aspect form.
    useEffect(() => {
        if (!aspectForm.characterId) return
        api.get(`/api/characters/${aspectForm.characterId}`).then((res) => setBag(res.data.aspects || {})).catch(() => setBag(null))
    }, [aspectForm.characterId])

    const send = async (e, url, body, after) => {
        e.preventDefault()
        setError('')
        setNotice('')
        try {
            const res = await api.post(url, body)
            after?.(res.data)
            setNotice(t('adminGranted'))
        } catch (err) {
            setError(err.response?.data?.message || 'Допуск отклонён. Обратитесь в приёмную.')
        }
    }

    const characterSelect = (value, onChange) => (
        <select value={value} onChange={(e) => onChange(e.target.value)} required>
            <option value="">{t('choose')}</option>
            {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
    )

    return (
        <section id="grants" className="sheet-section admin-section">
            <h2 className="sheet-section-title" style={{ marginBottom: '0.75rem' }}>Выдачи</h2>
            {error && <div className="tome-error" role="alert">{error}</div>}
            {notice && <div className="tome-notice" role="status">{notice}</div>}

            <form className="tome-form codex-form" onSubmit={(e) => send(e, '/api/admin/aspects/grant', {
                characterId: Number(aspectForm.characterId), aspect: aspectForm.aspect, amount: Number(aspectForm.amount),
            }, setBag)}>
                <h3 className="tome-field-label">Аспекты</h3>
                <p className="tome-subtitle">Ложатся в сумку персонажа. Тратятся на исследовательские записки и соединение.</p>
                <div className="tome-row">
                    <div className="tome-field">
                        <label>{t('adminSelectCharacter')}</label>
                        {characterSelect(aspectForm.characterId, (v) => setAspectForm({ ...aspectForm, characterId: v }))}
                    </div>
                    <div className="tome-field">
                        <label htmlFor="grant-amount">Сколько</label>
                        <input id="grant-amount" type="number" min="1" max="99" value={aspectForm.amount}
                            onChange={(e) => setAspectForm({ ...aspectForm, amount: e.target.value })} required />
                    </div>
                </div>
                <fieldset className="grant-aspects">
                    <legend className="sheet-label">Аспект</legend>
                    {magic?.aspects.map((a) => (
                        <label key={a.key} className={`grant-aspect ${aspectForm.aspect === a.key ? 'is-selected' : ''}`} title={a.hint}>
                            <input type="radio" name="grant-aspect" value={a.key} checked={aspectForm.aspect === a.key}
                                onChange={() => setAspectForm({ ...aspectForm, aspect: a.key })} />
                            <AspectIcon aspect={a} size={30} />
                            <span>{a.nameRu}</span>
                        </label>
                    ))}
                </fieldset>
                {aspectForm.characterId && bag && magic && (
                    <p className="grant-bag">
                        <span className="sheet-label">В сумке:</span>{' '}
                        {bagEntries(bag, magic.aspects).map(({ aspect, count }) => (
                            <span key={aspect.key} className="grant-bag-item"><AspectIcon aspect={aspect} size={20} /> {count}</span>
                        ))}
                        {bagEntries(bag, magic.aspects).length === 0 && 'пусто'}
                    </p>
                )}
                <div className="tome-btn-row">
                    <button type="submit" className="tome-btn">Выдать аспекты</button>
                </div>
            </form>

            <form className="tome-form codex-form" onSubmit={(e) => send(e, '/api/admin/items/grant', {
                characterId: Number(itemForm.characterId), item: itemForm.item.trim(),
            }, () => setItemForm({ ...itemForm, item: '' }))}>
                <h3 className="tome-field-label">{t('adminItemGrant')}</h3>
                <p className="tome-subtitle">{t('adminItemGrantHint')}</p>
                <div className="tome-row">
                    <div className="tome-field">
                        <label>{t('adminSelectCharacter')}</label>
                        {characterSelect(itemForm.characterId, (v) => setItemForm({ ...itemForm, characterId: v }))}
                    </div>
                    <div className="tome-field" style={{ flex: 2 }}>
                        <label>{t('adminItemLabel')}</label>
                        <input type="text" value={itemForm.item} placeholder={t('adminItemPlaceholder')} required
                            onChange={(e) => setItemForm({ ...itemForm, item: e.target.value })} />
                    </div>
                </div>
                <div className="tome-btn-row">
                    <button type="submit" className="tome-btn">{t('adminItemGrantBtn')}</button>
                </div>
            </form>

            <form className="tome-form codex-form" onSubmit={(e) => send(e, '/api/admin/materials/grant', {
                characterId: Number(materialForm.characterId), material: materialForm.material.trim(),
            }, () => setMaterialForm({ ...materialForm, material: '' }))}>
                <h3 className="tome-field-label">{t('adminMaterialGrant')}</h3>
                <p className="tome-subtitle">{t('adminMaterialGrantHint')}</p>
                <div className="tome-row">
                    <div className="tome-field">
                        <label>{t('adminSelectCharacter')}</label>
                        {characterSelect(materialForm.characterId, (v) => setMaterialForm({ ...materialForm, characterId: v }))}
                    </div>
                    <div className="tome-field" style={{ flex: 2 }}>
                        <label>{t('adminMaterialLabel')}</label>
                        <input type="text" value={materialForm.material} placeholder={t('adminMaterialPlaceholder')} required
                            onChange={(e) => setMaterialForm({ ...materialForm, material: e.target.value })} />
                    </div>
                </div>
                <div className="tome-btn-row">
                    <button type="submit" className="tome-btn">{t('adminMaterialGrantBtn')}</button>
                </div>
            </form>
        </section>
    )
}
