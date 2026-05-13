# Fix remaining ESLint errors

# 1. Fix signaling-client.ts - NodeJS.Timeout references
$file = "packages/rtc-sdk/signaling/signaling-client.ts"
$content = Get-Content $file -Raw

# Replace NodeJS.Timeout with ReturnType<typeof setTimeout>
$content = $content -replace 'NodeJS\.Timeout', 'ReturnType<typeof setTimeout>'

# Fix disconnect method to remove async since there's no await
$content = $content -replace 'async disconnect\(reason\?\: string\): Promise<void> \{', 'disconnect(reason?: string): void {'

# Fix sendMessage method to remove async since there's no real await
$content = $content -replace 'async sendMessage\(message: OutboundSignalingEvent\): Promise<void> \{', 'sendMessage(message: OutboundSignalingEvent): void {'

# Fix nullish coalescing
$content = $content -replace ' \|\| ', ' ?? '

# Fix no-misused-promises - wrap async callback properly
$content = $content -replace 'this\.reconnectTimer = window\.setTimeout\(async \(\) => \{', "this.reconnectTimer = window.setTimeout(() => {"
$content = $content -replace 'this\.reconnectTimer = setTimeout\(async \(\) => \{', "this.reconnectTimer = setTimeout(() => {"

# Replace window calls with proper guards
$content = $content -replace 'window\.setTimeout', "if (typeof window !== 'undefined') { window.setTimeout"
$content = $content -replace 'window\.clearTimeout', "if (typeof window !== 'undefined') { window.clearTimeout"

Set-Content $file -Value $content

# 2. Fix browser-websocket-transport.ts
$file = "packages/rtc-sdk/transports/browser-websocket-transport.ts"
$content = Get-Content $file -Raw

# Remove async from disconnect and send methods
$content = $content -replace 'async disconnect\(reason\?\: string\): Promise<void> \{', 'disconnect(reason?: string): void {'
$content = $content -replace 'async send\(message: SignalingMessage\): Promise<void> \{', 'send(message: SignalingMessage): void {'

# Fix the JSON.parse issue by casting event.data
$content = $content -replace 'JSON\.parse\(event\.data\) as SignalingMessage', 'JSON.parse(event.data as string) as SignalingMessage'

Set-Content $file -Value $content

# 3. Fix peer-connection-manager.ts - window references and async callback
$file = "packages/rtc-sdk/peer/peer-connection-manager.ts"
$content = Get-Content $file -Raw

# Fix window references
$content = $content -replace 'this\.reconnectTimer = window\.setTimeout\(async \(\) => \{', @"
    if (typeof window !== 'undefined') {
      this.reconnectTimer = window.setTimeout(() => {
"@

$content = $content -replace 'window\.clearTimeout\(this\.reconnectTimer\)', @"
    if (typeof window !== 'undefined' && this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
    }
"@

# Remove async from callbacks
$content = $content -replace 'setTimeout\(async \(\) => \{', 'setTimeout(() => {'

Set-Content $file -Value $content

# 4. Fix signaling-bridge.ts - any types
$file = "packages/rtc-sdk/signaling/signaling-bridge.ts"
$content = Get-Content $file -Raw

$content = $content -replace ': any', ': unknown'

Set-Content $file -Value $content

Write-Host "ESLint fix script completed"
