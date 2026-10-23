// Titles and texts for every error kind - shared by the full-page
// ErrorScreen and the compact ErrorBanner.
export const ERROR_COPY = {
    404: { caseNo: '404', title: 'Такого документа в архиве нет', text: 'Кот перерыл всю картотеку. Проверьте номер дела.' },
    403: { caseNo: '403', title: 'Допуск отклонён', text: 'Обратитесь в приёмную.' },
    500: { caseNo: '500', title: 'Котёл перегрелся', text: 'Механики уже бегут. Попробуйте позже.', retry: true },
    503: { caseNo: '503', title: 'Контора на техобслуживании', text: 'Санни скоро откроется.', retry: true },
    offline: { caseNo: '000', title: 'Пневмопочта не доходит', text: 'Проверьте соединение и повторите.', retry: true },
    // The browser is online, the backend (the GM's PC) is not.
    closed: { caseNo: '503', title: 'Контора закрыта', text: 'Сервер ГМа сейчас выключен, загляните позже.', retry: true, health: true },
    crash: { caseNo: '999', title: 'Документ порвался', text: 'Страница сломалась. Мы уже подклеиваем.', retry: true },
}
