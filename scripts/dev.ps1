#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

Write-Host 'Starting RTC monorepo in development mode...'
pnpm install
pnpm dev
