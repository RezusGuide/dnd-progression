import { createContext, useContext, useState } from 'react'

const translations = {
    en: {
        // Nav
        leave: 'Leave',
        // Login
        enterRealm: 'Enter the Realm',
        signInVault: "Sign in to your adventurer's vault",
        email: 'Email',
        password: 'Password',
        beginJourney: 'Begin Journey',
        noAccount: 'No account yet?',
        registerName: 'Register your name',
        invalidCredentials: 'Invalid email or password',
        // Register
        inscribeName: 'Inscribe Your Name',
        beginLegend: 'Begin your legend',
        adventurerName: 'Adventurer Name',
        nameInAnnals: 'Name your hero',
        sealPact: 'Seal the Pact',
        alreadyBound: 'Already bound?',
        returnGate: 'Return to the gate',
        registrationFailed: 'Registration failed',
        // Characters
        adventurersVault: "The Adventurer's Vault",
        forgeNewCharacter: 'Forge New Character',
        forgeALegend: 'Forge a Legend',
        characterName: 'Character Name',
        nameYourHero: 'Name your hero',
        class: 'Class',
        race: 'Race',
        backstory: 'Backstory',
        backstoryPlaceholder: 'Who were you before the adventure began...',
        choose: '— Choose —',
        cancel: 'Cancel',
        sealInBlood: 'Seal in Blood',
        failedCreate: 'Failed to create character',
        eraseConfirm: 'Erase this soul from the annals?',
        level: 'Level',
        campaign: 'Campaign',
        noCampaign: '— No Campaign —',
        // Campaigns
        campaignChronicles: 'Campaign Chronicles',
        newCampaign: 'Begin New Campaign',
        campaignName: 'Campaign Name',
        campaignDesc: 'Description',
        createCampaign: 'Inscribe Campaign',
        noCampaigns: 'No campaigns yet. Begin one above.',
        viewCampaign: 'View Roster',
        owner: 'Keeper',
        failedCampaign: 'Failed to create campaign',
        // Campaign View
        campaignRoster: 'Campaign Roster',
        backToCampaigns: '← Chronicles',
        materials: 'Materials & Inventory',
        saveMaterials: 'Save',
        noCharacters: 'No characters have joined this campaign yet.',
        // Character Sheet
        mySheet: 'Character Sheet',
        spellbook: 'Spellbook',
        skills: 'Skills & Abilities',
        inventory: 'Inventory & Materials',
        noSpells: 'No spells researched yet.',
        noSkills: 'No skills unlocked yet.',
        noMaterials: 'No materials assigned yet.',
        backToVault: '← Vault',
    },
    ru: {
        // Nav
        leave: 'Выйти',
        // Login
        enterRealm: 'Войти в Мир',
        signInVault: 'Войдите в хранилище искателя приключений',
        email: 'Почта',
        password: 'Пароль',
        beginJourney: 'Начать Путь',
        noAccount: 'Нет аккаунта?',
        registerName: 'Зарегистрироваться',
        invalidCredentials: 'Неверная почта или пароль',
        // Register
        inscribeName: 'Впишите Своё Имя',
        beginLegend: 'Начните свою легенду',
        adventurerName: 'Имя Искателя',
        nameInAnnals: 'Назовите героя',
        sealPact: 'Скрепить Печатью',
        alreadyBound: 'Уже зарегистрированы?',
        returnGate: 'Вернуться к воротам',
        registrationFailed: 'Ошибка регистрации',
        // Characters
        adventurersVault: 'Хранилище Искателей',
        forgeNewCharacter: 'Создать Персонажа',
        forgeALegend: 'Выковать Легенду',
        characterName: 'Имя Персонажа',
        nameYourHero: 'Назовите героя',
        class: 'Класс',
        race: 'Раса',
        backstory: 'Предыстория',
        backstoryPlaceholder: 'Кем вы были до начала приключения...',
        choose: '— Выбрать —',
        cancel: 'Отмена',
        sealInBlood: 'Скрепить Кровью',
        failedCreate: 'Не удалось создать персонажа',
        eraseConfirm: 'Стереть эту душу из анналов?',
        level: 'Уровень',
        campaign: 'Кампания',
        noCampaign: '— Без Кампании —',
        // Campaigns
        campaignChronicles: 'Хроники Кампаний',
        newCampaign: 'Начать Кампанию',
        campaignName: 'Название Кампании',
        campaignDesc: 'Описание',
        createCampaign: 'Вписать Кампанию',
        noCampaigns: 'Кампаний пока нет. Начните одну выше.',
        viewCampaign: 'Смотреть Состав',
        owner: 'Хранитель',
        failedCampaign: 'Не удалось создать кампанию',
        // Campaign View
        campaignRoster: 'Состав Кампании',
        backToCampaigns: '← Хроники',
        materials: 'Материалы и Инвентарь',
        saveMaterials: 'Сохранить',
        noCharacters: 'В этой кампании пока нет персонажей.',
        // Character Sheet
        mySheet: 'Лист Персонажа',
        spellbook: 'Книга Заклинаний',
        skills: 'Навыки и Умения',
        inventory: 'Инвентарь и Материалы',
        noSpells: 'Заклинания ещё не исследованы.',
        noSkills: 'Навыки ещё не разблокированы.',
        noMaterials: 'Материалы ещё не назначены.',
        backToVault: '← Хранилище',
    }
}

const LangContext = createContext(null)

export function LangProvider({ children }) {
    const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en')

    const toggleLang = () => {
        const next = lang === 'en' ? 'ru' : 'en'
        localStorage.setItem('lang', next)
        setLang(next)
    }

    const t = (key) => translations[lang][key] || key

    return (
        <LangContext.Provider value={{ lang, toggleLang, t }}>
            {children}
        </LangContext.Provider>
    )
}

export function useLang() {
    return useContext(LangContext)
}