# Запускает бэкенд и перезапускает его, если он упал.
# Настройки берутся из %LOCALAPPDATA%\zlatopryady\.env.home и ставятся только
# для этого процесса (в системе ничего не меняется, пароли не печатаются).
# Перезапуск через 10 секунд, не больше 5 раз за 5 минут; потом остановка
# с записью в %LOCALAPPDATA%\zlatopryady\logs\run.log.
# Второй экземпляр не запустится: run.ps1 держит mutex и проверяет порт 8080.
# Остановка - только через stop.ps1: он ставит флаг, и run.ps1 выходит, а не
# перезапускает сервер.
#   powershell -ExecutionPolicy Bypass -File deploy\home\run.ps1

param(
    [string]$EnvFile,
    [string]$Jar,
    [int]$RestartDelaySeconds = 10,
    [int]$MaxRestarts = 5,
    [int]$WindowMinutes = 5
)

. "$PSScriptRoot\_common.ps1"
$runStarted = Get-Date
if (-not $EnvFile) { $EnvFile = $DefaultEnvFile }
if (-not $Jar) { $Jar = $JarPath }

# Один экземпляр на ПК: Global\ виден из окна PowerShell и из задачи
# Планировщика; если Global\ недоступен, хватит Local\ (та же сессия).
$mutex = $null
foreach ($scope in 'Global', 'Local') {
    try { $mutex = New-Object System.Threading.Mutex($false, "$scope\$MutexName"); break } catch { $mutex = $null }
}
$owned = $false
try { $owned = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $owned = $true }
if (-not $owned) {
    Write-RunLog 'Бэкенд уже запущен другим run.ps1 (окно или задача Планировщика). Второй экземпляр не запускаю. Состояние: status.ps1, остановка: stop.ps1.'
    exit 1
}

$pidFile = $null
try {
    if (Test-PortBusy) {
        Write-RunLog "Порт $Port уже занят (см. check-env.ps1). Бэкенд не запускаю."
        exit 1
    }
    if (Get-BackendProcess) {
        Write-RunLog 'Бэкенд уже работает без run.ps1 (см. status.ps1). Второй экземпляр не запускаю.'
        exit 1
    }
    if (-not (Test-Path $Jar)) { throw "Нет $Jar. Сначала соберите: deploy\home\build.ps1" }
    $java = Find-Java
    if (-not $java) { throw 'Не найдена Java 21. Установите: winget install EclipseAdoptium.Temurin.21.JDK' }

    $vars = Read-EnvFile $EnvFile
    $stubs = @(Find-Placeholders $vars)
    if ($stubs.Count) {
        $stubs | ForEach-Object { Write-RunLog "В настройках осталась заглушка из шаблона: $_" }
        exit 1
    }
    foreach ($key in $vars.Keys) {
        [Environment]::SetEnvironmentVariable($key, $vars[$key], 'Process')
    }
    # Печатаем только имена, без значений.
    Write-RunLog ("Настройки из {0}: {1}" -f $EnvFile, ($vars.Keys -join ', '))

    # Свой PID - чтобы stop.ps1 нашёл и этот run.ps1, даже если он запущен прямо в окне.
    New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
    # Флаг от прошлой остановки убираем, а поставленный уже после нашего старта - нет.
    if ((Test-Path $StopFlag) -and (Get-Item $StopFlag).LastWriteTime -lt $runStarted) {
        Remove-Item $StopFlag -Force -ErrorAction SilentlyContinue
    }
    $pidFile = Join-Path $RunDir "$PID.pid"
    Set-Content -Path $pidFile -Value (Get-Date -Format s) -Encoding ASCII

    $restarts = New-Object System.Collections.Generic.List[datetime]
    while ($true) {
        if (Test-Path $StopFlag) {
            Write-RunLog 'Остановка через stop.ps1 до запуска сервера.'
            break
        }
        Write-RunLog ("Старт: Java {0}, {1}" -f $java.Major, $Jar)
        $started = Get-Date
        & $java.Exe '-XX:MaxRAMPercentage=50' '-XX:+UseSerialGC' '-jar' $Jar
        $code = $LASTEXITCODE
        $ranFor = [int]((Get-Date) - $started).TotalSeconds

        if (Test-Path $StopFlag) {
            Write-RunLog "Бэкенд остановлен через stop.ps1 (работал $ranFor с). Перезапуск не нужен."
            break
        }
        if ($code -eq 0) {
            Write-RunLog "Бэкенд остановлен штатно (код 0, работал $ranFor с). Перезапуск не нужен."
            break
        }

        $now = Get-Date
        $restarts.Add($now)
        $recent = @($restarts | Where-Object { $_ -gt $now.AddMinutes(-$WindowMinutes) })
        if ($recent.Count -gt $MaxRestarts) {
            Write-RunLog "Бэкенд падает слишком часто (падений за $WindowMinutes мин: $($recent.Count), последний код $code). Останавливаюсь: смотрите $AppLog"
            exit 2
        }
        Write-RunLog "Бэкенд упал (код $code, работал $ranFor с). Перезапуск через $RestartDelaySeconds с ($($recent.Count) из $MaxRestarts за $WindowMinutes мин)."
        # Ждём по секунде, чтобы stop.ps1 мог прервать и паузу.
        for ($i = 0; $i -lt $RestartDelaySeconds; $i++) {
            if (Test-Path $StopFlag) { break }
            Start-Sleep -Seconds 1
        }
        if (Test-Path $StopFlag) {
            Write-RunLog 'Остановка через stop.ps1 во время паузы перед перезапуском.'
            break
        }
    }
} finally {
    if ($pidFile) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }
    if ($owned) { try { $mutex.ReleaseMutex() } catch { } }
    if ($mutex) { $mutex.Dispose() }
}
