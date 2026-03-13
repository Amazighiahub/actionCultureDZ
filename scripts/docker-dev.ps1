# EventCulture - Docker dev (Windows PowerShell)
# Usage: .\scripts\docker-dev.ps1 [up|down|status|logs]

param([string]$Cmd = "up")

$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot\..

switch ($Cmd) {
    "up"    { docker compose up -d --build }
    "down"  { docker compose down }
    "status"{ docker compose ps }
    "logs"  { docker compose logs -f }
    default { Write-Host "Usage: .\scripts\docker-dev.ps1 [up|down|status|logs]" }
}

Pop-Location
