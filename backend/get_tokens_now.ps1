# GET_TOKENS_NOW.ps1 - WiBill Token Generator
# Gets fresh tokens and stores them in environment variables
# Run from: D:\honestbill\backend

param(
    [string]$ApiUrl       = "http://localhost:8000",
    [string]$AdminEmail   = "admin@xwbill.co.ke",
    [string]$AdminPass    = "admin1234",
    [string]$IspEmail     = "isp@test-isp.co.ke",
    [string]$IspPass      = "isp1234"
)

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "         WiBill Bearer Token Generator v2.1" -ForegroundColor Cyan
Write-Host "  Generates fresh tokens -> Environment Variables + tokens.txt" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Target: $ApiUrl" -ForegroundColor Gray

# ------------------------------------------------------------------
# STEP 1: GET ADMIN TOKEN
# NOTE: /api/auth/login expects form-encoded body (username/password)
#       NOT JSON - this is OAuth2PasswordRequestForm on the backend
# ------------------------------------------------------------------

Write-Host ""
Write-Host "Step 1: Getting Platform Admin Token..." -ForegroundColor Yellow

try {
    $adminResponse = Invoke-RestMethod `
        -Uri "$ApiUrl/api/auth/login" `
        -Method POST `
        -Body @{
            username = $AdminEmail
            password = $AdminPass
        } `
        -ErrorAction Stop

    $adminToken  = $adminResponse.access_token
    $adminRole   = $adminResponse.role
    $adminTenant = $adminResponse.tenant_id

    Write-Host "  [OK] Admin login succeeded" -ForegroundColor Green
    Write-Host "       Email:  $AdminEmail" -ForegroundColor Gray
    Write-Host "       Role:   $adminRole" -ForegroundColor Gray
    Write-Host "       Token:  $($adminToken.Substring(0,50))..." -ForegroundColor Gray

} catch {
    Write-Host "  [FAIL] Admin login failed" -ForegroundColor Red
    Write-Host "         Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Is backend running?  uvicorn app.main:app --reload" -ForegroundColor Gray
    Write-Host "  2. Did seed run?        python -m app.scripts.seed_data" -ForegroundColor Gray
    Write-Host "  3. Are credentials correct? admin@xwbill.co.ke / admin1234" -ForegroundColor Gray
    exit 1
}

# ------------------------------------------------------------------
# STEP 2: GET ISP TOKEN
# ------------------------------------------------------------------

Write-Host ""
Write-Host "Step 2: Getting ISP Admin Token..." -ForegroundColor Yellow

