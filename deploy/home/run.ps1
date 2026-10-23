# Запускает бэкенд и перезапускает его, если он упал.
# Настройки берутся из %LOCALAPPDATA%\zlatopryady\.env.home и ставятся только
# для этого процесса (в системе ничего не меняется, пароли не печатаются).
# Перезапуск через 10 секунд, не больше 5 раз за 5 минут; потом остановка
# с записью в %LOCALAPPDATA%\zlatopryady\logs\run.log.
#   powershell -ExecutionPolicy Bypass -File deploy\home\run.ps1

param(
    [string]$EnvFile,
    [string]$Jar,
    [int]$RestartDelaySeconds = 10,
    [int]$MaxRestarts = 5,
    [int]$WindowMinutes = 5
)

. "$PSScriptRoot\_common.ps1"
if (-not $EnvFile) { $EnvFile = $DefaultEnvFile }
if (-not $Jar) { $Jar = $JarPath }

if (-not (Test-Path $Jar)) { throw "Нет $Jar. Сначала соберите: deploy\home\build.ps1" }
$java = Find-Java
if (-not $java) { throw 'Не найдена Java 21. Установите: winget install EclipseAdoptium.Temurin.21.JDK' }

$vars = Read-EnvFile $EnvFile
foreach ($key in $vars.Keys) {
    [Environment]::SetEnvironmentVariable($key, $vars[$key], 'Process')
}
# Печатаем только имена, без значений.
Write-RunLog ("Настройки из {0}: {1}" -f $EnvFile, ($vars.Keys -join ', '))

if (Get-BackendProcess) {
    Write-RunLog 'Бэкенд уже запущен (см. status.ps1). Второй экземпляр не запускаю.'
    exit 1
}

$restarts = New-Object System.Collections.Generic.List[datetime]
while ($true) {
    Write-RunLog ("Старт: Java {0}, {1}" -f $java.Major, $Jar)
    $started = Get-Date
    & $java.Exe '-XX:MaxRAMPercentage=50' '-XX:+UseSerialGC' '-jar' $Jar
    $code = $LASTEXITCODE
    $ranFor = [int]((Get-Date) - $started).TotalSeconds

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
    Start-Sleep -Seconds $RestartDelaySeconds
}
