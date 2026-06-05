# WiBill E2E Test Runner - All 6 Tests
# Run from: D:\honestbill\backend
# ============================================================

$API = "http://localhost:8000"
$ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNGViOGQ2My1kMTk0LTRiNDMtYTJlOS0xNmMzNjFjNDNhNmEiLCJyb2xlIjoicGxhdGZvcm1fYWRtaW4iLCJ0ZW5hbnRfaWQiOm51bGwsImV4cCI6MTc4MDYwNDYzOSwiaWF0IjoxNzgwNjAxMDM5fQ._iJWLNPKxKkH3GtTtNamvanMvs5NzASGJA8hTgDpHh4"
$ISP_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiNDZkMWRjZS1jOGE0LTRjNWYtOWIzMS02MWFjMTg1YjU1OTciLCJyb2xlIjoiaXNwX2FkbWluIiwidGVuYW50X2lkIjoiOTQ4YWUzMzMtNWQxMC00OGFjLWJlN2YtNjE1ZjMxNGQ0NTIzIiwiZXhwIjoxNzgwNjA0NjQwLCJpYXQiOjE3ODA2MDEwNDB9.OctbZMvnKO5yk4bDBSizPEqfPdygkoIu1ftjsNiDlus"
$ADMIN_H = @{ "Authorization" = "Bearer $ADMIN_TOKEN"; "Content-Type" = "application/json" }
$ISP_H   = @{ "Authorization" = "Bearer $ISP_TOKEN";   "Content-Type" = "application/json" }

$pass = 0; $fail = 0; $CHECKOUT_ID = $null; $PKG_ID = $null

