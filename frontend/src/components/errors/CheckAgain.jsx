import { useState } from 'react'
import Button from '../ui/Button'
import { checkHealth } from '../../lib/health'

// «Проверить ещё раз» for «Контора закрыта»: asks /api/health instead of
// reloading the page. onOpen runs once the backend answers again.
export default function CheckAgain({ onOpen, variant = 'primary' }) {
    const [state, setState] = useState('idle') // idle | checking | still
    const check = async () => {
        setState('checking')
        if (await checkHealth()) {
            setState('idle')
            onOpen()
        } else {
            setState('still')
        }
    }
    return (
        <>
            <Button variant={variant} onClick={check} disabled={state === 'checking'}>
                {state === 'checking' ? 'Стучимся…' : 'Проверить ещё раз'}
            </Button>
            {state === 'still' && <span className="err-still" role="status">Пока закрыто.</span>}
        </>
    )
}
