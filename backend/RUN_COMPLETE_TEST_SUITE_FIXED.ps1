#!/usr/bin/env pwsh
# WIBILL_E2E_TEST.ps1
# One script: gets tokens + runs all 6 E2E tests in the SAME process.
# No env var propagation issues. Just run this once.
#
# Usage (from D:\honestbill\backend):
#   powershell -ExecutionPolicy Bypass -File .\WIBILL_E2E_TEST.ps1
#
# Optional: target a different API
#   powershell -ExecutionPolicy Bypass -File .\WIBILL_E2E_TEST.ps1 -ApiUrl http://localhost:8000

param(
    [string]$ApiUrl = "http://localhost:8000"
)

# ============================================================================
# CREDENTIALS  (match your seed_data.py)
# ============================================================================
$ADMIN_EMAIL  = "admin@xwbill.co.ke"
$ADMIN_PASS   = "admin1234"
$ISP_EMAIL    = "isp@test-isp.co.ke"
$ISP_PASS     = "isp1234"
$TENANT_SLUG  = "test-isp"

# ============================================================================
# TRACKING
# ============================================================================
$script:Pass      = 0
$script:Fail      = 0
$script:Results   = @()
$script:PackageId = $null
$script:SessionId = $null

# ============================================================================
# HELPERS
# ============================================================================

function Write-Banner($Text, $Color = "Cyan") {
    $line = "═" * 65
    Write-Host ""
    Write-Host "╔$line╗" -ForegroundColor $Color
    Write-Host "║  $($Text.PadRight(63))║" -ForegroundColor $Color
    Write-Host "╚$line╝" -ForegroundColor $Color
    Write-Host ""
}

function Write-Section($Title) {
    Write-Host ""
    Write-Host "┌─────────────────────────────────────────────────────────────┐" -ForegroundColor Magenta
    Write-Host "│  $($Title.PadRight(61))│" -ForegroundColor Magenta
    Write-Host "└─────────────────────────────────────────────────────────────┘" -ForegroundColor Magenta
}

function Test-Pass($Tag, $Msg) {
    Write-Host "  ✅  $Msg" -ForegroundColor Green
    $script:Pass++
    $script:Results += [PSCustomObject]@{ Tag=$Tag; Status="PASS"; Message=$Msg }
}

function Test-Fail($Tag, $Msg) {
    Write-Host "  ❌  $Msg" -ForegroundColor Red
    $script:Fail++
    $script:Results += [PSCustomObject]@{ Tag=$Tag; Status="FAIL"; Message=$Msg }
}

function Test-Info($Msg) {
    Write-Host "       ℹ  $Msg" -ForegroundColor Cyan
}

function Get-ErrorDetail($Ex) {
    try {
        $stream = $Ex.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body   = $reader.ReadToEnd()
        $code   = [int]$Ex.Exception.Response.StatusCode
        if ($body) { return "HTTP $code — $body" }
        return "HTTP $code"
    } catch {
        return $Ex.Exception.Message
    }
}

# ============================================================================
# BANNER
# ============================================================================

Write-Banner "WiBill / HonestBill  —  E2E Test Suite  (all-in-one)" "Cyan"
Write-Host "  API  :  $ApiUrl" -ForegroundColor Gray
Write-Host "  Date :  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# ============================================================================
# PHASE 0  —  HEALTH CHECK
# ============================================================================

Write-Section "PHASE 0 · Backend health"

try {
    $health = Invoke-RestMethod "$ApiUrl/api/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($health.status -eq "ok") {
        Test-Pass "HEALTH" "Backend is up at $ApiUrl"
    } else {
        Test-Fail "HEALTH" "Backend unhealthy — status: $($health.status)"
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "  ❌  Cannot reach backend at $ApiUrl" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Start it first:" -ForegroundColor Yellow
    Write-Host "    cd D:\honestbill\backend" -ForegroundColor Gray
    Write-Host "    uvicorn app.main:app --reload" -ForegroundColor Gray
    exit 1
}

# ============================================================================
# PHASE 1  —  GET TOKENS  (same process — no env var propagation problem)
# ============================================================================

Write-Section "PHASE 1 · Authenticate and obtain tokens"

