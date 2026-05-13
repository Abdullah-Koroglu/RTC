# Fix remaining ESLint errors systematically

# 1. Check peer-connection-manager.ts for parsing error
Write-Host "Checking peer-connection-manager.ts..."
$file = "packages/rtc-sdk/peer/peer-connection-manager.ts"
$content = Get-Content $file -Raw

# Look for line 234 issue
$lines = $content -split "`n"
if ($lines.Count -gt 233) {
    Write-Host "Line 234: $($lines[233])"
    Write-Host "Line 233: $($lines[232])"
    Write-Host "Line 235: $($lines[234])"
}

# 2. Restore mediasoup-client.ts changes
Write-Host "Checking mediasoup-client.ts..."
$file = "packages/rtc-sdk/media/mediasoup-client.ts"
$content = Get-Content $file -Raw

# The window declaration should be fine
# Fix the type unions with 'any'
$content = $content -replace 'type Device = any \| unknown;', 'type Device = any;'
$content = $content -replace 'type Producer = any \| unknown;', 'type Producer = any;'
$content = $content -replace 'type Consumer = any \| unknown;', 'type Consumer = any;'  
$content = $content -replace 'type Transport = any \| unknown;', 'type Transport = any;'
$content = $content -replace 'type RtpCapabilities = any \| unknown;', 'type RtpCapabilities = any;'

# Fix nullish coalescing on line 76
$content = $content -replace '(\w+) \|\| defaultValue', '$1 ?? defaultValue'

Set-Content $file -Value $content

Write-Host "Fix script completed"
