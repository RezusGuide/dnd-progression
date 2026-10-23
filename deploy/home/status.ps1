# Состояние домашнего сервера: процесс, /api/health, Funnel и хвост лога.
#   powershell -ExecutionPolicy Bypass -File deploy\home\status.ps1

. "$PSScriptRoot\_common.ps1"
$ErrorActionPreference = 'Continue'

Write-Host '== Процесс'
$proc = Get-BackendProcess
if ($proc) { $proc | ForEach-Object { Write-Host ("   работает, PID {0}, запущен {1}" -f $_.ProcessId, $_.CreationDate) } }
else { Write-Host '   не запущен' }

Write-Host "== $HealthUrl"
try {
    $h = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 5
    Write-Host ("   {0}, версия {1}" -f $h.status, $h.version)
    $db = Invoke-RestMethod -Uri ($HealthUrl + '/db') -TimeoutSec 5
    Write-Host ("   база: {0}" -f $db.status)
} catch {
    Write-Host '   не отвечает'
}

Write-Host '== Tailscale Funnel'
$ts = Find-Tailscale
if (-not $ts) {
    Write-Host '   Tailscale не установлен (winget install Tailscale.Tailscale)'
} else {
    $out = (& $ts funnel status 2>&1) -join "`n"
    if ($LASTEXITCODE -ne 0 -or -not $out.Trim() -or $out -match 'No serve config') { Write-Host '   не настроен (deploy\home\funnel.ps1)' }
    else { $out -split "`n" | ForEach-Object { Write-Host "   $_" } }
}

Write-Host "== Лог: $AppLog"
if (Test-Path $AppLog) { Get-Content $AppLog -Tail 15 -Encoding UTF8 | ForEach-Object { Write-Host "   $_" } }
else { Write-Host '   пока пуст' }
if (Test-Path $RunLog) {
    Write-Host "== Перезапуски: $RunLog"
    Get-Content $RunLog -Tail 5 -Encoding UTF8 | ForEach-Object { Write-Host "   $_" }
}
