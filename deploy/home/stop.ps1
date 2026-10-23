# Останавливает бэкенд целиком: все run.ps1 (и в окне, и из Планировщика)
# и все процессы Java с backend.jar, затем проверяет, что ничего не осталось.
# Автозапуск при следующем входе в Windows остаётся.
#   powershell -ExecutionPolicy Bypass -File deploy\home\stop.ps1

param([int]$WaitSeconds = 20)

. "$PSScriptRoot\_common.ps1"

# 1. Флаг: увидев его, run.ps1 выходит, а не перезапускает сервер.
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
Set-Content -Path $StopFlag -Value (Get-Date -Format s) -Encoding ASCII

$taskName = 'Zlatopryady backend'
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task -and $task.State -eq 'Running') { Stop-ScheduledTask -TaskName $taskName }

# 2. Сам сервер.
$java = @(Get-BackendProcess)
$java | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Write-Host "Бэкенд остановлен (PID $($_.ProcessId))" }

# 3. Ждём, пока run.ps1 сами увидят флаг и выйдут; кто не вышел - останавливаем.
$deadline = (Get-Date).AddSeconds($WaitSeconds)
while ((Get-Date) -lt $deadline -and @(Get-RunProcesses).Count) { Start-Sleep -Milliseconds 500 }
Get-RunProcesses | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "run.ps1 остановлен принудительно (PID $($_.ProcessId))"
}
Get-BackendProcess | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

# 4. Проверка.
Start-Sleep -Milliseconds 500
$leftRun = @(Get-RunProcesses)
$leftJava = @(Get-BackendProcess)
if ($leftRun.Count -or $leftJava.Count) {
    Write-RunLog ("stop.ps1: остались процессы (run.ps1: {0}, java: {1}). Закройте их вручную в Диспетчере задач." -f $leftRun.Count, $leftJava.Count)
    exit 1
}
if ($java.Count) { Write-RunLog 'Бэкенд остановлен вручную (stop.ps1). Ничего не осталось.' }
else { Write-Host 'Бэкенд и так не был запущен. Ничего не осталось.' }
