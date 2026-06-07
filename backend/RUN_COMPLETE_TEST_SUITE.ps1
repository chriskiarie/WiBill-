# RUN_COMPLETE_TEST_SUITE.ps1 - WiBill Complete E2E Test Suite
# Self-contained: fetches its own tokens, runs all 6 tests, prints report
# Run from: D:\honestbill\backend

param(
    [string]$ApiUrl     = "http://localhost:8000",
    [string]$AdminEmail = "admin@xwbill.co.ke",
    [string]$AdminPass  = "admin1234",
    [string]$IspEmail   = "isp@test-isp.co.ke",
    [string]$IspPass    = "isp1234",
    [string]$TenantSlug = "test-isp"
)

# ------------------------------------------------------------------
# TRACKING
# ------------------------------------------------------------------

$script:Pass      = 0
$script:Fail      = 0
$script:Results   = @()
$script:PackageId = $null

# ------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------

function T-Pass {
    param([string]$Name, [string]$Msg)
    Write-Host "  [PASS] $Msg" -ForegroundColor Green
    $script:Pass++
    $script:Results += [PSCustomObject]@{ Test=$Name; Status="PASS"; Message=$Msg }
}

function T-Fail {
    param([string]$Name, [string]$Msg)
    Write-Host "  [FAIL] $Msg" -ForegroundColor Red
    $script:Fail++
    $script:Results += [PSCustomObject]@{ Test=$Name; Status="FAIL"; Message=$Msg }
}

function T-Info {
    param([string]$Msg)
    Write-Host "  [INFO] $Msg" -ForegroundColor Cyan
}

function T-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "------------------------------------------------------------" -ForegroundColor Magenta
    Write-Host "  $Title" -ForegroundColor Magenta
    Write-Host "------------------------------------------------------------" -ForegroundColor Magenta
    Write-Host ""
}

function Get-ErrDetail {
    param($Ex)
    try {
        $stream = $Ex.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body   = $reader.ReadToEnd()
        $code   = [int]$Ex.Exception.Response.StatusCode
        if ($body) { return "HTTP ${code}: $body" }
        return "HTTP ${code}"
    } catch {
        return $Ex.Exception.Message
    }
}

# ------------------------------------------------------------------
# BANNER
# ------------------------------------------------------------------

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "         WiBill Complete E2E Test Suite v3.0" -ForegroundColor Magenta
Write-Host "    Self-contained: fetches tokens then runs all 6 tests" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  API URL:      $ApiUrl" -ForegroundColor Gray
Write-Host "  Admin Email:  $AdminEmail" -ForegroundColor Gray
Write-Host "  ISP Email:    $IspEmail" -ForegroundColor Gray
Write-Host "  Tenant Slug:  $TenantSlug" -ForegroundColor Gray

# ------------------------------------------------------------------
# STEP 0: BACKEND HEALTH
# ------------------------------------------------------------------

T-Section "PRE-FLIGHT: BACKEND HEALTH"

try {
    $health = Invoke-RestMethod "$ApiUrl/health" -Method GET -ErrorAction Stop
    if ($health.status -eq "ok") {
        T-Pass "HEALTH" "Backend is healthy"
    } else {
        T-Fail "HEALTH" "Backend unhealthy: $($health.status)"
    }
} catch {
    T-Fail "HEALTH" "Backend unreachable at $ApiUrl - $($_.Exception.Message)"
    Write-Host ""
    Write-Host "  Start the backend first:" -ForegroundColor Yellow
    Write-Host "    uvicorn app.main:app --reload" -ForegroundColor Gray
    exit 1
}

# ------------------------------------------------------------------
# STEP 0b: FETCH TOKENS (form-encoded, matches OAuth2PasswordRequestForm)
# ------------------------------------------------------------------

T-Section "PRE-FLIGHT: FETCHING TOKENS"

Write-Host "  Logging in as admin ($AdminEmail)..." -ForegroundColor Gray

try {
    $adminResp = Invoke-RestMethod `
        -Uri "$ApiUrl/api/auth/login" `
        -Method POST `
        -Body @{ username = $AdminEmail; password = $AdminPass } `
        -ErrorAction Stop

    $AdminToken = $adminResp.access_token
    T-Pass "TOKENS" "Admin token obtained (role: $($adminResp.role))"
} catch {
    T-Fail "TOKENS" "Admin login failed: $(Get-ErrDetail $_)"
    Write-Host ""
    Write-Host "  Cannot continue without admin token." -ForegroundColor Red
    exit 1
}

Write-Host "  Logging in as ISP ($IspEmail)..." -ForegroundColor Gray

try {
    $ispResp = Invoke-RestMethod `
        -Uri "$ApiUrl/api/auth/login" `
        -Method POST `
        -Body @{ username = $IspEmail; password = $IspPass } `
        -ErrorAction Stop

    $IspToken = $ispResp.access_token
    T-Pass "TOKENS" "ISP token obtained (role: $($ispResp.role), tenant: $($ispResp.tenant_id))"
} catch {
    T-Fail "TOKENS" "ISP login failed: $(Get-ErrDetail $_)"
    Write-Host ""
    Write-Host "  Cannot continue without ISP token." -ForegroundColor Red
    exit 1
}