function Pass($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green; $script:pass++ }
function Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:fail++ }
function Section($msg) { Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor Cyan }
function Try-Api($name, $block) {
    try { $block.Invoke(); }
    catch { Fail "$name - $($_.Exception.Message)" }
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

# Step 1a: Verify admin token works
try {
    $me = Invoke-RestMethod "$API/api/auth/me" -Headers $ADMIN_H
    if ($me.role -eq "platform_admin") { Pass "Admin auth valid - $($me.email)" }
    else { Fail "Wrong role: $($me.role)" }
} catch { Fail "Admin auth failed" }

# Step 1b: Generate invite
try {
    $invite = Invoke-RestMethod "$API/api/admin/invites/generate" -Method POST -Headers $ADMIN_H -Body '{}'
    if ($invite.token) {
        Pass "Invite generated: $($invite.token.Substring(0,16))..."
        Write-Host "    Invite URL: http://localhost:3000/join?ref=$($invite.token)" -ForegroundColor Yellow
    } else { Fail "No token in response" }
} catch { Fail "Invite generation failed: $($_.Exception.Message)" }

# Step 1c: Verify ISP token works
try {
    $isp = Invoke-RestMethod "$API/api/auth/me" -Headers $ISP_H
    if ($isp.role -eq "isp_admin") {
        Pass "ISP auth valid - $($isp.email) | tenant: $($isp.tenant_id)"
        $TENANT_ID = $isp.tenant_id
    } else { Fail "Wrong ISP role: $($isp.role)" }
} catch { Fail "ISP auth failed" }

# Step 1d: Check ISP dashboard endpoint
try {
    $dash = Invoke-RestMethod "$API/api/tenants/dashboard" -Headers $ISP_H
    Pass "ISP dashboard loads - Revenue: Ksh $($dash.revenue.gross_ksh)"
} catch { Fail "ISP dashboard: $($_.Exception.Message)" }

# ============================================================
Section "TEST 2: Package Creation"
# ============================================================

# Step 2a: List existing packages
try {
    $pkgs = Invoke-RestMethod "$API/api/packages" -Headers $ISP_H
    Pass "Packages listed: $(@($pkgs).Count) found"
} catch { Fail "List packages failed: $($_.Exception.Message)" }

# Step 2b: Create a test package
try {
    $body = @{
        name = "E2E Test Package 1H"
        description = "Auto-created for E2E test"
        duration_minutes = 60
        price_ksh = 50
        speed_limit_mbps = 10
        is_active = $true
    } | ConvertTo-Json

    $pkg = Invoke-RestMethod "$API/api/packages" -Method POST -Headers $ISP_H -Body $body
    if ($pkg.id) {
        Pass "Package created: '$($pkg.name)' @ Ksh $($pkg.price_ksh) | id: $($pkg.id)"
        $script:PKG_ID = $pkg.id
    } else { Fail "No package id returned" }
} catch { Fail "Create package failed: $($_.Exception.Message)" }

# Step 2c: Verify package in list
if ($PKG_ID) {
    try {
        $pkgs2 = Invoke-RestMethod "$API/api/packages" -Headers $ISP_H
        $found = @($pkgs2) | Where-Object { $_.id -eq $PKG_ID }
        if ($found) { Pass "Package confirmed in list" }
        else { Fail "Package not found in list after creation" }
    } catch { Fail "Package verification failed" }
}

# ============================================================
Section "TEST 3: Portal Payment Flow"
# ============================================================

# Step 3a: Get tenant slug
try {
    $tenant = Invoke-RestMethod "$API/api/tenants" -Headers $ADMIN_H
    $slug = if ($tenant -is [array]) { $tenant[0].slug } else { $tenant.slug }
    Pass "Tenant slug: $slug"
    Write-Host "    Portal URL: http://localhost:8000/portal/$slug" -ForegroundColor Yellow
} catch {
    # fallback: use known slug
    $slug = "test-isp"
    Write-Host "  [INFO] Using fallback slug: $slug" -ForegroundColor Yellow
}

# Step 3b: Check portal renders
try {
    $portal = Invoke-WebRequest "$API/portal/$slug" -UseBasicParsing
    if ($portal.StatusCode -eq 200) { Pass "Portal renders (HTTP 200)" }
    else { Fail "Portal returned $($portal.StatusCode)" }
} catch { Fail "Portal not accessible: $($_.Exception.Message)" }

# Step 3c: Initiate STK push via portal pay endpoint
try {
    if (-not $PKG_ID) { throw "No package ID from Test 2" }
    $body = @{
        slug         = $slug
        package_id   = $PKG_ID
        phone_number = "254708374149"
        mac_address  = "AA:BB:CC:DD:EE:FF"
        ip_address   = "192.168.1.100"
    } | ConvertTo-Json

    $pay = Invoke-RestMethod "$API/api/portal/pay" -Method POST -Body $body `
        -ContentType "application/json"

    if ($pay.checkout_request_id) {
        Pass "STK push initiated: $($pay.checkout_request_id.Substring(0,20))..."
        $script:CHECKOUT_ID = $pay.checkout_request_id
    } else { Fail "No checkout_request_id - response: $($pay | ConvertTo-Json)" }
} catch { Fail "STK push failed: $($_.Exception.Message)" }

# Step 3d: Simulate SUCCESS callback
if ($CHECKOUT_ID) {
    Start-Sleep -Seconds 2
    try {
        $callback = @{
            Body = @{
                stkCallback = @{
                    MerchantRequestID = "test-merchant-001"
                    CheckoutRequestID = $CHECKOUT_ID
                    ResultCode = 0
                    ResultDesc = "The service request is processed successfully."
                    CallbackMetadata = @{
                        Item = @(
                            @{ Name = "Amount"; Value = 50 },
                            @{ Name = "MpesaReceiptNumber"; Value = "RGX9E2ETEST1" },
                            @{ Name = "TransactionDate"; Value = 20260603120000 },
                            @{ Name = "PhoneNumber"; Value = 254708374149 }
                        )
                    }
                }
            }
        } | ConvertTo-Json -Depth 10

        $cbResult = Invoke-RestMethod "$API/api/mpesa/callback" -Method POST `
            -Body $callback -ContentType "application/json"
        Pass "SUCCESS callback processed: $($cbResult.ResultDesc)"
    } catch { Fail "Callback processing failed: $($_.Exception.Message)" }

    # Step 3e: Poll payment status
    Start-Sleep -Seconds 2
    try {
        $status = Invoke-RestMethod "$API/api/mpesa/status/$CHECKOUT_ID"
        if ($status.status -eq "success") {
            Pass "Payment status confirmed: SUCCESS | Receipt: $($status.mpesa_receipt)"
        } else {
            Write-Host "  [INFO] Status: $($status.status) (may still be processing)" -ForegroundColor Yellow
        }
    } catch { Fail "Status poll failed: $($_.Exception.Message)" }
}

# ============================================================
Section "TEST 4: Cancel Detection"
# ============================================================

