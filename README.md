# Златопряды

Портал D&D-кампании «Златопряды»: игроки работают на вымышленную организацию «Санни инкорпорейтед», ведут листы персонажей, участвуют в кампаниях и изучают магию через исследования. Аккаунты создаёт ГМ, открытой регистрации нет.

Сейчас проект переделывается из бывшего «Batyr's Hub». План, решения и этапы описаны в [`docs/zlatopryady/ROADMAP.md`](docs/zlatopryady/ROADMAP.md).

## Стек

- `backend/`: Spring Boot (Java 21), JWT, JPA (`ddl-auto=update`). Деплой на **Railway**.
- `frontend/`: React + Vite. Деплой на **Vercel**.
- База: **Neon** Postgres.

> ⚠️ Пароль Neon когда-то лежал в истории git. Если ещё не сменили, смените его в панели Neon (Project → Branches → Reset password) и обновите везде.

## Локальный запуск

Бэкенд:
```bash
cd backend
export DATABASE_URL="jdbc:postgresql://<neon-host>/neondb?sslmode=require"
export DATABASE_USERNAME="neondb_owner"
export DATABASE_PASSWORD="<пароль>"
export JWT_SECRET="$(openssl rand -base64 32)"
./gradlew bootRun
```

Фронтенд:
```bash
cd frontend
npm install
npm run dev
```

Фронтенд по умолчанию ходит в API на `http://localhost:8080`. Адрес можно сменить через `VITE_API_URL` (см. `frontend/.env.example`).

## Деплой

**Railway (бэкенд).** Root Directory = `backend`, сборка по `backend/Dockerfile` (см. также `backend/railway.json`). Переменные окружения:
- `DATABASE_URL`: pooled-строка подключения Neon;
- `DATABASE_USERNAME`, `DATABASE_PASSWORD`;
- `JWT_SECRET`: длинная случайная строка;
- `CORS_ALLOWED_ORIGINS`: адрес фронтенда на Vercel.

**Vercel (фронтенд).** Root Directory = `frontend`, Vite определяется сам. Переменная `VITE_API_URL` = адрес бэкенда на Railway. `frontend/vercel.json` отвечает за клиентскую маршрутизацию.

## Доступ

- Без входа: просмотр объявлений, персонажей, кампаний и заклинаний.
- Любой аккаунт (роль `MEMBER`, выдаётся автоматически): создание и правка своих персонажей, кампании, исследования.
- ГМ (роль `OWNER`): объявления, `/admin` (аккаунты, выдача аспектов, подсказок, предметов). Первый владелец назначается один раз через «Claim Ownership» в `/admin` или `POST /api/admin/bootstrap-owner`.
