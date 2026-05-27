# PHASE 3: COMPLETE SESSION TESTING

Write-Host ""
Write-Host "PHASE 3: COMPLETE SESSION WORKFLOW TESTING" -ForegroundColor Cyan
Write-Host ""

$BackendUrl = "http://localhost:8000"
$TenantUUID = "948ae333-5d10-48ac-be7f-615f314d4523"
$TenantSlug = "test-isp"
$MacAddress = "AA:BB:CC:DD:EE:FF"
$IpAddress = "192.168.1.100"
$PhoneNumber = "254712345678"
$AdminUsername = "admin@xwbill.co.ke"
$AdminPassword = "admin1234"

$PassCount = 0
$FailCount = 0

Write-Host "[0] Verify Backend Connection..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$BackendUrl/health" -ErrorAction Stop
    Write-Host "SUCCESS: Backend running" -ForegroundColor Green
    Write-Host "  Status: $($health.status) | DB: $($health.database)" -ForegroundColor Gray
    $PassCount++
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "[1] Get JWT Token..." -ForegroundColor Cyan
try {
    $loginResp = Invoke-RestMethod `
        -Uri "$BackendUrl/api/auth/login" `
        -Method POST `
        -Body @{ username = $AdminUsername; password = $AdminPassword } `
        -ErrorAction Stop
    
    $AuthToken = $loginResp.access_token
    Write-Host "SUCCESS: JWT token obtained" -ForegroundColor Green
    Write-Host "  Token: $($AuthToken.Substring(0, 30))..." -ForegroundColor Gray
    $PassCount++
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "[2] Fetch Packages..." -ForegroundColor Cyan
try {
    $Headers = @{
        "Authorization" = "Bearer $AuthToken"
        "Content-Type" = "application/json"
    }
    
    $pkgResp = Invoke-RestMethod `
        -Uri "$BackendUrl/api/packages/list?tenant_id=$TenantUUID" `
        -Headers $Headers `
        -ErrorAction Stop
    
    Write-Host "SUCCESS: Packages fetched" -ForegroundColor Green
    Write-Host "  Total: $($pkgResp.count)" -ForegroundColor Gray
    
    foreach ($pkg in $pkgResp.packages) {
        Write-Host "  - $($pkg.name): KSH $($pkg.price_ksh)" -ForegroundColor Gray
    }
    
    $PackageId = $pkgResp.packages[0].id
    Write-Host "  Using: $PackageId" -ForegroundColor Green
    $PassCount++
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
    exit
}

Write-Host ""
Write-Host "[3] Create Session..." -ForegroundColor Cyan
try {
    $sessionBody = @{
        mac_address = $MacAddress
        ip_address = $IpAddress
        package_id = $PackageId
        phone_number = $PhoneNumber
    } | ConvertTo-Json
    
    $sessionResp = Invoke-RestMethod `
        -Uri "$BackendUrl/api/portal/$TenantSlug/sessions" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $sessionBody `
        -ErrorAction Stop
    
    $SessionId = $sessionResp.session_id
    Write-Host "SUCCESS: Session created" -ForegroundColor Green
    Write-Host "  Session ID: $SessionId" -ForegroundColor Gray
    Write-Host "  Status: $($sessionResp.status)" -ForegroundColor Gray
    Write-Host "  Amount: KSH $($sessionResp.amount_ksh)" -ForegroundColor Gray
    $PassCount++
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
    exit
}

Write-Host ""
Write-Host "[4] Check Pending Status..." -ForegroundColor Cyan
try {
    $pendingResp = Invoke-RestMethod `
        -Uri "$BackendUrl/api/portal/$TenantSlug/sessions/$SessionId" `
        -Method GET `
        -ErrorAction Stop
    
    Write-Host "SUCCESS: Status retrieved" -ForegroundColor Green
    Write-Host "  Status: $($pendingResp.status)" -ForegroundColor Gray
    Write-Host "  Message: $($pendingResp.message)" -ForegroundColor Gray
    $PassCount++
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Write-Host ""
Write-Host "[5] Activate Session..." -ForegroundColor Cyan
try {
    $activateResp = Invoke-RestMethod `
        -Uri "$BackendUrl/api/portal/$TenantSlug/sessions/$SessionId/activate" `
        -Method POST `
        -ErrorAction Stop
    
    Write-Host "SUCCESS: Session activated" -ForegroundColor Green
    Write-Host "  Status: $($activateResp.status)" -ForegroundColor Gray
    Write-Host "  Message: $($activateResp.message)" -ForegroundColor Gray
    $PassCount++
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Write-Host ""
Write-Host "[6] Check Active Status..." -ForegroundColor Cyan
try {
    $activeResp = Invoke-RestMethod `
        -Uri "$BackendUrl/api/portal/$TenantSlug/sessions/$SessionId" `
        -Method GET `
        -ErrorAction Stop
    
    Write-Host "SUCCESS: Active status retrieved" -ForegroundColor Green
    Write-Host "  Status: $($activeResp.status)" -ForegroundColor Gray
    Write-Host "  Message: $($activeResp.message)" -ForegroundColor Gray
    $PassCount++
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Write-Host ""
Write-Host "[7] Load Portal Page..." -ForegroundColor Cyan
try {
    $portalResp = Invoke-WebRequest `
        -Uri "$BackendUrl/portal/$TenantSlug" `
        -ErrorAction Stop
    
    Write-Host "SUCCESS: Portal loaded" -ForegroundColor Green
    Write-Host "  Status: $($portalResp.StatusCode)" -ForegroundColor Gray
    Write-Host "  Size: $($portalResp.Content.Length) bytes" -ForegroundColor Gray
    $PassCount++
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Passed: $PassCount" -ForegroundColor Green
Write-Host "Failed: $FailCount" -ForegroundColor Red
Write-Host ""

if ($FailCount -eq 0) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
}
else {
    Write-Host "Some tests failed" -ForegroundColor Yellow
}

Write-Host ""