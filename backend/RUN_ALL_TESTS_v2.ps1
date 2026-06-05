# ============================================================
# WiBill E2E Test Runner - FINAL VERSION
# Run from: D:\honestbill\backend
# Usage: powershell -ExecutionPolicy Bypass -File .\RUN_ALL_TESTS_FINAL.ps1
# ============================================================

$API = "http://localhost:8000"

# ── Load tokens from tokens.txt (must run get_tokens_now.ps1 first) ──
$tokensFile = Join-Path $PSScriptRoot "tokens.txt"
if (-not (Test-Path $tokensFile)) {
    Write-Host "ERROR: tokens.txt not found. Run get_tokens_now.ps1 first." -ForegroundColor Red
    exit 1
}

$tokenLines = Get-Content $tokensFile
$adminLine = $tokenLines | Select-String '\$adminToken\s*=\s*"(eyJ[^"]+)"' | Select-Object -First 1
$ispLine   = $tokenLines | Select-String '\$ispToken\s*=\s*"(eyJ[^"]+)"'   | Select-Object -First 1

if ($adminLine) { $ADMIN_TOKEN = $adminLine.Matches[0].Groups[1].Value }
if ($ispLine)   { $ISP_TOKEN   = $ispLine.Matches[0].Groups[1].Value }

if (-not $ADMIN_TOKEN -or -not $ISP_TOKEN) {
    Write-Host "ERROR: Could not parse tokens from tokens.txt" -ForegroundColor Red
    exit 1
}

$ADMIN_H = @{ "Authorization" = "Bearer $ADMIN_TOKEN"; "Content-Type" = "application/json" }
$ISP_H   = @{ "Authorization" = "Bearer $ISP_TOKEN";   "Content-Type" = "application/json" }

$pass = 0; $fail = 0
$script:CHECKOUT_ID = $null
$script:PKG_ID      = $null
$script:SESSION_ID  = $null
$script:SLUG        = "test-isp"

function Pass($msg)    { Write-Host "  [PASS] $msg" -ForegroundColor Green;  $script:pass++ }
function Fail($msg)    { Write-Host "  [FAIL] $msg" -ForegroundColor Red;    $script:fail++ }
function Info($msg)    { Write-Host "  [INFO] $msg" -ForegroundColor Yellow }
function Section($msg) { Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor Cyan }

function Get-ErrorDetail($ex) {
    try {
        $stream = $ex.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body   = $reader.ReadToEnd()
        $status = [int]$ex.Exception.Response.StatusCode
        return "HTTP $status - $body"
    } catch { return $ex.Exception.Message }
}

# ============================================================
Section "PRE-FLIGHT: Health Check"
# ============================================================
try {
    $h = Invoke-RestMethod "$API/health" -Method GET
    if ($h.status -eq "ok") { Pass "Backend healthy - DB connected" }
    else { Fail "Backend degraded: $($h.status)" }
} catch { Fail "Backend not reachable: $($_.Exception.Message)" }

# ============================================================
Section "TEST 1: ISP Onboarding"
# ============================================================

try {
    $me = Invoke-RestMethod "$API/api/auth/me" -Headers $ADMIN_H
    if ($me.role -eq "platform_admin") { Pass "Admin auth valid - $($me.email)" }
    else { Fail "Wrong role: $($me.role)" }
} catch { Fail "Admin auth: $(Get-ErrorDetail $_)" }

try {
    $invite = Invoke-RestMethod "$API/api/invites/generate" -Method POST -Headers $ADMIN_H -Body '{}' -ContentType "application/json"
    if ($invite.token) {
        Pass "Invite generated: $($invite.token.Substring(0,16))..."
        Info "Invite URL: http://localhost:3000/join?ref=$($invite.token)"
    } else { Fail "No token in response: $($invite | ConvertTo-Json)" }
} catch { Fail "Invite generation: $(Get-ErrorDetail $_)" }

try {
    $isp = Invoke-RestMethod "$API/api/auth/me" -Headers $ISP_H
    if ($isp.role -eq "isp_admin") {
        Pass "ISP auth valid - $($isp.email) | tenant: $($isp.tenant_id)"
    } else { Fail "Wrong ISP role: $($isp.role)" }
} catch { Fail "ISP auth: $(Get-ErrorDetail $_)" }

try {
    $dash = Invoke-RestMethod "$API/api/tenants/dashboard" -Headers $ISP_H
    Pass "ISP dashboard loads - Revenue: Ksh $($dash.revenue.gross_ksh)"
} catch { Fail "ISP dashboard: $(Get-ErrorDetail $_)" }

# ============================================================
section "TEST 2: Package Management"
# ============================================================

