# Автозапуск бэкенда при входе в Windows: задача «Zlatopryady backend» в
# Планировщике заданий. Запускает run.ps1 скрыто, от вашего пользователя
# (не SYSTEM), без прав администратора.
#   powershell -ExecutionPolicy Bypass -File deploy\home\install-autostart.ps1

. "$PSScriptRoot\_common.ps1"

$taskName = 'Zlatopryady backend'
$runScript = Join-Path $PSScriptRoot 'run.ps1'
$user = "$env:USERDOMAIN\$env:USERNAME"

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runScript`"" `
    -WorkingDirectory $RepoRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
# Без ограничения времени работы и без остановки на батарее; run.ps1 сам
# перезапускает упавший бэкенд.
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
    -Description 'Бэкенд «Златопрядов» (deploy\home\run.ps1)' -Force | Out-Null

Write-Host "Задача «$taskName» создана: бэкенд стартует при входе в Windows."
Write-Host "Запустить сейчас, не перезаходя: Start-ScheduledTask -TaskName '$taskName'"
Write-Host 'Убрать: deploy\home\uninstall-autostart.ps1'
