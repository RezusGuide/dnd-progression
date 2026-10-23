import { describe, expect, it } from 'vitest'
import { classifyApiError, networkKind } from './apiErrors'
import { ERROR_COPY } from '../components/errors/errorCopy'

describe('which error text to show', () => {
    it('no answer: offline browser vs the GM\'s PC switched off', () => {
        expect(networkKind(false)).toBe('offline')
        expect(networkKind(true)).toBe('closed')
        expect(classifyApiError({ message: 'Network Error' }, false)).toBe('offline')
        expect(classifyApiError({ message: 'Network Error' }, true)).toBe('closed')
    })
    it('the tunnel answering 502 / 503 / 504 means closed too', () => {
        for (const status of [502, 503, 504]) {
            expect(classifyApiError({ response: { status } }, true)).toBe('closed')
        }
        expect(classifyApiError({ response: { status: 500 } }, true)).toBe(500)
        expect(classifyApiError({ response: { status: 404 } }, true)).toBeNull()
        expect(classifyApiError({ code: 'ERR_CANCELED' }, true)).toBeNull()
    })
    it('the texts', () => {
        expect(ERROR_COPY.offline.title).toBe('Пневмопочта не доходит')
        expect(`${ERROR_COPY.closed.title}. ${ERROR_COPY.closed.text}`).toBe('Контора закрыта. Сервер ГМа сейчас выключен, загляните позже.')
    })
})