try {
    $ispResponse = Invoke-RestMethod `
        -Uri "$ApiUrl/api/auth/login" `
        -Method POST `
        -Body @{
            username = $IspEmail
            password = $IspPass
        } `
        -ErrorAction Stop

    $ispToken  = $ispResponse.access_token
    $ispRole   = $ispResponse.role
    $ispTenant = $ispResponse.tenant_id

    Write-Host "  [OK] ISP login succeeded" -ForegroundColor Green
    Write-Host "       Email:  $IspEmail" -ForegroundColor Gray
    Write-Host "       Role:   $ispRole" -ForegroundColor Gray
    Write-Host "       Tenant: $ispTenant" -ForegroundColor Gray
    Write-Host "       Token:  $($ispToken.Substring(0,50))..." -ForegroundColor Gray

} catch {
    Write-Host "  [FAIL] ISP login failed" -ForegroundColor Red
    Write-Host "         Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------
# STEP 3: STORE IN ENVIRONMENT VARIABLES
# ------------------------------------------------------------------

Write-Host ""
Write-Host "Step 3: Setting environment variables..." -ForegroundColor Yellow

$env:WIBILL_API          = $ApiUrl
$env:WIBILL_ADMIN_TOKEN  = $adminToken
$env:WIBILL_ADMIN_ROLE   = $adminRole
$env:WIBILL_ADMIN_TENANT = $adminTenant
$env:WIBILL_ISP_TOKEN    = $ispToken
$env:WIBILL_ISP_ROLE     = $ispRole
$env:WIBILL_ISP_TENANT   = $ispTenant

Write-Host "  [OK] WIBILL_API" -ForegroundColor Cyan
Write-Host "  [OK] WIBILL_ADMIN_TOKEN" -ForegroundColor Cyan
Write-Host "  [OK] WIBILL_ADMIN_ROLE" -ForegroundColor Cyan
Write-Host "  [OK] WIBILL_ADMIN_TENANT" -ForegroundColor Cyan
Write-Host "  [OK] WIBILL_ISP_TOKEN" -ForegroundColor Cyan
Write-Host "  [OK] WIBILL_ISP_ROLE" -ForegroundColor Cyan
Write-Host "  [OK] WIBILL_ISP_TENANT" -ForegroundColor Cyan

# ------------------------------------------------------------------
# STEP 4: SAVE TO tokens.txt (for reference / manual use)
# ------------------------------------------------------------------

Write-Host ""
Write-Host "Step 4: Saving tokens to tokens.txt..." -ForegroundColor Yellow

$tokenContent = @"
# WiBill Bearer Tokens - Generated $(Get-Date)
# Valid for approximately 24 hours

# Platform Admin
`$adminToken  = "$adminToken"
`$adminRole   = "$adminRole"
`$adminTenant = "$adminTenant"

# ISP Admin
`$ispToken  = "$ispToken"
`$ispRole   = "$ispRole"
`$ispTenant = "$ispTenant"

# API
`$apiUrl = "$ApiUrl"

# USAGE EXAMPLES:
# Test admin token:
#   `$headers = @{ "Authorization" = "Bearer `$adminToken" }
#   Invoke-RestMethod "`$apiUrl/api/auth/me" -Headers `$headers
#
# List packages as ISP:
#   `$headers = @{ "Authorization" = "Bearer `$ispToken" }
#   Invoke-RestMethod "`$apiUrl/api/packages/mine" -Headers `$headers
"@

$tokenContent | Out-File -FilePath "tokens.txt" -Encoding UTF8
Write-Host "  [OK] Saved to tokens.txt" -ForegroundColor Cyan

# ------------------------------------------------------------------
# STEP 5: VERIFY TOKENS WORK
# ------------------------------------------------------------------

Write-Host ""
Write-Host "Step 5: Verifying tokens against /api/auth/me ..." -ForegroundColor Yellow

try {
    $adminHeaders = @{ "Authorization" = "Bearer $adminToken" }
    $adminMe = Invoke-RestMethod "$ApiUrl/api/auth/me" -Headers $adminHeaders -ErrorAction Stop

    if ($adminMe.role -eq "platform_admin") {
        Write-Host "  [OK] Admin token VALID - $($adminMe.email)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Unexpected admin role: $($adminMe.role)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [FAIL] Admin token verification failed" -ForegroundColor Red
    exit 1
}

try {
    $ispHeaders = @{ "Authorization" = "Bearer $ispToken" }
    $ispMe = Invoke-RestMethod "$ApiUrl/api/auth/me" -Headers $ispHeaders -ErrorAction Stop

    if ($ispMe.role -eq "isp_admin") {
        Write-Host "  [OK] ISP token VALID - $($ispMe.email)" -ForegroundColor Green
        Write-Host "       Tenant: $($ispMe.tenant_id)" -ForegroundColor Gray
    } else {
        Write-Host "  [WARN] Unexpected ISP role: $($ispMe.role)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [FAIL] ISP token verification failed" -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------
# SUMMARY
# ------------------------------------------------------------------

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "         ALL TOKENS GENERATED AND VERIFIED" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green

Write-Host ""
Write-Host "ADMIN TOKEN:" -ForegroundColor Yellow
Write-Host $adminToken -ForegroundColor Cyan

Write-Host ""
Write-Host "ISP TOKEN:" -ForegroundColor Yellow
Write-Host $ispToken -ForegroundColor Cyan

Write-Host ""
Write-Host "API URL: $ApiUrl" -ForegroundColor Yellow

Write-Host ""
Write-Host "Run the full test suite (in this SAME terminal window):" -ForegroundColor Green
Write-Host "  powershell -ExecutionPolicy Bypass -File .\RUN_COMPLETE_TEST_SUITE.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "NOTE: Tokens live in this terminal session only." -ForegroundColor Gray
Write-Host "      If you open a new terminal, run this script again." -ForegroundColor Gray
Write-Host ""