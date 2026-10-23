# Открывает бэкенд в интернет через Tailscale Funnel: https://<пк>.<tailnet>.ts.net
# (порт 443) -> http://127.0.0.1:8080. Работает в фоне и переживает перезагрузку.
# Порты на роутере не нужны. Перед первым запуском Funnel нужно разрешить в
# админке Tailscale (HOME-HOSTING.md, шаг 2).
#   powershell -ExecutionPolicy Bypass -File deploy\home\funnel.ps1

. "$PSScriptRoot\_common.ps1"

$ts = Find-Tailscale
if (-not $ts) { throw 'Tailscale не установлен: winget install Tailscale.Tailscale' }

& $ts funnel --bg 8080
if ($LASTEXITCODE -ne 0) { throw 'Funnel не включился. Проверьте, что Funnel разрешён для этого устройства (HOME-HOSTING.md, шаг 2).' }

$self = (& $ts status --json | ConvertFrom-Json).Self
$name = $self.DNSName.TrimEnd('.')
Write-Host ''
Write-Host "Публичный адрес бэкенда: https://$name"
Write-Host "Проверка: https://$name/api/health"
Write-Host 'Этот адрес - в VITE_API_URL на Vercel (HOME-HOSTING.md, шаг 6).'
