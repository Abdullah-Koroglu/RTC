#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
Push-Location $Root

try {
  docker build -f apps/web/Dockerfile -t rtc-web:local .
  docker build -f services/api/Dockerfile -t rtc-api:local .
  docker build -f services/signaling/Dockerfile -t rtc-signaling:local .
}
finally {
  Pop-Location
}
