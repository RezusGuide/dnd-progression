# Златопряды

Портал D&D-кампании «Златопряды»: игроки работают на вымышленную организацию «Санни инкорпорейтед», ведут листы персонажей, исследуют магию, получают посылки, ходят в сны и подбирают время сессий. Аккаунты создаёт ГМ, открытой регистрации нет.

План, решения и этапы: [`docs/zlatopryady/ROADMAP.md`](docs/zlatopryady/ROADMAP.md). Тексты интерфейса: [`docs/zlatopryady/copy.md`](docs/zlatopryady/copy.md). Выпуск: [`docs/zlatopryady/RELEASE.md`](docs/zlatopryady/RELEASE.md).

## Разделы сайта

- **Приёмная** (`/`): свои личные дела, заявки, ближайшая сессия, новое в архиве, объявления.
- **Личные дела** (`/characters`): лист персонажа 5e, мастер создания с допуском ГМ, руны и потолок уровня.
- **Исследования**: стол исследований (аспекты на шестигранной сетке), соединение аспектов, записки на одобрение ГМ.
- **Сундучок** (`/chest`): посылки от ГМ (аспекты, монеты, предметы, загадка), опись предметов, разбор на аспекты.
- **Сны** (`/dreams`): дела-сны, трекер погружения, форма во сне.
- **Кампании**, **Объявления**.
- **Календарь** (`/calendar`): своё время по своему поясу, подбор сессии, `.ics`.
- **Мир** (`/world`): энциклопедия, статьи открываются по ходу игры.
- **Пульт ГМ** (`/gm`, только ГМ): входящие, сотрудники, выдачи, пропуска, справочник, архив, сны, сундучок, календарь, шпаргалка с калькулятором боя, журнал.

## Стек

- `backend/`: Spring Boot 4 (Java 21), JWT, JPA (`ddl-auto=update`). Деплой на **Railway** по `backend/Dockerfile`.
- `frontend/`: React 19 + Vite, react-markdown. Деплой на **Vercel**.
- База: **Neon** Postgres. Тесты бэкенда идут на H2 в памяти и базу не трогают.

## Локальный запуск

Бэкенд (нужна своя база Postgres; переменные можно держать в `backend/src/main/resources/application-local.properties`, он в `.gitignore` и в jar не попадает):
```bash
cd backend
export DATABASE_URL="jdbc:postgresql://<host>/<db>?sslmode=require"
export DATABASE_USERNAME="<user>"
export DATABASE_PASSWORD="<пароль>"
export JWT_SECRET="$(openssl rand -base64 48)"
./gradlew bootRun
```

Фронтенд:
```bash
cd frontend
npm install
npm run dev
```

Фронтенд по умолчанию ходит в API на `http://localhost:8080`. Адрес меняется через `VITE_API_URL` (см. `frontend/.env.example`).

Проверки: `./gradlew build` в `backend/`; `npm test`, `npm run lint`, `npm run build` в `frontend/`.

## Деплой

Подробно, с переменными и откатом: [`docs/zlatopryady/RELEASE.md`](docs/zlatopryady/RELEASE.md).

- **Railway:** Root Directory = `backend`. Переменные: `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `JWT_SECRET` (Base64), `CORS_ALLOWED_ORIGINS`, `SITE_URL`, `SPRING_PROFILES_ACTIVE=prod`. С профилем `prod` бэкенд не стартует без своего `JWT_SECRET` или с CORS на `localhost`.
- **Vercel:** Root Directory = `frontend`, переменная `VITE_API_URL` = адрес бэкенда. `frontend/vercel.json` отвечает за клиентскую маршрутизацию.

## Доступ

- Без входа: Приёмная для гостей, объявления, персонажи и кампании для просмотра.
- Сотрудник (роль `MEMBER`, выдаётся каждому пропуску): свои персонажи, исследования, Сундучок, календарь, Мир, Сны.
- ГМ (роль `OWNER`): всё, плюс Пульт ГМ и объявления. Других ролей нет.
- Первый ГМ назначается один раз: войти и открыть `/admin?setup=1` → «Стать ГМ». Пока ГМ не назначен, только так.
