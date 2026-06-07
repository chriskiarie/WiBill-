# WiBill Invite Generation Diagnostic
# Run this to see EXACTLY what's failing

Write-Host ""
Write-Host "╔═════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     WiBill Invite Generation Diagnostic Tool            ║" -ForegroundColor Cyan
Write-Host "╚═════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Get Token
# ============================================================================

Write-Host "STEP 1: Getting admin token..." -ForegroundColor Yellow

$API = "http://localhost:8000"  # LOCAL testing only
$ADMIN_EMAIL = "admin@xwbill.co.ke"
$ADMIN_PASS = "admin1234"

try {
    $loginBody = @{
        username = $ADMIN_EMAIL
        password = $ADMIN_PASS
    } | ConvertTo-Json

    $loginResp = Invoke-RestMethod -Uri "$API/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    $token = $loginResp.access_token
    $role = $loginResp.role

    Write-Host "✓ Token obtained" -ForegroundColor Green
    Write-Host "  Email: $ADMIN_EMAIL" -ForegroundColor Gray
    Write-Host "  Role: $role" -ForegroundColor Gray
    Write-Host "  Token: $($token.Substring(0,50))..." -ForegroundColor Gray

} catch {
    Write-Host "✗ Failed to get token" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if ($role -ne "platform_admin") {
    Write-Host "✗ Wrong role! Got '$role' but need 'platform_admin'" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 2: Test Invite Generation Endpoint
# ============================================================================

Write-Host ""
Write-Host "STEP 2: Testing /api/admin/invites/generate endpoint..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$inviteBody = @{
    isp_name = "Test ISP Kenya"
    expires_in_days = 7
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Gray
Write-Host $inviteBody -ForegroundColor Gray
Write-Host ""

try {
    $inviteResp = Invoke-RestMethod -Uri "$API/api/admin/invites/generate" `
        -Method POST `
        -Headers $headers `
        -Body $inviteBody `
        -ErrorAction Stop

    Write-Host "✓ Invite generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Gray
    Write-Host ($inviteResp | ConvertTo-Json) -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "TOKEN (use in /join?token=...):" -ForegroundColor Yellow
    Write-Host $inviteResp.token -ForegroundColor Green
    
} catch {
    Write-Host "✗ Invite generation FAILED" -ForegroundColor Red
    Write-Host ""
    
    # Try to extract detailed error
    try {
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Backend Error:" -ForegroundColor Red
        Write-Host ($errorBody | ConvertTo-Json) -ForegroundColor Red
    } catch {
        Write-Host "Raw Error:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    
    exit 1
}

# ============================================================================
# STEP 3: List Invites
# ============================================================================

Write-Host ""
Write-Host "STEP 3: Listing all invites..." -ForegroundColor Yellow

try {
    $listResp = Invoke-RestMethod -Uri "$API/api/admin/invites" `
        -Headers $headers `
        -ErrorAction Stop

    if ($listResp -and $listResp.Count -gt 0) {
        Write-Host "✓ Found $($listResp.Count) invite(s)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Recent invites:" -ForegroundColor Gray
        $listResp | Select-Object -First 3 | ForEach-Object {
            Write-Host "  ID: $($_.id)" -ForegroundColor Gray
            Write-Host "  Token: $($_.token.Substring(0,20))..." -ForegroundColor Gray
            Write-Host "  Status: $($_.status)" -ForegroundColor Gray
            Write-Host "  Expires: $($_.expires_at)" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "⚠ No invites found" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "✗ Failed to list invites" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC COMPLETE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "If all tests passed:" -ForegroundColor Green
Write-Host "  • Backend is working correctly" -ForegroundColor Gray
Write-Host "  • Issue is likely in frontend (localStorage, API URL)" -ForegroundColor Gray
Write-Host ""
Write-Host "If tests failed:" -ForegroundColor Red
Write-Host "  • Check backend logs: uvicorn output or Railway logs" -ForegroundColor Gray
Write-Host "  • Verify admin.py file was deployed correctly" -ForegroundColor Gray
Write-Host "  • Check database connection" -ForegroundColor Gray
Write-Host ""