# --- Admin ---
Write-Host ""
Write-Host "  Logging in as Platform Admin ($ADMIN_EMAIL)..." -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod "$ApiUrl/api/auth/login" -Method POST `
         -ContentType "application/json" `
         -Body (@{ username=$ADMIN_EMAIL; password=$ADMIN_PASS } | ConvertTo-Json) `
         -ErrorAction Stop

    $AdminToken = $r.access_token
    if (-not $AdminToken) { throw "access_token missing from response" }
    Test-Pass "AUTH" "Admin login OK — role: $($r.role)"
} catch {
    Write-Host "  ❌  Admin login FAILED: $(Get-ErrorDetail $_)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Checklist:" -ForegroundColor Yellow
    Write-Host "    1.  Backend running?  uvicorn app.main:app --reload" -ForegroundColor Gray
    Write-Host "    2.  Seed run?         python -m app.scripts.seed_data" -ForegroundColor Gray
    Write-Host "    3.  Credentials match seed_data.py?" -ForegroundColor Gray
    exit 1
}

# --- ISP ---
Write-Host "  Logging in as ISP Admin ($ISP_EMAIL)..." -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod "$ApiUrl/api/auth/login" -Method POST `
         -ContentType "application/json" `
         -Body (@{ username=$ISP_EMAIL; password=$ISP_PASS } | ConvertTo-Json) `
         -ErrorAction Stop

    $IspToken   = $r.access_token
    $IspTenant  = $r.tenant_id
    if (-not $IspToken) { throw "access_token missing from response" }
    Test-Pass "AUTH" "ISP login OK — role: $($r.role)  tenant: $IspTenant"
} catch {
    Write-Host "  ❌  ISP login FAILED: $(Get-ErrorDetail $_)" -ForegroundColor Red
    exit 1
}

# Build header objects for the rest of the suite
$AdminHeaders = @{ "Authorization"="Bearer $AdminToken"; "Content-Type"="application/json" }
$IspHeaders   = @{ "Authorization"="Bearer $IspToken";   "Content-Type"="application/json" }

# Quick token verification
try {
    $me = Invoke-RestMethod "$ApiUrl/api/auth/me" -Headers $AdminHeaders -ErrorAction Stop
    if ($me.role -eq "platform_admin") {
        Test-Pass "AUTH" "Admin token verified — user: $($me.email)"
    } else {
        Test-Fail "AUTH" "Admin token has wrong role: $($me.role)"
    }
} catch {
    Test-Fail "AUTH" "Admin /me failed: $(Get-ErrorDetail $_)"
}

try {
    $me = Invoke-RestMethod "$ApiUrl/api/auth/me" -Headers $IspHeaders -ErrorAction Stop
    if ($me.role -eq "isp_admin") {
        Test-Pass "AUTH" "ISP token verified — user: $($me.email)"
    } else {
        Test-Fail "AUTH" "ISP token has wrong role: $($me.role)"
    }
} catch {
    Test-Fail "AUTH" "ISP /me failed: $(Get-ErrorDetail $_)"
}

# ============================================================================
# TEST 1  —  ISP DASHBOARD
# ============================================================================

Write-Section "TEST 1 · ISP Dashboard"

try {
    $dash = Invoke-RestMethod "$ApiUrl/api/tenants/dashboard" -Headers $IspHeaders -ErrorAction Stop
    Test-Pass "TEST1" "Dashboard accessible"
    Test-Info "Revenue gross : Ksh $($dash.revenue.gross_ksh)"
    Test-Info "Active sessions: $($dash.active_sessions)"
    Test-Info "Txns today     : $($dash.transactions_today)"
} catch {
    Test-Fail "TEST1" "Dashboard failed: $(Get-ErrorDetail $_)"
}

# ============================================================================
# TEST 2  —  PACKAGE CRUD
# ============================================================================

Write-Section "TEST 2 · Package management"

# List
try {
    $pkgList = Invoke-RestMethod "$ApiUrl/api/packages/mine" -Headers $IspHeaders -ErrorAction Stop
    Test-Pass "TEST2" "List packages — found $(@($pkgList).Count) package(s)"
} catch {
    Test-Fail "TEST2" "List packages failed: $(Get-ErrorDetail $_)"
}

