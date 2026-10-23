# Собирает бэкенд и кладёт jar в %LOCALAPPDATA%\zlatopryady\app\backend.jar.
# Работающий сервер запущен из этой копии, поэтому пересборка в IDE его не трогает.
# Прошлый jar сохраняется как backend.prev.jar - для отката.
#   powershell -ExecutionPolicy Bypass -File deploy\home\build.ps1

. "$PSScriptRoot\_common.ps1"

$java = Find-Java
if (-not $java) { throw 'Не найдена Java 21. Установите: winget install EclipseAdoptium.Temurin.21.JDK' }
# Gradle запускается той же Java, что найдена выше.
$env:JAVA_HOME = Split-Path (Split-Path $java.Exe -Parent) -Parent
Write-Host "Java $($java.Major): $env:JAVA_HOME"

$backend = Join-Path $RepoRoot 'backend'
Push-Location $backend
try {
    & .\gradlew.bat bootJar --quiet
    if ($LASTEXITCODE -ne 0) { throw "Сборка не удалась (код $LASTEXITCODE)." }
} finally {
    Pop-Location
}

$built = Get-ChildItem (Join-Path $backend 'build\libs') -Filter '*.jar' | Where-Object { $_.Name -notlike '*-plain.jar' } |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $built) { throw 'Не найден собранный jar в backend\build\libs.' }

New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
if (Test-Path $JarPath) {
    Copy-Item $JarPath $PrevJar -Force
    Write-Host "Прошлая версия сохранена: $PrevJar"
}
Copy-Item $built.FullName $JarPath -Force
Write-Host "Готово: $JarPath"
Write-Host 'Если сервер уже работает, перезапустите его (см. HOME-HOSTING.md, «Обновление сайта»).'
