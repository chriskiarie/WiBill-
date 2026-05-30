#!/usr/bin/env pwsh
param(
    [string]$AdminToken = $env:WIBILL_ADMIN_TOKEN,
    [string]$IspToken = $env:WIBILL_ISP_TOKEN,
    [string]$BaseUrl = $env:WIBILL_API,
    [string]$AdminTokenDirect = "",
    [string]$IspTokenDirect = ""
)

if ($AdminTokenDirect) { $AdminToken = $AdminTokenDirect }
if ($IspTokenDirect)   { $IspToken   = $IspTokenDirect }
if (-not $BaseUrl)     { $BaseUrl    = "http://localhost:8000" }

$FreshAdminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNGViOGQ2My1kMTk0LTRiNDMtYTJlOS0xNmMzNjFjNDNhNmEiLCJyb2xlIjoicGxhdGZvcm1fYWRtaW4iLCJ0ZW5hbnRfaWQiOm51bGwsImV4cCI6MTc4MDA4NDg0NSwiaWF0IjoxNzgwMDgxMjQ1fQ.ajAEeZxrXUk0hDjLbQQpWYkUpkwzYU4DBw7nCJksARw"
$FreshIspToken   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiNDZkMWRjZS1jOGE0LTRjNWYtOWIzMS02MWFjMTg1YjU1OTciLCJyb2xlIjoiaXNwX2FkbWluIiwidGVuYW50X2lkIjoiOTQ4YWUzMzMtNWQxMC00OGFjLWJlN2YtNjE1ZjMxNGQ0NTIzIiwiZXhwIjoxNzgwMDg0ODQ2LCJpYXQiOjE3ODAwODEyNDZ9.c--u3iGdofVKqWbTz5tjSzYIzhAE2vzK2UwX2v0xhoA"

if (-not $AdminToken) { $AdminToken = $FreshAdminToken }
if (-not $IspToken)   { $IspToken   = $FreshIspToken }

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  PHASE 4B - WIBILL INVOICE AND BILLING SYSTEM TEST" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "CONFIGURATION:" -ForegroundColor Yellow
Write-Host "  Base URL:    $BaseUrl" -ForegroundColor Gray
Write-Host "  Admin Token: $($AdminToken.Substring(0, 30))..." -ForegroundColor Gray
Write-Host "  ISP Token:   $($IspToken.Substring(0, 30))..." -ForegroundColor Gray
Write-Host ""

if (-not $AdminToken -or -not $IspToken) {
    Write-Host "ERROR: Tokens not set!" -ForegroundColor Red
    Write-Host "Run: .\get_tokens_now.ps1" -ForegroundColor Cyan
    exit 1
}

$passCount = 0
$failCount = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Endpoint,
        [string]$Token,
        [hashtable]$Body = $null,
        [bool]$ShouldFail = $false
    )

    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type"  = "application/json"
    }

    $url = "$BaseUrl$Endpoint"

    try {
        $params = @{
            Uri         = $url
            Method      = $Method
            Headers     = $headers
            ErrorAction = "Stop"
        }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json) }

        $response = Invoke-RestMethod @params

        if ($ShouldFail) {
            Write-Host "  [FAIL] $Name - Expected failure but got success" -ForegroundColor Red
            $script:failCount++
        } else {
            Write-Host "  [PASS] $Name" -ForegroundColor Green
            $script:passCount++
        }
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode
        if ($ShouldFail) {
            Write-Host "  [PASS] $Name (correctly blocked - $statusCode)" -ForegroundColor Green
            $script:passCount++
        } else {
            Write-Host "  [FAIL] $Name - $statusCode - $($_.Exception.Message)" -ForegroundColor Red
            $script:failCount++
        }
        return $null
    }
}

Write-Host "TEST 1: Health and Authentication" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
Test-Endpoint -Name "Health Check"               -Endpoint "/health"      -Token $IspToken
Test-Endpoint -Name "ISP Auth - Get Current User"  -Endpoint "/api/auth/me" -Token $IspToken
Test-Endpoint -Name "Admin Auth - Get Current User" -Endpoint "/api/auth/me" -Token $AdminToken

Write-Host ""
Write-Host "TEST 2: Invoice Endpoints (Phase 4B)" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
Test-Endpoint -Name "Get Current Invoice Status"   -Endpoint "/api/invoices/current-status"               -Token $IspToken
Test-Endpoint -Name "List All Invoices"            -Endpoint "/api/invoices"                              -Token $IspToken
Test-Endpoint -Name "Admin - List All Invoices"    -Endpoint "/api/invoices/admin/all"                    -Token $AdminToken
Test-Endpoint -Name "Admin - Get Overdue Invoices" -Endpoint "/api/invoices/admin/overdue"                -Token $AdminToken
Test-Endpoint -Name "Admin - Get Billing Report"   -Endpoint "/api/invoices/admin/billing-report"         -Token $AdminToken
Test-Endpoint -Name "Admin - Create Test Invoice"  -Method "POST" -Endpoint "/api/invoices/admin/test-create-invoice" -Token $AdminToken
Test-Endpoint -Name "Admin - Check Overdue"        -Method "POST" -Endpoint "/api/invoices/admin/test-check-overdue"  -Token $AdminToken

Write-Host ""
Write-Host "TEST 3: Permission Checks" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
Test-Endpoint -Name "ISP Cannot Access Admin Invoices" -Endpoint "/api/invoices/admin/all" -Token $IspToken       -ShouldFail $true
Test-Endpoint -Name "Invalid Token Rejected"           -Endpoint "/api/auth/me"            -Token "invalid-token" -ShouldFail $true

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Green
Write-Host "  TEST SUMMARY" -ForegroundColor Green
Write-Host "===================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Passed: $passCount" -ForegroundColor Green

if ($failCount -eq 0) {
    Write-Host "  Failed: $failCount" -ForegroundColor Green
} else {
    Write-Host "  Failed: $failCount" -ForegroundColor Red
}

Write-Host ""

if ($failCount -eq 0) {
    Write-Host "STATUS: ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "  [OK] Invoice system endpoints working" -ForegroundColor Green
    Write-Host "  [OK] Authentication working" -ForegroundColor Green
    Write-Host "  [OK] Permissions enforced" -ForegroundColor Green
    Write-Host "  [OK] Admin endpoints secured" -ForegroundColor Green
    exit 0
} else {
    Write-Host "STATUS: SOME TESTS FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Refresh tokens: run get_tokens_now.ps1" -ForegroundColor Gray
    Write-Host "  2. Check backend is up: http://localhost:8000/health" -ForegroundColor Gray
    Write-Host "  3. Restart backend: uvicorn app.main:app --reload" -ForegroundColor Gray
    exit 1
}