# Create
try {
    $pkgName = "E2E-Pkg-$(Get-Random -Minimum 1000 -Maximum 9999)"
    $body = @{
        name           = $pkgName
        price_ksh      = 50
        duration_hours = 1
        duration_label = "1 Hour"
        display_order  = 99
    } | ConvertTo-Json

    $newPkg = Invoke-RestMethod "$ApiUrl/api/packages" -Method POST `
              -Headers $IspHeaders -Body $body -ErrorAction Stop

    if ($newPkg.id) {
        $script:PackageId = $newPkg.id
        Test-Pass "TEST2" "Created package '$($newPkg.name)' @ Ksh 50  (ID: $($newPkg.id))"
    } else {
        Test-Fail "TEST2" "Create returned no ID"
    }
} catch {
    Test-Fail "TEST2" "Create package failed: $(Get-ErrorDetail $_)"
}

# Verify in list
if ($script:PackageId) {
    try {
        $updated = Invoke-RestMethod "$ApiUrl/api/packages/mine" -Headers $IspHeaders -ErrorAction Stop
        $found   = @($updated) | Where-Object { $_.id -eq $script:PackageId }
        if ($found) {
            Test-Pass "TEST2" "Package confirmed in list after creation"
        } else {
            Test-Fail "TEST2" "Package not found in list after creation"
        }
    } catch {
        Test-Fail "TEST2" "Re-list after create failed: $(Get-ErrorDetail $_)"
    }
}

# ============================================================================
# TEST 3  —  PORTAL & M-PESA CONFIG
# ============================================================================

Write-Section "TEST 3 · Captive portal & M-Pesa"

# Portal renders
try {
    $resp = Invoke-WebRequest "$ApiUrl/portal/$TENANT_SLUG" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
        Test-Pass "TEST3" "Portal HTML renders (HTTP 200) — $($resp.Content.Length) bytes"
    } else {
        Test-Fail "TEST3" "Portal returned HTTP $($resp.StatusCode)"
    }
} catch {
    Test-Fail "TEST3" "Portal render failed: $($_.Exception.Message)"
}

# Package list available to portal (unauthenticated)
try {
    $pubPkgs = Invoke-RestMethod "$ApiUrl/api/packages/$TENANT_SLUG" -ErrorAction Stop
    Test-Pass "TEST3" "Public package list accessible — $(@($pubPkgs).Count) package(s)"
} catch {
    Test-Fail "TEST3" "Public packages endpoint failed: $(Get-ErrorDetail $_)"
}

# M-Pesa config
try {
    $mpesa = Invoke-RestMethod "$ApiUrl/api/mpesa/config" -Headers $IspHeaders -ErrorAction Stop
    if ($mpesa.status -eq "configured") {
        Test-Pass "TEST3" "M-Pesa configured — shortcode: $($mpesa.shortcode)"
    } else {
        Test-Fail "TEST3" "M-Pesa not configured (status: $($mpesa.status))"
    }
} catch {
    Test-Fail "TEST3" "M-Pesa config fetch failed: $(Get-ErrorDetail $_)"
}

# ============================================================================
# TEST 4  —  SESSIONS
# ============================================================================

Write-Section "TEST 4 · Session management"

try {
    $sessions     = Invoke-RestMethod "$ApiUrl/api/sessions" -Headers $IspHeaders -ErrorAction Stop
    $activeCount  = @($sessions | Where-Object { $_.status -eq "active" }).Count
    $pendingCount = @($sessions | Where-Object { $_.status -eq "pending_payment" }).Count
    $expiredCount = @($sessions | Where-Object { $_.status -eq "expired" }).Count

    Test-Pass "TEST4" "Sessions endpoint accessible"
    Test-Info "Total   : $(@($sessions).Count)"
    Test-Info "Active  : $activeCount"
    Test-Info "Pending : $pendingCount"
    Test-Info "Expired : $expiredCount"
} catch {
    Test-Fail "TEST4" "Sessions endpoint failed: $(Get-ErrorDetail $_)"
}

# ============================================================================
# TEST 5  —  TRANSACTIONS
# ============================================================================

Write-Section "TEST 5 · Transaction history"

try {
    $txns = Invoke-RestMethod "$ApiUrl/api/transactions" -Headers $IspHeaders -ErrorAction Stop
    $count = @($txns).Count

    Test-Pass "TEST5" "Transactions endpoint accessible — $count record(s)"

    if ($count -gt 0) {
        $latest = @($txns) | Sort-Object -Property created_at -Descending | Select-Object -First 1
        Test-Info "Latest  : $($latest.status)  Ksh $($latest.amount_ksh)  @ $($latest.created_at)"
    }
} catch {
    Test-Fail "TEST5" "Transactions failed: $(Get-ErrorDetail $_)"
}

# ============================================================================
# TEST 6  —  ADMIN PLATFORM VIEW
# ============================================================================

Write-Section "TEST 6 · Platform admin endpoints"

# ISP list (admin only)
try {
    $isps = Invoke-RestMethod "$ApiUrl/api/admin/isps" -Headers $AdminHeaders -ErrorAction Stop
    Test-Pass "TEST6" "Admin ISP list — $(@($isps).Count) ISP(s)"
} catch {
    Test-Fail "TEST6" "Admin ISP list failed: $(Get-ErrorDetail $_)"
}

# Platform revenue
try {
    $rev = Invoke-RestMethod "$ApiUrl/api/admin/revenue" -Headers $AdminHeaders -ErrorAction Stop
    Test-Pass "TEST6" "Platform revenue endpoint"
    Test-Info "Total revenue: Ksh $($rev.total_ksh)"
} catch {
    Test-Fail "TEST6" "Platform revenue failed: $(Get-ErrorDetail $_)"
}

# Invoices
try {
    $inv = Invoke-RestMethod "$ApiUrl/api/invoices" -Headers $IspHeaders -ErrorAction Stop
    Test-Pass "TEST6" "Invoices endpoint — $(@($inv).Count) invoice(s)"
} catch {
    Test-Fail "TEST6" "Invoices failed: $(Get-ErrorDetail $_)"
}

# ============================================================================
# FINAL REPORT
# ============================================================================

Write-Host ""
Write-Host ""
$line = "─" * 67
Write-Host $line -ForegroundColor Gray
Write-Host "  RESULTS" -ForegroundColor White
Write-Host $line -ForegroundColor Gray

$script:Results | Format-Table `
    @{Name="TAG";     Expression={$_.Tag};     Width=10},
    @{Name="STATUS";  Expression={$_.Status};  Width=8},
    @{Name="MESSAGE"; Expression={$_.Message}; Width=55} `
    -AutoSize

Write-Host $line -ForegroundColor Gray
Write-Host "  Total: $($script:Results.Count)   Passed: $($script:Pass)   Failed: $($script:Fail)" -ForegroundColor White
Write-Host $line -ForegroundColor Gray

if ($script:PackageId) { Write-Host "  Created Package ID : $($script:PackageId)" -ForegroundColor Gray }
if ($script:SessionId) { Write-Host "  Created Session ID : $($script:SessionId)" -ForegroundColor Gray }
Write-Host ""

if ($script:Fail -eq 0) {
    Write-Banner "✅  ALL TESTS PASSED — PLATFORM READY FOR PRODUCTION" "Green"
    Write-Host "  Next steps:" -ForegroundColor Green
    Write-Host "    1.  Deploy backend  → Railway" -ForegroundColor Gray
    Write-Host "    2.  Deploy frontend → Vercel" -ForegroundColor Gray
    Write-Host "    3.  Swap in live Safaricom M-Pesa credentials" -ForegroundColor Gray
    Write-Host "    4.  Point custom domain & go live" -ForegroundColor Gray
} else {
    Write-Banner "⚠  $($script:Fail) TEST(S) FAILED — see table above" "Red"
    Write-Host "  Common fixes:" -ForegroundColor Yellow
    Write-Host "    • 401 errors   → wrong credentials in seed_data.py — re-run seed" -ForegroundColor Gray
    Write-Host "    • 404 errors   → route not registered in app/main.py" -ForegroundColor Gray
    Write-Host "    • 422 errors   → request body shape mismatch — check Pydantic schema" -ForegroundColor Gray
    Write-Host "    • Portal 404   → portal_server.py not running (port 8000 conflict?)" -ForegroundColor Gray
    Write-Host "    • M-Pesa FAIL  → acceptable in dev; only required for live payments" -ForegroundColor Gray
}

Write-Host ""