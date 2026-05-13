#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Overlay = Join-Path $Root 'infra/k8s/overlays/production'

kubectl apply -k $Overlay
