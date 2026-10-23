# Останавливает бэкенд: сначала run.ps1 (чтобы он не перезапустил сервер),
# потом сам процесс Java. Автозапуск при следующем входе в Windows остаётся.
#   powershell -ExecutionPolicy Bypass -File deploy\home\stop.ps1

. "$PSScriptRoot\_common.ps1"

$taskName = 'Zlatopryady backend'
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task -and $task.State -eq 'Running') { Stop-ScheduledTask -TaskName $taskName }

$runScript = Join-Path $PSScriptRoot 'run.ps1'
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'pwsh.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine -like "*$runScript*" -and $_.ProcessId -ne $PID } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host "run.ps1 остановлен (PID $($_.ProcessId))" }

$java = Get-BackendProcess
if ($java) {
    $java | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host "Бэкенд остановлен (PID $($_.ProcessId))" }
    Write-RunLog 'Бэкенд остановлен вручную (stop.ps1).'
} else {
    Write-Host 'Бэкенд и так не запущен.'
}
