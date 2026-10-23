# Бэкенд на домашнем ПК

Сайт (фронтенд) остаётся на Vercel, база — в Neon. Бэкенд работает на вашем настольном ПК, пока тот включён, а в интернет его выводит **Tailscale Funnel**: постоянный адрес вида `https://<пк>.<tailnet>.ts.net`, без своего домена и без проброса портов на роутере.

Все команды ниже — в PowerShell на **ПК-сервере**, из папки с репозиторием, если не сказано иначе. Скрипты лежат в `deploy\home\`.

## 0. Получить код на ПК

Ветка `zlatopryady` уже есть на GitHub. Пока она не смержена в `main`, прод на Vercel не меняется.

```powershell
git clone https://github.com/RezusGuide/dnd-progression.git
cd dnd-progression
git checkout zlatopryady
```

После мержа в `main`: `git checkout main`, дальше обновляться через `git pull`.

На ПК нужна только Java. Node.js не нужен: фронтенд собирает Vercel.

Разрешить запуск своих скриптов (один раз, только для вашего пользователя):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## 1. Проверить ПК и установить недостающее

```powershell
.\deploy\home\check-env.ps1
```

Скрипт ничего не ставит, только пишет, чего не хватает:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
winget install Tailscale.Tailscale
```

После установки Tailscale войдите в свой аккаунт (значок Tailscale в трее → **Log in**). Запустите `check-env.ps1` ещё раз: Java 21 и Tailscale должны найтись, порт 8080 — быть свободным.

## 2. Разрешить Funnel в Tailscale

