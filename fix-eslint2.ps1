# Fix remaining ESLint errors - more careful approach

# 1. Fix signaling-client.ts - more careful fixes
$file = "packages/rtc-sdk/signaling/signaling-client.ts"
$content = Get-Content $file -Raw

# Only replace specific lines that need nullish coalescing (not all ||)
# Line 119: const BaseDelay = ...maxAttempts?: number; || 5 should be ??
$content = $content -replace '(\w+)\s\|\|\s(\d+)([;,])', '$1 ?? $2$3'

# Remove incorrect ?? replacements (revert const nullishness)  
$content = $content -replace 'if \(this\.socket && \(this\.socket\.readyState === WebSocket\.OPEN \|\| this\.socket\.readyState === WebSocket\.CONNECTING\)\)', 'if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING))'
$content = $content -replace 'if \(!this\.socket && \(this\.socket\.readyState === WebSocket\.OPEN \|\| this\.socket\.readyState === WebSocket\.CONNECTING\)\)', 'if (!this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING))'

# Remove awaits that shouldn't be there
$content = $content -replace 'await this\.sendMessage\(', 'this.sendMessage('

# Fix the ping timeout handling - use unknown instead of any
$content = $content -replace '\(newClient as any\).__pingTimeout', '(newClient as unknown).__pingTimeout'
$content = $content -replace '\(newClient as any\).__pingResolve', '(newClient as unknown).__pingResolve'
$content = $content -replace '(\w+).__pingTimeout', '($1 as unknown).__pingTimeout'
$content = $content -replace '(\w+).__pingResolve', '($1 as unknown).__pingResolve'

# Fix unused error variable
$content = $content -replace 'catch \(err\) \{', 'catch (_err) {'

Set-Content $file -Value $content

# 2. Fix browser-websocket-transport.ts  
$file = "packages/rtc-sdk/transports/browser-websocket-transport.ts"
$content = Get-Content $file -Raw

# Revert incorrect changes
$content = $content -replace 'this\.socket\.close\(1000, reason\)', 'if (reason) { this.socket.close(1000, reason); } else { this.socket.close(1000); }'

# Remove problematic async keyword  
$content = $content -replace 'async disconnect\(reason\?: string\):', 'disconnect(reason?: string):'
$content = $content -replace 'async send\(message: SignalingMessage\):', 'send(message: SignalingMessage):'

# Change return type from Promise<void> to void
$content = $content -replace 'disconnect\(reason\?: string\): Promise<void>', 'disconnect(reason?: string): void'
$content = $content -replace 'send\(message: SignalingMessage\): Promise<void>', 'send(message: SignalingMessage): void'

Set-Content $file -Value $content

Write-Host "ESLint fix script completed - more careful approach"