$AdminHeaders = @{
    "Authorization" = "Bearer $AdminToken"
    "Content-Type"  = "application/json"
}

$IspHeaders = @{
    "Authorization" = "Bearer $IspToken"
    "Content-Type"  = "application/json"
}

T-Info "Admin token: $($AdminToken.Substring(0,40))..."
T-Info "ISP token:   $($IspToken.Substring(0,40))..."

# ------------------------------------------------------------------
# TEST 1: ISP ONBOARDING AND AUTHENTICATION
# ------------------------------------------------------------------

T-Section "TEST 1: ISP ONBOARDING AND AUTHENTICATION"

try {
    $me = Invoke-RestMethod "$ApiUrl/api/auth/me" -Headers $AdminHeaders -ErrorAction Stop
    if ($me.role -eq "platform_admin") {
        T-Pass "TEST1" "Admin auth valid: $($me.email)"
    } else {
        T-Fail "TEST1" "Wrong admin role: $($me.role)"
    }
} catch {
    T-Fail "TEST1" "Admin /auth/me failed: $(Get-ErrDetail $_)"
}

try {
    $ispMe = Invoke-RestMethod "$ApiUrl/api/auth/me" -Headers $IspHeaders -ErrorAction Stop
    if ($ispMe.role -eq "isp_admin") {
        T-Pass "TEST1" "ISP auth valid: $($ispMe.email)"
        T-Info "ISP Tenant ID: $($ispMe.tenant_id)"
    } else {
        T-Fail "TEST1" "Wrong ISP role: $($ispMe.role)"
    }
} catch {
    T-Fail "TEST1" "ISP /auth/me failed: $(Get-ErrDetail $_)"
}

try {
    $dashboard = Invoke-RestMethod "$ApiUrl/api/tenants/dashboard" -Headers $IspHeaders -ErrorAction Stop
    T-Pass "TEST1" "ISP dashboard accessible"
    T-Info "Revenue: Ksh $($dashboard.revenue.gross_ksh)"
    T-Info "Active sessions: $($dashboard.active_sessions)"
} catch {
    T-Fail "TEST1" "Dashboard failed: $(Get-ErrDetail $_)"
}

# ------------------------------------------------------------------
# TEST 2: PACKAGE CREATION AND MANAGEMENT
# ------------------------------------------------------------------

T-Section "TEST 2: PACKAGE CREATION AND MANAGEMENT"

try {
    $packages = Invoke-RestMethod "$ApiUrl/api/packages/mine" -Headers $IspHeaders -ErrorAction Stop
    T-Pass "TEST2" "List packages OK: $(@($packages).Count) found"
} catch {
    T-Fail "TEST2" "List packages failed: $(Get-ErrDetail $_)"
}