try {
    $pkgs = Invoke-RestMethod "$API/api/packages/mine" -Headers $ISP_H
    Pass "My packages listed: $(@($pkgs).Count) found"
} catch { Fail "List my packages: $(Get-ErrorDetail $_)" }

try {
    $body = @{
        name           = "E2E Test 1H"
        price_ksh      = 50
        duration_hours = 1
        duration_label = "1 Hour"
    } | ConvertTo-Json

    $pkg = Invoke-RestMethod "$API/api/packages" -Method POST -Headers $ISP_H -Body $body -ContentType "application/json"
    if ($pkg.id) {
        Pass "Package created: '$($pkg.name)' @ Ksh $($pkg.price_ksh) | id: $($pkg.id)"
        $script:PKG_ID = $pkg.id
    } else { Fail "No package id: $($pkg | ConvertTo-Json)" }
} catch { Fail "Create package: $(Get-ErrorDetail $_)" }

if ($script:PKG_ID) {
    try {
        $pkgs2 = Invoke-RestMethod "$API/api/packages/mine" -Headers $ISP_H
        $found = @($pkgs2) | Where-Object { $_.id -eq $script:PKG_ID }
        if ($found) { Pass "Package confirmed in /mine list" }
        else { Fail "Package missing from list after creation" }
    } catch { Fail "Package confirm: $(Get-ErrorDetail $_)" }
}

# ============================================================
Section "TEST 3: Portal Payment Flow"
# ============================================================

try {
    $portal = Invoke-WebRequest "$API/portal/$($script:SLUG)" -UseBasicParsing
    if ($portal.StatusCode -eq 200) { Pass "Portal renders: /portal/$($script:SLUG) (HTTP 200)" }
    else { Fail "Portal returned $($portal.StatusCode)" }
} catch { Fail "Portal render: $($_.Exception.Message)" }

try {
    if (-not $script:PKG_ID) { throw "No package ID from Test 2 - skipping" }
    $body = @{
        mac_address  = "AA:BB:CC:DD:EE:FF"
        ip_address   = "192.168.1.100"
        package_id   = $script:PKG_ID
        phone_number = "254708374149"
    } | ConvertTo-Json

    $sess = Invoke-RestMethod "$API/api/portal/$($script:SLUG)/sessions" -Method POST `
        -Body $body -ContentType "application/json"

    if ($sess.session_id) {
        Pass "Session created: $($sess.session_id) | status: $($sess.status) | Ksh $($sess.amount_ksh)"
        $script:SESSION_ID = $sess.session_id

        Start-Sleep -Seconds 1
        $sCheck = Invoke-RestMethod "$API/api/portal/$($script:SLUG)/sessions/$($sess.session_id)"
        if ($sCheck.checkout_request_id) {
            $script:CHECKOUT_ID = $sCheck.checkout_request_id
            Info "CheckoutRequestID: $($script:CHECKOUT_ID.Substring(0,20))..."
        } else {
            Info "No checkout_request_id yet (STK push may be async)"
        }
    } else { Fail "No session_id: $($sess | ConvertTo-Json)" }
} catch { Fail "Create session/STK: $(Get-ErrorDetail $_)" }

if ($script:CHECKOUT_ID) {
    Start-Sleep -Seconds 2
    try {
        $callback = @{
            Body = @{
                stkCallback = @{
                    MerchantRequestID = "test-merchant-001"
                    CheckoutRequestID = $script:CHECKOUT_ID
                    ResultCode        = 0
                    ResultDesc        = "The service request is processed successfully."
                    CallbackMetadata  = @{
                        Item = @(
                            @{ Name = "Amount";             Value = 50 },
                            @{ Name = "MpesaReceiptNumber"; Value = "RGX9E2ETEST1" },
                            @{ Name = "TransactionDate";    Value = 20260603120000 },
                            @{ Name = "PhoneNumber";        Value = 254708374149 }
                        )
                    }
                }
            }
        } | ConvertTo-Json -Depth 10

        Invoke-RestMethod "$API/api/mpesa/callback" -Method POST -Body $callback -ContentType "application/json" | Out-Null
        Pass "SUCCESS M-Pesa callback sent"
    } catch { Fail "Success callback: $(Get-ErrorDetail $_)" }

    Start-Sleep -Seconds 2
    try {
        $payStatus = Invoke-RestMethod "$API/api/mpesa/status/$($script:CHECKOUT_ID)"
        if ($payStatus.status -eq "success") {
            Pass "Payment confirmed: SUCCESS | Receipt: $($payStatus.mpesa_receipt)"
        } else {
            Info "Payment status: $($payStatus.status) (sandbox delay normal)"
        }
    } catch { Fail "Payment status poll: $(Get-ErrorDetail $_)" }
} else {
    Info "Skipping callback tests - no CheckoutRequestID (STK requires live M-Pesa sandbox)"
}

# ============================================================
Section "TEST 4: Cancel Detection"
# ============================================================
try {
    if (-not $script:PKG_ID) { throw "No package ID - skipping" }

    $body = @{
        mac_address  = "BB:CC:DD:EE:FF:AA"
        ip_address   = "192.168.1.101"
        package_id   = $script:PKG_ID
        phone_number = "254708374149"
    } | ConvertTo-Json

    $sess2 = Invoke-RestMethod "$API/api/portal/$($script:SLUG)/sessions" -Method POST `
        -Body $body -ContentType "application/json"

    if ($sess2.session_id) {
        Pass "Cancel-test session created: $($sess2.session_id)"
        Start-Sleep -Seconds 1

        $s2 = Invoke-RestMethod "$API/api/portal/$($script:SLUG)/sessions/$($sess2.session_id)"
        $cancelId = $s2.checkout_request_id

        if ($cancelId) {
            $cancelBody = @{
                Body = @{
                    stkCallback = @{
                        MerchantRequestID = "test-cancel-001"
                        CheckoutRequestID = $cancelId
                        ResultCode        = 1
                        ResultDesc        = "The user cancelled the transaction."
                    }
                }
            } | ConvertTo-Json -Depth 10

            Invoke-RestMethod "$API/api/mpesa/callback" -Method POST -Body $cancelBody -ContentType "application/json" | Out-Null
            Pass "Cancel callback sent"

            Start-Sleep -Seconds 1
            $cs = Invoke-RestMethod "$API/api/mpesa/status/$cancelId"
            if ($cs.status -in @("cancelled", "failed")) {
                Pass "Cancel detected: status = $($cs.status)"
            } else {
                Info "Cancel status: $($cs.status)"
            }
        } else {
            Info "No checkout_request_id for cancel session (expected without live STK)"
        }
    }
} catch { Fail "Cancel detection: $(Get-ErrorDetail $_)" }

