# verify_fixes.ps1
# Run from: D:\honestbill\backend\

$API = "http://localhost:8000"
$pass = 0
$fail = 0

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  WIBILL - VERIFICATION AFTER FIXES" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Get tokens
Write-Host ""
Write-Host "Getting tokens..." -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod "$API/api/auth/login" -Method POST -Body @{username="admin@xwbill.co.ke"; password="admin1234"}
    $adminTok = $r.access_token
    $r2 = Invoke-RestMethod "$API/api/auth/login" -Method POST -Body @{username="isp@test-isp.co.ke"; password="isp1234"}
    $ispTok = $r2.access_token
    Write-Host "Tokens OK." -ForegroundColor Green
} catch {
    Write-Host "Cannot get tokens - is the backend running?" -ForegroundColor Red
    exit 1
}

$adminH = @{Authorization="Bearer $adminTok"}
$ispH   = @{Authorization="Bearer $ispTok"}
$jsonH  = @{Authorization="Bearer $ispTok"; "Content-Type"="application/json"}

# CHECK 1: Health
Write-Host ""
Write-Host "CHECK 1: GET /health" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod "$API/health"
    Write-Host "  [PASS] /health - database: $($r.database)" -ForegroundColor Green
    $pass++
} catch {
    Write-Host "  [FAIL] /health - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# CHECK 2: Transactions (was 500)
Write-Host ""
Write-Host "CHECK 2: GET /api/transactions (was 500)" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod "$API/api/transactions" -Headers $ispH
    Write-Host "  [PASS] /api/transactions - returned $($r.Count) records" -ForegroundColor Green
    $pass++
} catch {
    Write-Host "  [FAIL] /api/transactions - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# CHECK 3: Sessions
Write-Host ""
Write-Host "CHECK 3: GET /api/sessions" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod "$API/api/sessions" -Headers $ispH
    Write-Host "  [PASS] /api/sessions - returned $($r.Count) records" -ForegroundColor Green
    $pass++
} catch {
    Write-Host "  [FAIL] /api/sessions - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# CHECK 4: Dashboard (was 400)
Write-Host ""
Write-Host "CHECK 4: GET /api/tenants/dashboard (was 400)" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod "$API/api/tenants/dashboard" -Headers $ispH
    Write-Host "  [PASS] /api/tenants/dashboard - OK" -ForegroundColor Green
    $pass++
} catch {
    Write-Host "  [FAIL] /api/tenants/dashboard - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# CHECK 5: Packages POST (was 405)
Write-Host ""
Write-Host "CHECK 5: POST /api/packages (was 405)" -ForegroundColor Yellow
try {
    $body = '{"name":"Verify Test","price_ksh":10,"duration_hours":1,"duration_label":"1 Hour","max_devices":1}'
    $r = Invoke-RestMethod "$API/api/packages" -Method POST -Headers $jsonH -Body $body
    Write-Host "  [PASS] POST /api/packages - created id: $($r.id)" -ForegroundColor Green
    $pass++
} catch {
    Write-Host "  [FAIL] POST /api/packages - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# CHECK 6: Invoice status
Write-Host ""
Write-Host "CHECK 6: GET /api/invoices/current-status" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod "$API/api/invoices/current-status" -Headers $ispH
    Write-Host "  [PASS] /api/invoices/current-status - status: $($r.status)" -ForegroundColor Green
    $pass++
} catch {
    Write-Host "  [FAIL] /api/invoices/current-status - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}

# SUMMARY
Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  PASSED: $pass   FAILED: $fail" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Red"})
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

if ($fail -eq 0) {
    Write-Host "All clear. Paste output here - ready for STK callback simulation." -ForegroundColor Green
} else {
    Write-Host "Fix the failures above then re-run this script." -ForegroundColor Red
}
Write-Host ""