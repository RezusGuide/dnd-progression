# Закрывает доступ из интернета (выключает Funnel на 443). Бэкенд при этом
# продолжает работать локально; сайт покажет «Контора закрыта».
#   powershell -ExecutionPolicy Bypass -File deploy\home\funnel-off.ps1

. "$PSScriptRoot\_common.ps1"

$ts = Find-Tailscale
if (-not $ts) { throw 'Tailscale не установлен.' }
& $ts funnel --https=443 off
Write-Host 'Funnel выключен. Включить снова: deploy\home\funnel.ps1'
