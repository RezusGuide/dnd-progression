# Batyr's Hub

Your existing D&D Progression app (Spring Boot + React), extended into a
personal hub with six distinctly themed parts, real accounts, and one
simple access rule: **everything is public to view except Useful
Functions, which is yours alone; any account you hand out can create and
edit in the D&D and Minecraft sections.**

## The six parts

1. **Home** (`/`) — a full-bleed cinematic 3D scene (three.js): a stylized
   laptop resting on a brick pedestal. It opens tight on the glowing
   screen with a few words about you; scrolling pulls the camera back
   until the whole laptop is in view with five glowing portals floating
   around it — real, invisible, keyboard-accessible buttons routing to
   the other five sections.
2. **Portfolio** (`/portfolio`) — terminal-styled public page: bio,
   education, skills, and a project list. Publicly viewable; owner-editable.
3. **Media** (`/media`) — black & white page listing your socials, Boosty,
   and partners, plus a short "what I make" description. Publicly
   viewable; owner-editable.
4. **Useful Functions** (`/useful`) — cyberpunk-themed personal CRM:
   birthday tracking and a hand-rolled force-directed relationship graph
   (drag nodes, click one for full info). **Owner-only, full stop** — not
   even logged-in friends can see this page or its API.
5. **D&D** (`/characters`, `/campaigns`, …) — the original app, unchanged
   visually (tome/parchment theme). Publicly viewable now; any logged-in
   account can create/edit characters, campaigns, and run spell research.
6. **Minecraft** (`/minecraft`) — pixel-styled server info page: IP, version,
   status, a Google Drive link, and community polls about the server's
   future. Publicly viewable; any logged-in account can edit server info,
   create polls, and vote.

`backend/` is the Spring Boot (Java 21) API — deploys to **Railway**.
`frontend/` is the React + Vite app — deploys to **Vercel**. Both talk to
the same **Neon** Postgres database you already had.

## ⚠️ Rotate your Neon password first

`backend/src/main/resources/application.properties` used to contain your
real Neon connection string and password in plain text, and that file was
not gitignored — if this repo has ever been pushed anywhere, that password
is in your git history. It's been replaced with environment-variable
placeholders here, but you should still **rotate the password in the Neon
dashboard** (Project → Branches → your branch → Reset password) before
going further, then use the new one below. Same goes for `jwt.secret` —
generate a fresh random value for production rather than reusing the old
one.

## 1. Neon (database)

Grab the **pooled** connection string for `DATABASE_URL` from the
dashboard's Connection Details panel. The backend creates/updates its own
tables on boot (`spring.jpa.hibernate.ddl-auto=update`) — the new tables
(`about_profile`, `media_profile`, `media_links`, `people`, `connections`,
`polls`, `poll_options`, `poll_votes`, plus the `roles`/`user_roles` tables
from the access-control work) all get created automatically the first time
the new backend starts.

## 2. Local development

