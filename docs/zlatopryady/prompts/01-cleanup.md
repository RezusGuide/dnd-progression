# Промпт 01: чистка проекта

Ты работаешь в репозитории `dnd-progression` (сейчас «Batyr's Hub»). Его превращают в портал D&D-кампании «Златопряды» с организацией «Санни инкорпорейтед». Это первый этап из десяти.

## Что планировщик добавил в репозиторий перед этим промптом

Эти файлы ещё не закоммичены, добавь их в первый коммит этапа:
- `docs/zlatopryady/ROADMAP.md`: главный план и решения. **Прочитай целиком перед работой**, особенно разделы 1–3 и 8.
- `docs/zlatopryady/TZ-v1.md`: исходное ТЗ. Где оно расходится с ROADMAP, верен ROADMAP.
- `docs/zlatopryady/assets/`: эмблема, маскоты (из SVG вырезаны метаданные C2PA) и `sunny-tokens.css`. На этом этапе их **не подключай**, они нужны для этапа 2.
- `docs/zlatopryady/prompts/01-cleanup.md`: этот промпт.

## Цель этапа

Удалить всё, что не связано с D&D, так, чтобы сайт собирался и D&D-часть работала как раньше. Дизайн на этом этапе не трогаем.

## 0. Подготовка

1. `git status` должен быть чистым, не считая `docs/zlatopryady/`. Если есть чужие незакоммиченные изменения, остановись и опиши их в отчёте.
2. Создай ветку `zlatopryady` от `main`.

## 1. Фронтенд: удалить

- Страницы: `Portfolio.jsx`, `Media.jsx`, `Gallery.jsx`, `UsefulFunctions.jsx`, `Minecraft.jsx`, `Downloads.jsx`.
- Компоненты: `RelationshipGraph.jsx`, `SectionGate.jsx` (он и так не используется).
- **Папку `frontend/src/assets/gallery/` целиком** вместе со всеми фото и README. Также `assets/react.svg` и `assets/vite.svg`, если на них никто не ссылается.
- Стили: `terminal.css`, `cyberpunk.css`, `minecraft.css`, `home3d.css`. Из `index.css` убери блок дизайн-системы «hub» (`--hub-*` и классы, которые используют только удалённые страницы). Стили D&D-страниц (`--parchment` и прочие, `beyond.css`) пока **оставь**.
- Маршруты в `App.jsx`: `/portfolio`, `/media`, `/gallery`, `/useful`, `/minecraft`, `/downloads`.
- Ссылки на эти разделы в `NavBar.jsx`.
- Зависимость `@supabase/supabase-js` из `package.json`: она нигде не используется. Обнови `package-lock.json` через `npm install`.
- Ключи переводов в `LangContext.jsx`, на которые больше никто не ссылается. Проверь grep'ом каждый ключ перед удалением. Сам переключатель языка пока оставь.

## 2. Фронтенд: временно заменить

- **`Home.jsx`**: сейчас это хаб, который читает `/api/portfolio/profile`. Замени на простую временную главную в существующем стиле D&D-страниц: заголовок «Санни инкорпорейтед», одна строка текста и кнопки «Персонажи», «Кампании», «Объявления». Настоящая главная будет на этапе 3.
- **Маршрут `*`**: сейчас ведёт редиректом на `/`. Замени на простую страницу «Такого документа в архиве нет» со ссылкой на главную. Анимация будет на этапе 2.

## 3. Бэкенд: удалить

- Контроллеры: `AboutController`, `PortfolioController`, `MediaController`, `PeopleController`, `MinecraftController`, `PollController`, `DownloadController`.
- Связанные сущности, репозитории, DTO и сервисы: `AboutProfile`, `PortfolioProject`, `MediaProfile`, `MediaLink`, `Person`, `Connection`, `MinecraftServer`, `Poll`, `PollOption`, `PollVote`, `DownloadLink`, `MinecraftPingService`, `PollService`, `MinecraftStatus`. Перед удалением проверь grep'ом, что ими не пользуется D&D-код.
- `DataSeeder`: убрать `ensureAboutProfile` и `ensureMinecraftServer`. `ensureRole` и `ensureAspectRecipes` пока **оставь**, магию переделаем на этапе 6.
- `SecurityConfig`: убрать правила для `/api/portfolio/**`, `/api/media/**`, `/api/people/**`, `/api/minecraft/**`, `/api/polls/**`, `/api/downloads/**`. Правила для auth, characters, campaigns, spells, announcements, admin оставь с теми же правами. Если `SECTION_ALL` больше нигде не нужен, кроме роли OWNER, оставь как есть, упрощение ролей будет позже.
- **Базу данных не трогай:** не удаляй таблицы и не пиши миграции. Список осиротевших таблиц приложи к отчёту.

## 4. Что должно остаться рабочим

Вход и выход, восстановление пароля, `/account`, `/admin` (создание аккаунтов, выдача аспектов, подсказок, предметов), персонажи и лист персонажа, кампании, исследования и крафт (старая магия пока живёт), объявления.

## 5. README

Перепиши `README.md` коротко: что это за проект теперь (портал кампании «Златопряды»), стек, локальный запуск, деплой (Railway + Vercel + Neon, переменные окружения), ссылка на `docs/zlatopryady/ROADMAP.md`. Предупреждение о ротации пароля Neon сохрани одной строкой.

## 6. Проверка

1. `cd backend && ./gradlew build`: должно пройти.
2. `cd frontend && npm run build && npm run lint`: без ошибок.
3. Grep по `frontend/src` и `backend/src` на `portfolio|gallery|minecraft|useful|people|poll|download|supabase|media` (без учёта регистра). Остаться могут только D&D-совпадения, объясни каждое в отчёте.
4. Если можешь запустить локально: зайди под тестовым аккаунтом, открой список персонажей, лист, исследование, админку. Если запустить нельзя (нет переменных БД), напиши об этом.

## 7. Коммиты

Два коммита в ветке `zlatopryady`:
1. `docs: add Zlatopryady roadmap, TZ and Sunny assets`
2. `Remove non-D&D sections (portfolio, media, gallery, CRM, minecraft, downloads)`

**Не пушить. Историю git не переписывать.**

## 8. Отчёт

- `git diff --stat main..zlatopryady`.
- Что удалено, что заменено.
- Осиротевшие таблицы БД.
- Неожиданности: например, что-то из D&D зависело от удалённого кода.
- Вопросы к планировщику.
