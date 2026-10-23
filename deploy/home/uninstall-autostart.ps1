# Убирает автозапуск бэкенда (задачу «Zlatopryady backend» из Планировщика).
# Работающий сейчас бэкенд не останавливает: для этого см. HOME-HOSTING.md.
#   powershell -ExecutionPolicy Bypass -File deploy\home\uninstall-autostart.ps1

$taskName = 'Zlatopryady backend'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Задача «$taskName» удалена."
} else {
    Write-Host "Задачи «$taskName» нет - убирать нечего."
}