Backend:
```bash
cd backend
export DATABASE_URL="jdbc:postgresql://<your-neon-host>/neondb?sslmode=require"
export DATABASE_USERNAME="neondb_owner"
export DATABASE_PASSWORD="<new password>"
export JWT_SECRET="$(openssl rand -base64 32)"
./gradlew bootRun
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:8080` for the API; override with
`VITE_API_URL` (see `frontend/.env.example`). `npm install` will pull in
`three` (new dependency, for the Home page's 3D scene) alongside the
existing packages.

## 3. Deploy the backend to Railway

1. New Project → Deploy from GitHub repo → pick this repo, set **Root
   Directory** to `backend`. Railway will pick up `backend/Dockerfile`
   automatically (also see `backend/railway.json`).
2. Add environment variables on the service:
   - `DATABASE_URL` — Neon pooled connection string
   - `DATABASE_USERNAME`, `DATABASE_PASSWORD`
   - `JWT_SECRET` — a long random string
   - `CORS_ALLOWED_ORIGINS` — your Vercel URL once you have it
3. Deploy. Note the public URL Railway gives the service — the frontend
   needs it next.

## 4. Deploy the frontend to Vercel

1. New Project → import this repo, set **Root Directory** to `frontend`.
   Vercel auto-detects Vite.
2. Add environment variable `VITE_API_URL` = the Railway URL from step 3.
3. Deploy. `frontend/vercel.json` handles client-side routing so refreshing
   on e.g. `/portfolio` doesn't 404.
4. Once you have the Vercel URL, set `CORS_ALLOWED_ORIGINS` on Railway to
   it and redeploy the backend.

## 5. Claim ownership (first run only)

Register a normal account on the live site, then either visit `/admin`
while logged in and click **Claim Ownership**, or:

```bash
curl -X POST https://<railway-url>/api/admin/bootstrap-owner -H "Authorization: Bearer <your JWT>"
```

This only works once — it refuses if anyone already holds the `OWNER`
role. Owner unlocks Useful Functions, editing on the public sections, and
`/admin`.

## 6. Giving a friend a login

There's no per-friend role picking anymore — every account gets the same
standard access (D&D + Minecraft CRUD). From `/admin` (as owner), under
**Accounts**, fill in a username/email/password and hand that login to
your friend directly — they don't self-register. You can reset anyone's
password from the same page later if they lose it.

## How access control actually works

- **Public, no login**: viewing Portfolio, Media, D&D (characters,
  campaigns, spells), Minecraft (server info + polls), Downloads,
  Announcements, and Home. Enforced server-side in `SecurityConfig` (GET
  is `permitAll` on all of these), not just hidden in the UI.
- **Any logged-in account**: can create/edit/delete D&D characters,
  campaigns, and Minecraft info/polls (vote too). No section picking — one
  login, full D&D + Minecraft access.
- **Owner only**: Useful Functions (`/api/people/**`, entirely locked to
  the `OWNER` role, GET included), writes to Portfolio/Media/Announcements/
  Downloads, and `/admin`.
- The old per-role `sections` mechanism (`Role.sections`, `SECTION_*`
  authorities) is still there under the hood — `OWNER` has `sections:
  ["*"]`, `MEMBER` has `["dnd", "minecraft"]` and is auto-granted to every
  new account — but you shouldn't need to think about it day to day. The
  `/admin` page still has an "Advanced" custom-roles panel if you ever want
  finer-grained sections later.

## Known limitations / good next steps

- No email verification or password reset flow for self-registration (not
  that it matters much now — friends get accounts handed to them directly).
- No rate limiting on `/api/auth/login`, `/api/auth/register`, or voting.
- The Java backend couldn't be compiled in the sandbox this was built in
  (no outbound access to Maven Central / the Gradle Plugin Portal there),
  so it's been carefully hand-reviewed against your existing, working code
  rather than build-verified. Run `./gradlew build` locally (or just watch
  Railway's first deploy log) before you fully trust it.
- The frontend *was* built, linted, and smoke-tested in the sandbox
  (`npm run build`, `npx oxlint src`, and a headless Chromium pass over
  every route including a scroll-through of the 3D home page) — no console
  or runtime errors turned up.
- The reference photos/screenshots you sent weren't available to re-check
  against pixel-for-pixel; the five themes (terminal, black & white,
  cyberpunk, Minecraft, and the 3D laptop scene) were built from your
  written description and best judgment, not a literal recreation — treat
  them as a strong starting point to refine rather than a finished match.
- `frontend/src/components/SectionGate.jsx` is now unused (nothing routes
  through it anymore, since D&D/Minecraft are public) — harmless leftover,
  safe to delete whenever.
- Bio/tagline on the Home page and the Portfolio page both read from the
  same `AboutProfile` record (`/api/portfolio/profile`), so editing your
  bio once in Portfolio (as owner) updates both places.
