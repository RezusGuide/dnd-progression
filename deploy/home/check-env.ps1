# Проверка ПК перед запуском бэкенда. Ничего не ставит и не меняет:
# только смотрит и подсказывает, что установить.
#   powershell -ExecutionPolicy Bypass -File deploy\home\check-env.ps1

param([string]$EnvFile)

. "$PSScriptRoot\_common.ps1"
$ErrorActionPreference = 'Continue'
$ok = $true

Write-Host '== Windows'
$os = Get-CimInstance Win32_OperatingSystem
Write-Host ("   {0}, версия {1} (сборка {2})" -f $os.Caption, $os.Version, $os.BuildNumber)

Write-Host '== Java (нужна 21)'
$java = Find-Java
if ($java) {
    Write-Host ("   найдена Java {0}: {1}" -f $java.Major, $java.Exe)
    if ($java.Major -ne 21) { Write-Host '   Подойдёт, но лучше поставить 21: winget install EclipseAdoptium.Temurin.21.JDK' }
} else {
    $ok = $false
    Write-Host '   НЕТ. Установите: winget install EclipseAdoptium.Temurin.21.JDK'
}

Write-Host '== Tailscale'
$ts = Find-Tailscale
if ($ts) {
    Write-Host ("   {0}" -f ((& $ts version) | Select-Object -First 1))
    $state = (& $ts status 2>&1 | Select-Object -First 1)
    Write-Host ("   состояние: {0}" -f $state)
} else {
    $ok = $false
    Write-Host '   НЕТ. Установите: winget install Tailscale.Tailscale  и войдите в свой аккаунт Tailscale.'
}

Write-Host '== Порт 8080'
$busy = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    $pids = ($busy | Select-Object -ExpandProperty OwningProcess -Unique) -join ', '
    $mine = Get-BackendProcess
    if ($mine) { Write-Host "   занят нашим бэкендом (PID $pids) - это нормально, если он уже запущен." }
    else { $ok = $false; Write-Host "   ЗАНЯТ другой программой (PID $pids). Остановите её или смените порт." }
} else {
    Write-Host '   свободен'
}

Write-Host '== Настройки'
if (-not $EnvFile) { $EnvFile = $DefaultEnvFile }
if (Test-Path $EnvFile) {
    Write-Host "   $EnvFile есть"
    $stubs = @(Find-Placeholders (Read-EnvFile $EnvFile))
    foreach ($name in $stubs) { $ok = $false; Write-Host "   ОШИБКА. В настройках осталась заглушка из шаблона: $name" }
    if (-not $stubs.Count) { Write-Host '   заглушек из шаблона нет' }
} else {
    Write-Host "   $EnvFile ещё нет. Скопируйте туда deploy\home\.env.home.example и заполните."
}

Write-Host ''
if ($ok) { Write-Host 'Всё нужное на месте.' } else { Write-Host 'Чего-то не хватает: см. строки «НЕТ», «ЗАНЯТ» и «ОШИБКА» выше.' }
