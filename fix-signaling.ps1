# Comprehensive fix for signaling-client.ts

$file = "packages/rtc-sdk/signaling/signaling-client.ts"
$content = Get-Content $file -Raw

# 1. Fix NodeJS.Timeout -> ReturnType<typeof setTimeout>
$content = $content -replace 'private reconnectTimer: NodeJS\.Timeout \| null', 'private reconnectTimer: ReturnType<typeof setTimeout> | null'
$content = $content -replace 'timeout: NodeJS\.Timeout', 'timeout: ReturnType<typeof setTimeout>'

# 2. Remove async from disconnect method and change return type
$content = $content -replace 'async disconnect\(reason\?: string\): Promise<void>', 'disconnect(reason?: string): void'

# 3. Remove async from sendMessage method and change return type
$content = $content -replace 'private async sendMessage\(message: OutboundSignalingEvent\): Promise<void>', 'private sendMessage(message: OutboundSignalingEvent): void'

# 4. Fix setTimeout callback - remove async and handle Promise properly
$pattern = 'this\.reconnectTimer = setTimeout\(async \(\) => \{(\s+)try \{(\s+)await this\.connect\(\);'
$replacement = 'this.reconnectTimer = setTimeout(() => {$1const connect = async () => {$2try {$2await this.connect();'
$content = $content -replace $pattern, $replacement

# 5. Fix closing brace of try-catch
$pattern = '(Reconnection failed.*\);(\s+)\}(\s+)\};(\s+), delayMs\);)'
$replacement = '$1}$2};$3void connect();$3}, delayMs);'
$content = $content -replace $pattern, $replacement

# 6. Fix unused err variable
$content = $content -replace 'const err = error instanceof Error', 'const _err = error instanceof Error'

Set-Content $file -Value $content
Write-Host "Fixed signaling-client.ts"
