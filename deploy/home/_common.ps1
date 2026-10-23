# Общие пути и функции для скриптов домашнего хостинга.
# Подключается из остальных скриптов: . "$PSScriptRoot\_common.ps1"

$ErrorActionPreference = 'Stop'

# Всё рабочее (jar, настоящий .env.home, логи) живёт вне репозитория.
$script:HomeDir   = Join-Path $env:LOCALAPPDATA 'zlatopryady'
$script:AppDir    = Join-Path $HomeDir 'app'
$script:LogDir    = Join-Path $HomeDir 'logs'
$script:JarPath   = Join-Path $AppDir 'backend.jar'
$script:PrevJar   = Join-Path $AppDir 'backend.prev.jar'
$script:DefaultEnvFile = Join-Path $HomeDir '.env.home'
$script:RunLog    = Join-Path $LogDir 'run.log'
$script:AppLog    = Join-Path $LogDir 'backend.log'
$script:RepoRoot  = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:HealthUrl = 'http://127.0.0.1:8080/api/health'

function Write-RunLog([string]$Message) {
    # Строка и в консоль, и в run.log (без паролей: сюда пишем только события).
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
    $line = '{0:yyyy-MM-dd HH:mm:ss}  {1}' -f (Get-Date), $Message
    Write-Host $line
    Add-Content -Path $RunLog -Value $line -Encoding UTF8
}

function Get-JavaMajor([string]$JavaExe) {
    # «java -version» пишет в stderr; берём номер из первой строки.
    $text = (& cmd /c "`"$JavaExe`" -version 2>&1") | Select-Object -First 1
    if ($text -match '"(\d+)(\.\d+)?') { return [int]$Matches[1] }
    return 0
}

function Find-Java {
    # Сначала Java 21 (под неё собран бэкенд), потом любая новее.
    $candidates = @()
    if ($env:JAVA_HOME) { $candidates += Join-Path $env:JAVA_HOME 'bin\java.exe' }
    foreach ($root in @("$env:ProgramFiles\Eclipse Adoptium", "$env:ProgramFiles\Java", "$env:ProgramFiles\Amazon Corretto", "$env:USERPROFILE\.jdks")) {
        if (Test-Path $root) {
            Get-ChildItem $root -Directory | Where-Object { $_.Name -notlike '.*' } | ForEach-Object {
                $exe = Join-Path $_.FullName 'bin\java.exe'
                if (Test-Path $exe) { $candidates += $exe }
            }
        }
    }
    $onPath = Get-Command java -ErrorAction SilentlyContinue
    if ($onPath) { $candidates += $onPath.Source }

    $found = $candidates | Select-Object -Unique | ForEach-Object { [pscustomobject]@{ Exe = $_; Major = (Get-JavaMajor $_) } } |
        Where-Object { $_.Major -ge 21 }
    $exact = $found | Where-Object { $_.Major -eq 21 } | Select-Object -First 1
    if ($exact) { return $exact }
    return $found | Sort-Object Major | Select-Object -First 1
}

function Find-Tailscale {
    $cmd = Get-Command tailscale -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $exe = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
    if (Test-Path $exe) { return $exe }
    return $null
}

function Read-EnvFile([string]$Path) {
    # Строки KEY=VALUE; пустые и начинающиеся с # пропускаются. Кавычки вокруг значения снимаются.
    if (-not (Test-Path $Path)) { throw "Нет файла настроек: $Path. Скопируйте deploy\home\.env.home.example и заполните." }
    $vars = [ordered]@{}
    foreach ($raw in Get-Content -Path $Path -Encoding UTF8) {
        $line = $raw.Trim()
        if (-not $line -or $line.StartsWith('#')) { continue }
        $eq = $line.IndexOf('=')
        if ($eq -lt 1) { continue }
        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $vars[$key] = $value
    }
    return $vars
}

function Get-BackendProcess {
    # Java-процессы, запущенные с нашим backend.jar.
    Get-CimInstance Win32_Process -Filter "Name = 'java.exe' OR Name = 'javaw.exe'" |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*$JarPath*" }
}