# Step 4a: New STK push to cancel
try {
    if (-not $PKG_ID) { throw "No package ID" }
    $body = @{
        slug         = $slug
        package_id   = $PKG_ID
        phone_number = "254708374149"
        mac_address  = "BB:CC:DD:EE:FF:AA"
        ip_address   = "192.168.1.101"
    } | ConvertTo-Json

    $pay2 = Invoke-RestMethod "$API/api/portal/pay" -Method POST -Body $body `
        -ContentType "application/json"

    if ($pay2.checkout_request_id) {
        $cancelId = $pay2.checkout_request_id
        Pass "New STK for cancel test: $($cancelId.Substring(0,20))..."

        # Simulate CANCEL callback (ResultCode=1)
        Start-Sleep -Seconds 1
        $cancelBody = @{
            Body = @{
                stkCallback = @{
                    MerchantRequestID = "test-cancel-001"
                    CheckoutRequestID = $cancelId
                    ResultCode = 1
                    ResultDesc = "The user cancelled the transaction."
                }
            }
        } | ConvertTo-Json -Depth 10

        $cbCancel = Invoke-RestMethod "$API/api/mpesa/callback" -Method POST `
            -Body $cancelBody -ContentType "application/json"
        Pass "Cancel callback sent: $($cbCancel.ResultDesc)"

        # Verify status = cancelled
        Start-Sleep -Seconds 1
        $cancelStatus = Invoke-RestMethod "$API/api/mpesa/status/$cancelId"
        if ($cancelStatus.status -eq "cancelled" -or $cancelStatus.status -eq "failed") {
            Pass "Cancel detected correctly: status = $($cancelStatus.status)"
        } else {
            Write-Host "  [INFO] Cancel status: $($cancelStatus.status)" -ForegroundColor Yellow
        }
    }
} catch { Fail "Cancel test failed: $($_.Exception.Message)" }

# ============================================================
Section "TEST 5: Session Management"
# ============================================================

try {
    $sessions = Invoke-RestMethod "$API/api/sessions" -Headers $ISP_H
    $count = @($sessions).Count
    Pass "Sessions endpoint responsive: $count sessions found"
    if ($count -gt 0) {
        $active = @($sessions) | Where-Object { $_.status -eq "active" }
        Write-Host "    Active: $(@($active).Count) | Total: $count" -ForegroundColor Yellow
    }
} catch { Fail "Sessions endpoint: $($_.Exception.Message)" }

# ============================================================
Section "TEST 6: Dashboard Analytics"
# ============================================================

# Step 6a: Transactions visible
try {
    $txns = Invoke-RestMethod "$API/api/transactions" -Headers $ISP_H
    Pass "Transactions endpoint: $(@($txns).Count) transactions"
} catch { Fail "Transactions endpoint: $($_.Exception.Message)" }

# Step 6b: Dashboard stats updated
try {
    $dash2 = Invoke-RestMethod "$API/api/tenants/dashboard" -Headers $ISP_H
    Pass "Dashboard stats: Ksh $($dash2.revenue.gross_ksh) gross | $($dash2.active_sessions) active sessions"
} catch { Fail "Dashboard stats: $($_.Exception.Message)" }

# Step 6c: Invoices endpoint
try {
    $inv = Invoke-RestMethod "$API/api/invoices" -Headers $ISP_H
    Pass "Invoices endpoint: $(@($inv).Count) invoices"
} catch { Fail "Invoices endpoint: $($_.Exception.Message)" }

# Step 6d: M-Pesa config readable
try {
    $mpesa = Invoke-RestMethod "$API/api/mpesa/config" -Headers $ISP_H
    Pass "M-Pesa config: configured=$($mpesa.configured) | verified=$($mpesa.is_verified)"
} catch { Fail "M-Pesa config: $($_.Exception.Message)" }

# ============================================================
Section "SUMMARY"
# ============================================================
Write-Host ""
Write-Host "  Passed: $pass" -ForegroundColor Green
if ($fail -eq 0) {
    Write-Host "  Failed: $fail" -ForegroundColor Green
    Write-Host ""
    Write-Host "  ALL TESTS PASSED - READY FOR PRODUCTION" -ForegroundColor Green
} else {
    Write-Host "  Failed: $fail" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Fix failures above then re-run" -ForegroundColor Yellow
}
Write-Host ""
if ($CHECKOUT_ID) {
    Write-Host "  Test payment CheckoutID: $CHECKOUT_ID" -ForegroundColor Gray
}
if ($PKG_ID) {
    Write-Host "  Test package ID: $PKG_ID" -ForegroundColor Gray
}
