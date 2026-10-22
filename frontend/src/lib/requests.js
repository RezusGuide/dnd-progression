// Human title of an admission request.
export function requestTitle(r) {
    if (r.type === 'CREATION') return 'Новое личное дело'
    return `Повышение до ${r.requestedLevel} уровня`
}
