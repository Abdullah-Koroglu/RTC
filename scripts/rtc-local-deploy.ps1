#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$ClusterName = 'rtc-dev'
$RegistryName = 'rtc-registry'
$RegistryPort = 5111
$RegistryHost = "localhost:$RegistryPort"
$AppNamespace = 'rtc-apps'
$DataNamespace = 'rtc-data'
$OverlayPath = Join-Path $Root 'infra/k8s/overlays/local'
$BasePath = Join-Path $Root 'infra/k8s/base'

function Info([string]$Message) {
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Done([string]$Message) {
  Write-Host "[DONE] $Message" -ForegroundColor Green
}

function Run([string]$Command) {
  Write-Host "> $Command" -ForegroundColor DarkGray
  Invoke-Expression $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Command"
  }
}

function Fix-KubeconfigServer([string]$ContextName) {
  $server = kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
  if (-not $server) {
    return
  }

  if ($server -match '^https://host\.docker\.internal:(\d+)$') {
    $port = $Matches[1]
    $clusterName = kubectl config view --minify -o jsonpath='{.clusters[0].name}'
    if ($clusterName) {
      Run "kubectl config set-cluster $clusterName --server=https://localhost:$port"
      Done "Kubeconfig server updated to localhost:$port"
    }
  }
}

Info 'Step 1/10: Delete existing k3d cluster if it exists.'
$clusterExists = k3d cluster list --no-headers 2>$null | Select-String -Pattern "^$ClusterName\b"
if ($clusterExists) {
  Run "k3d cluster delete $ClusterName"
  Done "Cluster deleted: $ClusterName"
} else {
  Done "Cluster does not exist: $ClusterName"
}

Info 'Step 2/10: Create local k3d registry if it does not exist.'
$registryExists = k3d registry list --no-headers 2>$null | Select-String -Pattern "^(k3d-)?$RegistryName\b"
if (-not $registryExists) {
  Run "k3d registry create $RegistryName --port $RegistryPort"
  Done "Registry created: $RegistryName on port $RegistryPort"
} else {
  Done "Registry already exists: $RegistryName"
}

Info 'Step 3/10: Create k3d cluster with required ports and Traefik disabled.'
Run "k3d cluster create $ClusterName --registry-use k3d-${RegistryName}:$RegistryPort --port 80:80@loadbalancer --port 443:443@loadbalancer --k3s-arg '--disable=traefik@server:0' --wait"
Run "kubectl config use-context k3d-$ClusterName"
Fix-KubeconfigServer "k3d-$ClusterName"
Done 'Cluster created and context selected.'

Info 'Step 4/10: Install ingress-nginx and wait until controller is ready.'
Run "kubectl apply --validate=false -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.0/deploy/static/provider/cloud/deploy.yaml"
Run "kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=240s"
Done 'ingress-nginx is ready.'

Info 'Step 5/10: Build and push all local images.'
Push-Location $Root
try {
  $env:DOCKER_BUILDKIT = '0'
  Run "docker builder prune -af"

  Run "docker build --no-cache -t $RegistryHost/rtc-web:local -f apps/web/Dockerfile ."
  Run "docker push $RegistryHost/rtc-web:local"

  Run "docker build --no-cache -t $RegistryHost/rtc-api:local -f services/api/Dockerfile ."
  Run "docker push $RegistryHost/rtc-api:local"

  Run "docker build --no-cache -t $RegistryHost/rtc-signaling:local -f services/signaling/Dockerfile ."
  Run "docker push $RegistryHost/rtc-signaling:local"

  Run "docker build --no-cache -t $RegistryHost/rtc-mediasoup:local -f services/mediasoup/Dockerfile ."
  Run "docker push $RegistryHost/rtc-mediasoup:local"

  Run "docker build --no-cache -t $RegistryHost/rtc-coturn:local -f infra/coturn/Dockerfile ."
  Run "docker push $RegistryHost/rtc-coturn:local"

  Run "k3d image import $RegistryHost/rtc-web:local $RegistryHost/rtc-api:local $RegistryHost/rtc-signaling:local $RegistryHost/rtc-mediasoup:local $RegistryHost/rtc-coturn:local -c $ClusterName"
}
finally {
  Pop-Location
}
Done 'All images built, pushed, and imported into k3d nodes.'

Info 'Step 6/10: Create namespaces from namespace*.yaml.'
Get-ChildItem -Path $BasePath -Filter 'namespace*.yaml' |
  Sort-Object -Property Name |
  ForEach-Object {
    Run "kubectl apply -f '$($_.FullName)'"
  }
Done 'Namespaces applied.'

Info 'Step 7/10: Create all required secrets as idempotent apply.'

Run "kubectl create secret generic rtc-app-secret --namespace $AppNamespace --from-literal=REDIS_URL=redis://redis.rtc-data.svc.cluster.local:6379 --from-literal=DATABASE_URL=postgresql://rtc:rtc-local-pass@postgres.rtc-data.svc.cluster.local:5432/rtc --dry-run=client -o yaml | kubectl apply -f -"

