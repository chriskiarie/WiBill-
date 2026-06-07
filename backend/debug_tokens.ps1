# Quick token debugger - run this first to see exactly what's being read
$tokensFile = "D:\honestbill\backend\tokens.txt"
$API = "http://localhost:8000"

Write-Host "=== RAW FILE CONTENT ===" -ForegroundColor Cyan
Get-Content $tokensFile | Select-Object -First 15 | ForEach-Object { 
    Write-Host "  [$_]" 
}

Write-Host ""
Write-Host "=== REGEX PARSE ===" -ForegroundColor Cyan
$tokenLines = Get-Content $tokensFile
$adminLine = $tokenLines | Select-String '\$adminToken\s*=\s*"(eyJ[^"]+)"' | Select-Object -First 1
$ispLine   = $tokenLines | Select-String '\$ispToken\s*=\s*"(eyJ[^"]+)"'   | Select-Object -First 1

if ($adminLine) {
    $ADMIN_TOKEN = $adminLine.Matches[0].Groups[1].Value
    Write-Host "  Admin token length : $($ADMIN_TOKEN.Length)"
    Write-Host "  Admin token start  : $($ADMIN_TOKEN.Substring(0,40))"
    Write-Host "  Admin token end    : ....$($ADMIN_TOKEN.Substring($ADMIN_TOKEN.Length - 20))"
    Write-Host "  Has whitespace?    : $($ADMIN_TOKEN -match '\s')"
    Write-Host "  Char codes (last5) : $(($ADMIN_TOKEN[-5..-1] | ForEach-Object { [int][char]$_ }) -join ', ')"
} else {
    Write-Host "  Admin line NOT FOUND by regex" -ForegroundColor Red
    # Try to find the line manually
    $tokenLines | Where-Object { $_ -match 'adminToken' } | ForEach-Object {
        Write-Host "  Found adminToken line: [$_]" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== LIVE TEST WITH EXPLICIT HEADER ===" -ForegroundColor Cyan
if ($ADMIN_TOKEN) {
    # Test 1: Standard header
    try {
        $h = @{ "Authorization" = "Bearer $ADMIN_TOKEN" }
        Write-Host "  Header value: [Bearer $($ADMIN_TOKEN.Substring(0,20))...]"
        $r = Invoke-RestMethod "$API/api/auth/me" -Headers $h -Method GET
        Write-Host "  Result: $($r | ConvertTo-Json)" -ForegroundColor Green
    } catch {
        Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host "  Body: $($reader.ReadToEnd())" -ForegroundColor Red
        } catch {}
    }

    # Test 2: Token trimmed explicitly
    $trimmed = $ADMIN_TOKEN.Trim()
    try {
        $h2 = @{ "Authorization" = "Bearer $trimmed" }
        $r2 = Invoke-RestMethod "$API/api/auth/me" -Headers $h2 -Method GET
        Write-Host "  Trimmed result: $($r2 | ConvertTo-Json)" -ForegroundColor Green
    } catch {
        Write-Host "  Trimmed also failed: HTTP $([int]$_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== MANUAL TOKEN TEST ===" -ForegroundColor Cyan
Write-Host "Paste a fresh token below and press Enter (or Ctrl+C to skip):"
$manual = Read-Host "Token"
if ($manual -and $manual.StartsWith("eyJ")) {
    try {
        $hm = @{ "Authorization" = "Bearer $manual" }
        $rm = Invoke-RestMethod "$API/api/auth/me" -Headers $hm -Method GET
        Write-Host "  Manual token WORKS: $($rm.email) / $($rm.role)" -ForegroundColor Green
    } catch {
        Write-Host "  Manual token ALSO 401 - backend JWT issue" -ForegroundColor Red
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host "  Body: $($reader.ReadToEnd())" -ForegroundColor Red
        } catch {}
    }
}