import { createContext, useContext } from 'react'

// Russian only - the site is Russian-language (see docs/zlatopryady/ROADMAP.md).
// The t(key) API stays so call sites never have to change. Tone, wording
// and D&D terms follow docs/zlatopryady/copy.md: capital letter on the
// first word only (Oswald's upper case comes from CSS), "пропуск" = account,
// "допуск" = level permission.
const translations = {
    ru: {
        // Common
        leave: 'Сдать пропуск',
        email: 'Почта',
        password: 'Пароль',
        choose: '— Выбрать —',
        cancel: 'Отмена',
        save: 'Сохранить',
        delete: 'Удалить',
        level: 'Уровень',
        class: 'Класс',
        race: 'Раса',
        campaign: 'Кампания',
        noCampaign: '— Без кампании —',
        readOnlyNotice: 'Это дело вам не выдано. Можно только смотреть.',
        // Личные дела
        vaultSignInHint: 'Предъявите пропуск, чтобы увидеть свои дела. Чужое дело открывается по ссылке.',
        forgeNewCharacter: 'Завести личное дело',
        forgeALegend: 'Новое личное дело',
        characterName: 'Имя',
        nameYourHero: 'Имя сотрудника',
        backstory: 'Предыстория',
        backstoryPlaceholder: 'Кем был сотрудник до найма…',
        sealInBlood: 'Подшить в дело',
        failedCreate: 'Не подшилось. Повторите.',
        eraseConfirm: 'Удалить личное дело? Отменить нельзя.',
        // Кампании
        newCampaign: 'Открыть кампанию',
        campaignName: 'Название кампании',
        campaignDesc: 'Описание',
        createCampaign: 'Открыть кампанию',
        noCampaigns: 'Кампаний нет. Ждём распоряжения ГМа.',
        viewCampaign: 'Состав',
        owner: 'Ведёт',
        failedCampaign: 'Не подшилось. Повторите.',
        campaignRoster: 'Состав кампании',
        backToCampaigns: '← Назад',
        materials: 'Материалы и инвентарь',
        saveMaterials: 'Сохранить',
        noCharacters: 'В этой кампании пока нет сотрудников.',
        // Used outside the sheet; the sheet itself has its texts inline
        sheetShareLink: 'Поделиться ссылкой',
        // Пульт ГМ: выдачи
        adminItemGrant: 'Выдать предмет',
        adminItemGrantHint: 'Добавляет строку в снаряжение персонажа. Существующие записи не трогаются.',
        adminItemLabel: 'Предмет',
        adminItemPlaceholder: 'Зелье лечения',
        adminItemGrantBtn: 'Выдать предмет',
        adminMaterialGrant: 'Выдать материал',
        adminMaterialGrantHint: 'Добавляет строку в «Материалы и инвентарь»: реагенты и расходники, отдельно от снаряжения.',
        adminMaterialLabel: 'Материал',
        adminMaterialPlaceholder: '3× папирус, 1× кристалл',
        adminMaterialGrantBtn: 'Выдать материал',
        adminSelectCharacter: 'Персонаж',
        adminGranted: 'Одобрено. Печать поставлена.',
        // Nav
        navHome: 'Приёмная',
        navCharacters: 'Личные дела',
        navChest: 'Сундучок',
        navCampaigns: 'Кампании',
        navAnnouncements: 'Объявления',
        navCalendar: 'Календарь',
        navWorld: 'Мир',
        navDreams: 'Сны',
        navMore: 'Ещё',
        navAdmin: 'Пульт ГМ',
        navToggleMenu: 'Меню',
        navLogin: 'Предъявить пропуск',
        navLogout: 'Сдать пропуск',
        navAccount: 'Мой пропуск',
        // Пульт ГМ
        adminTitle: 'Пульт ГМ',
        adminSubtitle: 'Пропуска, выдачи и решения.',
        adminBecomeOwner: 'Стать ГМ',
        adminBecomeOwnerHint: 'ГМ ещё не назначен. Если это вы, подтвердите.',
        adminUsers: 'Сотрудники',
        adminAccounts: 'Пропуска',
        adminAccountsHint: 'Оформите пропуск сами и передайте его игроку. С любым пропуском видно всё, править можно свои дела.',
        adminNewAccount: 'Новый пропуск',
        adminAccUsername: 'Имя',
        adminAccEmail: 'Почта',
        adminAccPassword: 'Пароль',
        adminCreateAccount: 'Выдать пропуск',
        adminAccountCreated: 'Пропуск выдан. Передайте почту и пароль игроку.',
        adminResetPassword: 'Новый пароль',
        adminNewPassword: 'Новый пароль',
        adminResetPasswordBtn: 'Задать пароль',
        adminPasswordReset: 'Пароль обновлён.',
    }
}

const LangContext = createContext(null)

export function LangProvider({ children }) {
    const t = (key) => translations.ru[key] || key

    return (
        <LangContext.Provider value={{ t }}>
            {children}
        </LangContext.Provider>
    )
}

export function useLang() {
    return useContext(LangContext)
}