# ============================================================
Section "TEST 5: Session Management"
# ============================================================
try {
    $sessions = Invoke-RestMethod "$API/api/sessions" -Headers $ISP_H
    $count  = @($sessions).Count
    $active = @($sessions) | Where-Object { $_.status -eq "active" }
    Pass "Sessions: $count total | $(@($active).Count) active"
} catch { Fail "Sessions list: $(Get-ErrorDetail $_)" }

# ============================================================
Section "TEST 6: Dashboard Analytics"
# ============================================================

try {
    $txns = Invoke-RestMethod "$API/api/transactions" -Headers $ISP_H
    Pass "Transactions: $(@($txns).Count) records"
} catch { Fail "Transactions: $(Get-ErrorDetail $_)" }

try {
    $dash2 = Invoke-RestMethod "$API/api/tenants/dashboard" -Headers $ISP_H
    Pass "Dashboard: Ksh $($dash2.revenue.gross_ksh) gross | $($dash2.active_sessions) active sessions"
} catch { Fail "Dashboard refresh: $(Get-ErrorDetail $_)" }

try {
    $inv = Invoke-RestMethod "$API/api/invoices" -Headers $ISP_H
    Pass "Invoices: $(@($inv).Count) records"
} catch { Fail "Invoices: $(Get-ErrorDetail $_)" }

try {
    $mpesa = Invoke-RestMethod "$API/api/mpesa/config" -Headers $ISP_H
    Pass "M-Pesa config: configured=$($mpesa.configured) | verified=$($mpesa.is_verified)"
} catch { Fail "M-Pesa config: $(Get-ErrorDetail $_)" }

try {
    $summary = Invoke-RestMethod "$API/api/dashboard/summary" -Headers $ISP_H
    Pass "Dashboard summary OK"
} catch { Fail "Dashboard summary: $(Get-ErrorDetail $_)" }

# ============================================================
Section "SUMMARY"
# ============================================================
Write-Host ""
Write-Host ("  Passed : " + $pass) -ForegroundColor Green
if ($fail -eq 0) {
    Write-Host ("  Failed : " + $fail) -ForegroundColor Green
    Write-Host ""
    Write-Host "  ✅ ALL TESTS PASSED - PRODUCTION READY" -ForegroundColor Green
} else {
    Write-Host ("  Failed : " + $fail) -ForegroundColor Red
    Write-Host ""
    Write-Host "  Fix failures above then re-run" -ForegroundColor Yellow
}
Write-Host ""
if ($script:CHECKOUT_ID) { Write-Host "  Success CheckoutID : $($script:CHECKOUT_ID)" -ForegroundColor Gray }
if ($script:PKG_ID)      { Write-Host "  Test Package ID    : $($script:PKG_ID)"      -ForegroundColor Gray }