Порядок сверен с документацией Tailscale на 23.10.2026: [Funnel](https://tailscale.com/kb/1223/funnel), [HTTPS](https://tailscale.com/kb/1153/enabling-https), [команда funnel](https://tailscale.com/kb/1311/tailscale-funnel).

1. В админке Tailscale откройте [**DNS**](https://console.tailscale.com/admin/dns): включите **MagicDNS**, если выключен, и в разделе **HTTPS Certificates** нажмите **Enable HTTPS**. Tailscale предупредит, что имя ПК и сети попадут в публичный журнал сертификатов. Это нормально: там видно только имя вида `pc.tail1234.ts.net`, не ваш IP.
2. Откройте [**Access controls**](https://console.tailscale.com/admin/acls), раздел Funnel → **Add Funnel to policy**. В политику добавится:
   ```json
   "nodeAttrs": [
     { "target": ["autogroup:member"], "attr": ["funnel"] }
   ]
   ```
   Можно пропустить этот шаг: при первом `funnel.ps1` Tailscale сам предложит разрешить Funnel по ссылке.

## 3. Заполнить настройки

Файл настроек лежит **вне репозитория**: `%LOCALAPPDATA%\zlatopryady\.env.home`.

```powershell
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\zlatopryady" | Out-Null
Copy-Item .\deploy\home\.env.home.example "$env:LOCALAPPDATA\zlatopryady\.env.home"
notepad "$env:LOCALAPPDATA\zlatopryady\.env.home"
```

Что вписать:
- `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` — из Neon (**Connection details**, pooled). Адрес в формате `jdbc:postgresql://…/neondb?sslmode=require`.
- `JWT_SECRET` — Base64 от 48 случайных байт. Без openssl, прямо в PowerShell:
  ```powershell
  $b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
  ```
  Скопируйте результат в файл. Значение из `application.properties` не подойдёт: с профилем `prod` бэкенд с ним не запустится.
- `CORS_ALLOWED_ORIGINS` и `SITE_URL` — адрес сайта на Vercel, например `https://zlatopryady.vercel.app` (без `/` в конце).
- `SPRING_PROFILES_ACTIVE=prod,home` — оставить как есть.

Файл никому не пересылайте и не кладите в репозиторий.

## 4. Собрать и запустить

```powershell
.\deploy\home\build.ps1
.\deploy\home\run.ps1
```

`build.ps1` собирает jar и кладёт его в `%LOCALAPPDATA%\zlatopryady\app\backend.jar`. Предыдущая версия сохраняется как `backend.prev.jar`.

`run.ps1` держит окно открытым, пока сервер работает. Если бэкенд упадёт, скрипт перезапустит его через 10 секунд, но не больше 5 раз за 5 минут: дальше он останавливается и пишет причину в лог.

Второй `run.ps1` (например, окно поверх задачи Планировщика) не запустится: скрипт скажет, что бэкенд уже работает, и выйдет. То же, если порт 8080 занят. Если в `.env.home` осталась заглушка из шаблона (что-то в `< >`), `run.ps1` и `check-env.ps1` назовут её: «В настройках осталась заглушка из шаблона: {ИМЯ}».

Во втором окне PowerShell:

```powershell
.\deploy\home\status.ps1
```

Должно быть «работает», `/api/health` → `ok`, база → `ok`. Логи: `%LOCALAPPDATA%\zlatopryady\logs\backend.log` (сам сервер) и `run.log` (запуски и перезапуски).

При **первом** старте с новой версией сверьте лог с [RELEASE.md](RELEASE.md), раздел 3: `World: seeded 12 articles`, `Backfilled campaign rules…`, и никаких ошибок `NOT NULL`. До первого запуска сделайте бэкап Neon (RELEASE.md, раздел 1).

## 5. Открыть доступ из интернета

```powershell
.\deploy\home\funnel.ps1
```

Скрипт включает Funnel в фоне (переживает перезагрузку) и печатает публичный адрес. Запишите его. Проверьте с телефона без Wi-Fi: `https://<пк>.<tailnet>.ts.net/api/health` → `{"status":"ok",…}`.

Закрыть доступ: `.\deploy\home\funnel-off.ps1`.

## 6. Связать с Vercel

1. Vercel → проект → **Settings** → **Environment Variables**: `VITE_API_URL` = адрес из шага 5 (без `/` в конце).
2. **Deployments** → последний → **Redeploy**: переменные Vite вшиваются при сборке.
3. В `.env.home` должны стоять `CORS_ALLOWED_ORIGINS` и `SITE_URL` = адрес сайта на Vercel (шаг 3). Если меняли — перезапустите бэкенд (раздел «Обновление сайта»).

## 7. Автозапуск

```powershell
.\deploy\home\install-autostart.ps1
```

Создаёт задачу «Zlatopryady backend» в Планировщике: при входе в Windows `run.ps1` стартует скрыто, от вашего пользователя. Запустить сразу, не перезаходя:

```powershell
Start-ScheduledTask -TaskName 'Zlatopryady backend'
```

Убрать автозапуск: `.\deploy\home\uninstall-autostart.ps1`.

## 8. Электропитание

**Параметры → Система → Питание** (на некоторых ПК «Питание и батарея») → «Переводить в спящий режим» при питании от сети: **Никогда**. Экран можно гасить, ПК — нет. Спящий ПК = «Контора закрыта».

## 9. Обновление сайта

```powershell
git pull
.\deploy\home\stop.ps1
.\deploy\home\build.ps1
Start-ScheduledTask -TaskName 'Zlatopryady backend'   # или .\deploy\home\run.ps1
.\deploy\home\status.ps1
```

`stop.ps1` останавливает все `run.ps1` (и в окне, и из Планировщика: те по флагу выходят сами, а не перезапускают сервер) и все процессы Java с `backend.jar`, а в конце проверяет, что ничего не осталось.

**Откат на прошлую версию:**

```powershell
.\deploy\home\stop.ps1
Copy-Item "$env:LOCALAPPDATA\zlatopryady\app\backend.prev.jar" "$env:LOCALAPPDATA\zlatopryady\app\backend.jar" -Force
Start-ScheduledTask -TaskName 'Zlatopryady backend'
```

## 10. Безопасность

- Наружу открыт только бэкенд и только через Funnel. Порты на роутере не открываются.
- Бэкенд слушает только `127.0.0.1` (профиль `home`): другие устройства в домашней сети до него напрямую не достучатся.
- Домашний IP скрыт за Tailscale: снаружи виден только адрес `…ts.net`.
- Вход защищён от перебора: после 5 неверных паролей почта блокируется на 10 минут.
- Держите Windows обновлённой и не запускайте на этом ПК программы и скрипты от незнакомых людей: у этой машины есть ключи от базы.

## 11. Если ПК выключен

Сайт на Vercel открывается, но вместо данных показывает «Контора закрыта. Сервер ГМа сейчас выключен, загляните позже.» с кнопкой «Проверить ещё раз». Данные в Neon не страдают: когда ПК включится, бэкенд стартует сам (шаг 7), Funnel поднимется сам (шаг 5).

## 12. Вернуться на облачный хостинг

Те же переменные из `.env.home` подходят для Render или Railway: сервис собирается по `backend/Dockerfile`. Профиль поставьте `SPRING_PROFILES_ACTIVE=prod` (без `home`: в облаке слушать нужно все адреса, а лог — в консоль). После этого поменяйте `VITE_API_URL` на Vercel на новый адрес и выключите Funnel (`funnel-off.ps1`) и автозапуск (`uninstall-autostart.ps1`).

## Первый боевой запуск: по порядку

1. Бэкап Neon (RELEASE.md, раздел 1).
2. Шаги 0–3 этой инструкции.
3. `build.ps1`, `run.ps1`, сверка лога старта (шаг 4).
4. `funnel.ps1`, проверка `https://…ts.net/api/health` снаружи (шаг 5), например `curl.exe -s -H "Cache-Control: no-cache" https://…ts.net/api/health`.
5. Vercel (шаг 6), смоук-тест (RELEASE.md, раздел 6).
6. Автозапуск и электропитание (шаги 7–8).
