#!/usr/bin/env pwsh
# get_tokens_now.ps1 - FIXED VERSION
# Get and store WiBill bearer tokens

param(
    [string]$ApiUrl = "http://localhost:8000",
    [string]$AdminEmail = "admin@xwbill.co.ke",
    [string]$AdminPassword = "admin1234",
    [string]$IspEmail = "isp@test-isp.co.ke",
    [string]$IspPassword = "isp1234"
)

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  WiBill Bearer Token Generator" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "API URL: $ApiUrl" -ForegroundColor Gray

# ============================================================================
# Get Admin Token
# ============================================================================

Write-Host ""
Write-Host "Step 1: Getting Platform Admin Token..." -ForegroundColor Yellow

try {
    $adminResponse = Invoke-RestMethod `
        -Uri "$ApiUrl/api/auth/login" `
        -Method POST `
        -Body @{
            username = $AdminEmail
            password = $AdminPassword
        } `
        -ErrorAction Stop

    $adminToken = $adminResponse.access_token
    $adminRole = $adminResponse.role
    $adminTenant = $adminResponse.tenant_id

    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   Email:    $AdminEmail" -ForegroundColor Gray
    Write-Host "   Role:     $adminRole" -ForegroundColor Gray
    Write-Host "   Token:    $($adminToken.Substring(0, 50))..." -ForegroundColor Gray

} catch {
    Write-Host "❌ Failed to get admin token" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Get ISP Token
# ============================================================================

Write-Host ""
Write-Host "Step 2: Getting ISP Admin Token..." -ForegroundColor Yellow

try {
    $ispResponse = Invoke-RestMethod `
        -Uri "$ApiUrl/api/auth/login" `
        -Method POST `
        -Body @{
            username = $IspEmail
            password = $IspPassword
        } `
        -ErrorAction Stop

    $ispToken = $ispResponse.access_token
    $ispRole = $ispResponse.role
    $ispTenant = $ispResponse.tenant_id

    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   Email:    $IspEmail" -ForegroundColor Gray
    Write-Host "   Role:     $ispRole" -ForegroundColor Gray
    Write-Host "   Token:    $($ispToken.Substring(0, 50))..." -ForegroundColor Gray

} catch {
    Write-Host "❌ Failed to get ISP token" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Store in Environment Variables
# ============================================================================

Write-Host ""
Write-Host "Step 3: Storing tokens in environment variables..." -ForegroundColor Yellow

$env:WIBILL_ADMIN_TOKEN = $adminToken
$env:WIBILL_ADMIN_ROLE = $adminRole
$env:WIBILL_ADMIN_TENANT = $adminTenant
$env:WIBILL_ISP_TOKEN = $ispToken
$env:WIBILL_ISP_ROLE = $ispRole
$env:WIBILL_ISP_TENANT = $ispTenant
$env:WIBILL_API = $ApiUrl

Write-Host "✅ Set environment variables:" -ForegroundColor Green
Write-Host "   - WIBILL_ADMIN_TOKEN" -ForegroundColor Cyan
Write-Host "   - WIBILL_ADMIN_ROLE" -ForegroundColor Cyan
Write-Host "   - WIBILL_ADMIN_TENANT" -ForegroundColor Cyan
Write-Host "   - WIBILL_ISP_TOKEN" -ForegroundColor Cyan
Write-Host "   - WIBILL_ISP_ROLE" -ForegroundColor Cyan
Write-Host "   - WIBILL_ISP_TENANT" -ForegroundColor Cyan
Write-Host "   - WIBILL_API" -ForegroundColor Cyan

# ============================================================================
# Save to File
# ============================================================================

Write-Host ""
Write-Host "Step 4: Saving tokens to tokens.txt..." -ForegroundColor Yellow

$tokenContent = @"
# WiBill Bearer Tokens
# Generated: $(Get-Date)
# Valid for: ~24 hours

# Platform Admin
`$adminToken = "$adminToken"
`$adminRole = "$adminRole"
`$adminTenant = "$adminTenant"

# ISP Admin
`$ispToken = "$ispToken"
`$ispRole = "$ispRole"
`$ispTenant = "$ispTenant"

# API
`$apiUrl = "$ApiUrl"

# USAGE EXAMPLES:
# 1. Test admin token:
#    `$headers = @{ "Authorization" = "Bearer `$adminToken" }
#    Invoke-RestMethod "`$apiUrl/api/auth/me" -Headers `$headers
#
# 2. Get all tenants:
#    `$headers = @{ "Authorization" = "Bearer `$adminToken" }
#    Invoke-RestMethod "`$apiUrl/api/tenants" -Headers `$headers
#
# 3. Get packages as ISP:
#    `$headers = @{ "Authorization" = "Bearer `$ispToken" }
#    Invoke-RestMethod "`$apiUrl/api/packages" -Headers `$headers
"@

$tokenContent | Out-File -FilePath "tokens.txt" -Encoding UTF8
Write-Host "✅ Saved to tokens.txt" -ForegroundColor Green

# ============================================================================
# Summary
# ============================================================================

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Tokens Ready" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green

Write-Host ""
Write-Host "ADMIN TOKEN:" -ForegroundColor Yellow
Write-Host $adminToken -ForegroundColor Cyan
Write-Host ""

Write-Host "ISP TOKEN:" -ForegroundColor Yellow
Write-Host $ispToken -ForegroundColor Cyan
Write-Host ""

Write-Host "Quick Test (copy-paste into PowerShell):" -ForegroundColor Yellow
Write-Host '$headers = @{ "Authorization" = "Bearer ' + $adminToken.Substring(0, 20) + '..." }' -ForegroundColor Gray
Write-Host 'Invoke-RestMethod "http://localhost:8000/api/auth/me" -Headers $headers' -ForegroundColor Gray

Write-Host ""
Write-Host "Files:" -ForegroundColor Yellow
Write-Host "  - tokens.txt (tokens stored for reference)" -ForegroundColor Cyan
Write-Host "  - Environment variables set in current session" -ForegroundColor Cyan

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test your tokens: call-api or use Invoke-RestMethod" -ForegroundColor Gray
Write-Host "  2. Tokens valid for ~24 hours" -ForegroundColor Gray
Write-Host "  3. Run this script again to refresh" -ForegroundColor Gray

Write-Host ""