Run "kubectl create secret generic postgres-secret --namespace $DataNamespace --from-literal=POSTGRES_DB=rtc --from-literal=POSTGRES_USER=rtc --from-literal=POSTGRES_PASSWORD=rtc-local-pass --dry-run=client -o yaml | kubectl apply -f -"

Run "kubectl create secret generic rtc-mediasoup-secret --namespace $AppNamespace --from-literal=LOG_LEVEL=info --from-literal=NODE_ENV=development --dry-run=client -o yaml | kubectl apply -f -"

Run "kubectl create secret generic rtc-turn-secret --namespace $AppNamespace --from-literal=TURN_SHARED_SECRET=rtc-local-turn-secret --dry-run=client -o yaml | kubectl apply -f -"

Run "kubectl create secret generic rtc-turn-tls --namespace $AppNamespace --type kubernetes.io/tls --from-literal=tls.crt=local-cert --from-literal=tls.key=local-key --dry-run=client -o yaml | kubectl apply -f -"

Run "kubectl create secret generic rtc-platform-tls --namespace $AppNamespace --type kubernetes.io/tls --from-literal=tls.crt=local-cert --from-literal=tls.key=local-key --dry-run=client -o yaml | kubectl apply -f -"

Done 'Secrets applied.'

Info 'Step 8/10: Overwrite local kustomization with local registry images, local hosts, and single replicas.'
$kustomizationContent = @"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Ingress
      name: rtc-ingress
      namespace: rtc-apps
    patch: |-
      - op: remove
        path: /metadata/annotations/cert-manager.io~1cluster-issuer
      - op: remove
        path: /spec/tls
      - op: replace
        path: /spec/rules/0/host
        value: app.local.rtc
      - op: replace
        path: /spec/rules/1/host
        value: api.local.rtc
      - op: replace
        path: /spec/rules/2/host
        value: signal.local.rtc
  - target:
      kind: ConfigMap
      name: rtc-app-config
      namespace: rtc-apps
    patch: |-
      - op: replace
        path: /data/NODE_ENV
        value: development
      - op: replace
        path: /data/NEXT_PUBLIC_API_URL
        value: http://api.local.rtc
      - op: replace
        path: /data/NEXT_PUBLIC_SIGNALING_URL
        value: ws://signal.local.rtc/ws
      - op: replace
        path: /data/CORS_ORIGIN
        value: http://app.local.rtc
      - op: replace
        path: /data/ALLOWED_ORIGINS
        value: http://app.local.rtc
  - target:
      kind: ConfigMap
      name: rtc-turn-config
      namespace: rtc-apps
    patch: |-
      - op: replace
        path: /data/TURN_REALM
        value: turn.local.rtc
      - op: replace
        path: /data/TURN_EXTERNAL_IP
        value: 127.0.0.1
  - target:
      kind: ConfigMap
      name: rtc-mediasoup-config
      namespace: rtc-apps
    patch: |-
      - op: replace
        path: /data/MEDIASOUP_ANNOUNCED_IP
        value: 127.0.0.1
      - op: replace
        path: /data/MEDIASOUP_WORKER_COUNT
        value: '2'
  - target:
      kind: Deployment
      name: web
      namespace: rtc-apps
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 1
  - target:
      kind: Deployment
      name: api
      namespace: rtc-apps
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 1
  - target:
      kind: Deployment
      name: signaling
      namespace: rtc-apps
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 1
  - target:
      kind: Deployment
      name: mediasoup
      namespace: rtc-apps
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 1
  - target:
      kind: Deployment
      name: coturn
      namespace: rtc-apps
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 1
images:
  - name: ghcr.io/your-org/rtc-web
    newName: localhost:5111/rtc-web
    newTag: local
  - name: ghcr.io/your-org/rtc-api
    newName: localhost:5111/rtc-api
    newTag: local
  - name: ghcr.io/your-org/rtc-signaling
    newName: localhost:5111/rtc-signaling
    newTag: local
  - name: ghcr.io/your-org/rtc-mediasoup
    newName: localhost:5111/rtc-mediasoup
    newTag: local
  - name: ghcr.io/your-org/rtc-coturn
    newName: localhost:5111/rtc-coturn
    newTag: local
"@

$kustomizationPath = Join-Path $OverlayPath 'kustomization.yaml'
Set-Content -Path $kustomizationPath -Value $kustomizationContent -Encoding ascii
Done 'Local overlay kustomization overwritten.'

Info 'Step 9/10: Apply local overlay.'
Run "kubectl apply -k '$OverlayPath'"
Done 'Local overlay applied.'

Info 'Step 10/10: Print hosts file instructions and pod status.'
Write-Host ''
Write-Host 'Add these lines to C:\Windows\System32\drivers\etc\hosts as Administrator:' -ForegroundColor Yellow
Write-Host '127.0.0.1 app.local.rtc'
Write-Host '127.0.0.1 api.local.rtc'
Write-Host '127.0.0.1 signal.local.rtc'
Write-Host '127.0.0.1 turn.local.rtc'
Write-Host ''
Write-Host 'Pod status:' -ForegroundColor Yellow
kubectl get pods -A