try {
    $pkgName = "E2E Test Pkg $(Get-Random -Minimum 1000 -Maximum 9999)"
    $pkgBody = @{
        name           = $pkgName
        price_ksh      = 50
        duration_hours = 1
        duration_label = "1 Hour"
        display_order  = 1
    } | ConvertTo-Json

    $newPkg = Invoke-RestMethod "$ApiUrl/api/packages" `
        -Method POST -Headers $IspHeaders -Body $pkgBody -ErrorAction Stop

    if ($newPkg.id) {
        T-Pass "TEST2" "Created package '$($newPkg.name)' @ Ksh 50"
        T-Info "Package ID: $($newPkg.id)"
        $script:PackageId = $newPkg.id
    } else {
        T-Fail "TEST2" "Package created but no ID returned"
    }
} catch {
    T-Fail "TEST2" "Create package failed: $(Get-ErrDetail $_)"
}

if ($script:PackageId) {
    try {
        $pkgList = Invoke-RestMethod "$ApiUrl/api/packages/mine" -Headers $IspHeaders -ErrorAction Stop
        $found   = @($pkgList) | Where-Object { $_.id -eq $script:PackageId }
        if ($found) {
            T-Pass "TEST2" "New package verified in list"
        } else {
            T-Fail "TEST2" "New package not found in list after creation"
        }
    } catch {
        T-Fail "TEST2" "Verify package failed: $(Get-ErrDetail $_)"
    }
}

# ------------------------------------------------------------------
# TEST 3: PORTAL AND PAYMENT FLOW
# ------------------------------------------------------------------

T-Section "TEST 3: PORTAL AND PAYMENT FLOW"

try {
    $portal = Invoke-WebRequest "$ApiUrl/portal/$TenantSlug" -UseBasicParsing -ErrorAction Stop
    if ($portal.StatusCode -eq 200) {
        T-Pass "TEST3" "Portal renders OK ($($portal.Content.Length) bytes)"
    } else {
        T-Fail "TEST3" "Portal returned HTTP $($portal.StatusCode)"
    }
} catch {
    T-Fail "TEST3" "Portal render failed: $($_.Exception.Message)"
}

try {
    $mpesa = Invoke-RestMethod "$ApiUrl/api/mpesa/config" -Headers $IspHeaders -ErrorAction Stop
    if ($mpesa.status -eq "configured") {
        T-Pass "TEST3" "M-Pesa configured (shortcode: $($mpesa.shortcode))"
    } else {
        T-Fail "TEST3" "M-Pesa not configured (status: $($mpesa.status))"
    }
} catch {
    T-Fail "TEST3" "M-Pesa config failed: $(Get-ErrDetail $_)"
}

# ------------------------------------------------------------------
# TEST 4: SESSION MANAGEMENT
# ------------------------------------------------------------------

T-Section "TEST 4: SESSION MANAGEMENT"

try {
    $sessions     = Invoke-RestMethod "$ApiUrl/api/sessions" -Headers $IspHeaders -ErrorAction Stop
    $activeCount  = @($sessions | Where-Object { $_.status -eq "active" }).Count
    $pendingCount = @($sessions | Where-Object { $_.status -eq "pending_payment" }).Count

    T-Pass "TEST4" "Sessions endpoint OK"
    T-Info "Total: $(@($sessions).Count) | Active: $activeCount | Pending: $pendingCount"
} catch {
    T-Fail "TEST4" "Sessions endpoint failed: $(Get-ErrDetail $_)"
}

# ------------------------------------------------------------------
# TEST 5: TRANSACTION HISTORY
# ------------------------------------------------------------------

T-Section "TEST 5: TRANSACTION HISTORY"

try {
    $transactions = Invoke-RestMethod "$ApiUrl/api/transactions" -Headers $IspHeaders -ErrorAction Stop
    $txnCount     = @($transactions).Count

    T-Pass "TEST5" "Transactions endpoint OK ($txnCount records)"

    if ($txnCount -gt 0) {
        $latest = @($transactions) | Sort-Object -Property created_at -Descending | Select-Object -First 1
        T-Info "Latest: $($latest.status) - Ksh $($latest.amount_ksh)"
    }
} catch {
    T-Fail "TEST5" "Transactions failed: $(Get-ErrDetail $_)"
}

# ------------------------------------------------------------------
# TEST 6: DASHBOARD ANALYTICS AND INVOICES
# ------------------------------------------------------------------

T-Section "TEST 6: DASHBOARD ANALYTICS AND INVOICES"

try {
    $dash = Invoke-RestMethod "$ApiUrl/api/tenants/dashboard" -Headers $IspHeaders -ErrorAction Stop
    T-Pass "TEST6" "Dashboard analytics OK"
    T-Info "Revenue: Ksh $($dash.revenue.gross_ksh)"
    T-Info "Active sessions: $($dash.active_sessions)"
    T-Info "Transactions today: $($dash.transactions_today)"
} catch {
    T-Fail "TEST6" "Dashboard analytics failed: $(Get-ErrDetail $_)"
}

try {
    $invoices = Invoke-RestMethod "$ApiUrl/api/invoices" -Headers $IspHeaders -ErrorAction Stop
    T-Pass "TEST6" "Invoices endpoint OK ($(@($invoices).Count) invoices)"
} catch {
    T-Fail "TEST6" "Invoices endpoint failed: $(Get-ErrDetail $_)"
}

# ------------------------------------------------------------------
# FINAL REPORT
# ------------------------------------------------------------------

T-Section "FINAL REPORT"

Write-Host "  Total checks : $($script:Results.Count)" -ForegroundColor White
Write-Host "  Passed       : $($script:Pass)" -ForegroundColor Green
Write-Host "  Failed       : $($script:Fail)" -ForegroundColor $(if ($script:Fail -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($script:Fail -eq 0) {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "   ALL TESTS PASSED - PLATFORM READY FOR PRODUCTION" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor Green
    Write-Host "    1. Deploy backend  -> Railway" -ForegroundColor Gray
    Write-Host "    2. Deploy frontend -> Vercel" -ForegroundColor Gray
    Write-Host "    3. Set live M-Pesa credentials from Safaricom" -ForegroundColor Gray
    Write-Host "    4. Point custom domain to production" -ForegroundColor Gray
} else {
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "   $($script:Fail) TEST(S) FAILED - review details below" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
}

Write-Host ""
Write-Host "  Detailed Results:" -ForegroundColor White
Write-Host "  ----------------------------------------------------------" -ForegroundColor Gray

$script:Results | Format-Table `
    @{Name="TEST";    Expression={$_.Test};    Width=10},
    @{Name="STATUS";  Expression={$_.Status};  Width=6},
    @{Name="MESSAGE"; Expression={$_.Message}; Width=55} `
    -AutoSize

if ($script:PackageId) {
    Write-Host "  Package created this run: $($script:PackageId)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "                   Test Suite Complete" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""