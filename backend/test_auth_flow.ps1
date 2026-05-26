#!/usr/bin/env powershell
<#
.SYNOPSIS
Complete HonestBill authentication flow test
Tests: Invite generation → Registration → Login → Protected endpoints
#>

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  HONESTBILL COMPLETE AUTH FLOW TEST                        ║" -ForegroundColor Cyan
Write-Host "║  Invite → Register → Approve → Login → Protected Endpoint  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$BASE = "http://localhost:8000"
$TEST_RESULTS = @()

# Color coding
$CHECK = "✅"
$CROSS = "❌"
$WARN = "⚠️ "

# ============================================================================
# STEP 1: CHECK BACKEND
# ============================================================================

Write-Host "STEP 1: Check Backend" -ForegroundColor Cyan
Write-Host "─────────────────────" -ForegroundColor Gray

try {
    $health = Invoke-WebRequest -Uri "$BASE/health" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "$CHECK Backend is running" -ForegroundColor Green
    $data = $health.Content | ConvertFrom-Json
    Write-Host "   Status: $($data.status)" -ForegroundColor Gray
    Write-Host "   Version: $($data.version)" -ForegroundColor Gray
} catch {
    Write-Host "$CROSS Backend is not responding" -ForegroundColor Red
    Write-Host "   Start it with: uvicorn app.main:app --reload" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 2: GENERATE INVITE TOKEN
# ============================================================================

Write-Host "STEP 2: Generate Invite Token" -ForegroundColor Cyan
Write-Host "──────────────────────────────" -ForegroundColor Gray

try {
    $resp = Invoke-WebRequest -Uri "$BASE/api/admin/invites/generate" `
      -Method POST `
      -Body "{}" `
      -Headers @{"Content-Type"="application/json"} `
      -UseBasicParsing `
      -ErrorAction Stop
    
    $data = $resp.Content | ConvertFrom-Json
    $INVITE_TOKEN = $data.token
    $INVITE_ID = $data.id
    
    Write-Host "$CHECK Invite token generated" -ForegroundColor Green
    Write-Host "   Token: $($INVITE_TOKEN.Substring(0, 25))..." -ForegroundColor Gray
    Write-Host "   Expires: $($data.expires_at)" -ForegroundColor Gray
    $TEST_RESULTS += "Invite generation: PASS"
    
} catch {
    Write-Host "$CROSS Failed to generate invite" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    $TEST_RESULTS += "Invite generation: FAIL"
    
    try {
        $errorContent = $_.Exception.Response.Content.ReadAsStream() | ForEach-Object { $_ }
        Write-Host "   Details: $errorContent" -ForegroundColor Gray
    } catch {}
    
    Write-Host "   Note: You may need platform admin credentials" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 3: VALIDATE TOKEN
# ============================================================================

if ($INVITE_TOKEN) {
    Write-Host "STEP 3: Validate Invite Token" -ForegroundColor Cyan
    Write-Host "──────────────────────────────" -ForegroundColor Gray
    
    try {
        $resp = Invoke-WebRequest -Uri "$BASE/auth/validate-token?token=$INVITE_TOKEN" `
          -Method GET `
          -UseBasicParsing `
          -ErrorAction Stop
        
        $data = $resp.Content | ConvertFrom-Json
        
        if ($data.valid) {
            Write-Host "$CHECK Token is valid" -ForegroundColor Green
            Write-Host "   Message: $($data.message)" -ForegroundColor Gray
            $TEST_RESULTS += "Token validation: PASS"
        } else {
            Write-Host "$CROSS Token is invalid" -ForegroundColor Red
            $TEST_RESULTS += "Token validation: FAIL"
        }
        
    } catch {
        Write-Host "$CROSS Validation failed" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        $TEST_RESULTS += "Token validation: FAIL"
    }
    
    Write-Host ""
}

# ============================================================================
# STEP 4: REGISTER ISP
# ============================================================================

if ($INVITE_TOKEN) {
    Write-Host "STEP 4: Register ISP" -ForegroundColor Cyan
    Write-Host "────────────────────" -ForegroundColor Gray
    
    $ISP_NAME = "TestISP-$(Get-Random -Minimum 1000 -Maximum 9999)"
    $ISP_EMAIL = "admin$(Get-Random -Minimum 1000 -Maximum 9999)@testlocal.dev"
    $ISP_PASSWORD = "TestPassword123!"
    
    Write-Host "   ISP Name: $ISP_NAME" -ForegroundColor Gray
    Write-Host "   Email: $ISP_EMAIL" -ForegroundColor Gray
    
    $body = @{
        isp_name = $ISP_NAME
        admin_email = $ISP_EMAIL
        admin_password = $ISP_PASSWORD
    } | ConvertTo-Json
    
    try {
        $resp = Invoke-WebRequest -Uri "$BASE/auth/register-isp?token=$INVITE_TOKEN" `
          -Method POST `
          -Body $body `
          -Headers @{"Content-Type"="application/json"} `
          -UseBasicParsing `
          -ErrorAction Stop
        
        $data = $resp.Content | ConvertFrom-Json
        $TENANT_ID = $data.tenant_id
        
        Write-Host "$CHECK ISP registered successfully" -ForegroundColor Green
        Write-Host "   Tenant ID: $TENANT_ID" -ForegroundColor Gray
        Write-Host "   Status: $($data.status)" -ForegroundColor Yellow
        Write-Host "   Message: $($data.message)" -ForegroundColor Gray
        $TEST_RESULTS += "ISP registration: PASS"
        
    } catch {
        Write-Host "$CROSS Registration failed" -ForegroundColor Red
        $TEST_RESULTS += "ISP registration: FAIL"
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorContent = $reader.ReadToEnd()
            $reader.Close()
            
            $errorData = $errorContent | ConvertFrom-Json
            Write-Host "   Error: $($errorData.detail)" -ForegroundColor Red
        } catch {
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
}

# ============================================================================
# STEP 5: APPROVE TENANT (SQL FALLBACK)
# ============================================================================

if ($TENANT_ID) {
    Write-Host "STEP 5: Approve Tenant Account" -ForegroundColor Cyan
    Write-Host "───────────────────────────────" -ForegroundColor Gray
    
    Write-Host "$WARN Manual approval required" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run these SQL commands in your database:" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   UPDATE tenants SET is_active = true WHERE id = '$TENANT_ID';" -ForegroundColor Magenta
    Write-Host "   UPDATE admin_users SET is_active = true WHERE email = '$ISP_EMAIL';" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Then come back and run the login step." -ForegroundColor Gray
    Write-Host ""
    $TEST_RESULTS += "Tenant approval: MANUAL"
}

# ============================================================================
# STEP 6: LOGIN
# ============================================================================

if ($ISP_EMAIL -and $ISP_PASSWORD) {
    Write-Host "STEP 6: Login as ISP" -ForegroundColor Cyan
    Write-Host "────────────────────" -ForegroundColor Gray
    
    $loginBody = @{
        username = $ISP_EMAIL
        password = $ISP_PASSWORD
    } | ConvertTo-Json
    
    try {
        $resp = Invoke-WebRequest -Uri "$BASE/auth/login" `
          -Method POST `
          -Body $loginBody `
          -Headers @{"Content-Type"="application/json"} `
          -UseBasicParsing `
          -ErrorAction Stop
        
        $data = $resp.Content | ConvertFrom-Json
        $ISP_TOKEN = $data.access_token
        
        Write-Host "$CHECK Login successful" -ForegroundColor Green
        Write-Host "   Token: $($ISP_TOKEN.Substring(0, 25))..." -ForegroundColor Gray
        Write-Host "   Role: $($data.role)" -ForegroundColor Gray
        Write-Host "   Tenant: $($data.tenant_id)" -ForegroundColor Gray
        $TEST_RESULTS += "Login: PASS"
        
    } catch {
        Write-Host "$CROSS Login failed" -ForegroundColor Red
        $TEST_RESULTS += "Login: FAIL"
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorContent = $reader.ReadToEnd()
            $reader.Close()
            
            $errorData = $errorContent | ConvertFrom-Json
            Write-Host "   Error: $($errorData.detail)" -ForegroundColor Red
            Write-Host "   Reason: Account may not be approved yet" -ForegroundColor Yellow
        } catch {
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
}

# ============================================================================
# STEP 7: TEST PROTECTED ENDPOINT
# ============================================================================

if ($ISP_TOKEN) {
    Write-Host "STEP 7: Test Protected Endpoint" -ForegroundColor Cyan
    Write-Host "────────────────────────────────" -ForegroundColor Gray
    
    try {
        $resp = Invoke-WebRequest -Uri "$BASE/auth/me" `
          -Method GET `
          -Headers @{
            "Authorization" = "Bearer $ISP_TOKEN"
            "Content-Type" = "application/json"
          } `
          -UseBasicParsing `
          -ErrorAction Stop
        
        $data = $resp.Content | ConvertFrom-Json
        
        Write-Host "$CHECK Protected endpoint works" -ForegroundColor Green
        Write-Host "   User ID: $($data.id)" -ForegroundColor Gray
        Write-Host "   Email: $($data.email)" -ForegroundColor Gray
        Write-Host "   Role: $($data.role)" -ForegroundColor Gray
        Write-Host "   Tenant: $($data.tenant_id)" -ForegroundColor Gray
        Write-Host "   Active: $($data.is_active)" -ForegroundColor Gray
        $TEST_RESULTS += "Protected endpoint: PASS"
        
    } catch {
        Write-Host "$CROSS Protected endpoint failed" -ForegroundColor Red
        $TEST_RESULTS += "Protected endpoint: FAIL"
        
        Write-Host "   Error: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TEST SUMMARY                                              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

foreach ($result in $TEST_RESULTS) {
    if ($result -like "*PASS*") {
        Write-Host "✅ $result" -ForegroundColor Green
    } elseif ($result -like "*FAIL*") {
        Write-Host "❌ $result" -ForegroundColor Red
    } else {
        Write-Host "⚠️  $result" -ForegroundColor Yellow
    }
}

Write-Host ""

$passCount = @($TEST_RESULTS | Where-Object { $_ -like "*PASS*" }).Count
$failCount = @($TEST_RESULTS | Where-Object { $_ -like "*FAIL*" }).Count
$manualCount = @($TEST_RESULTS | Where-Object { $_ -like "*MANUAL*" }).Count

if ($failCount -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "⚠️  $failCount test(s) failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "   Passed: $passCount" -ForegroundColor Green
Write-Host "   Failed: $failCount" -ForegroundColor Red
Write-Host "   Manual: $manualCount" -ForegroundColor Yellow

Write-Host ""

# ============================================================================
# SAVED VARIABLES FOR MANUAL TESTING
# ============================================================================

if ($INVITE_TOKEN -or $ISP_TOKEN) {
    Write-Host "SAVED VARIABLES FOR MANUAL TESTING" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host ""
    
    if ($INVITE_TOKEN) {
        Write-Host "Invite Token:" -ForegroundColor White
        Write-Host "   `$INVITE_TOKEN = '$INVITE_TOKEN'" -ForegroundColor Magenta
        Write-Host ""
    }
    
    if ($ISP_EMAIL) {
        Write-Host "ISP Credentials:" -ForegroundColor White
        Write-Host "   Email: $ISP_EMAIL" -ForegroundColor Magenta
        Write-Host "   Password: $ISP_PASSWORD" -ForegroundColor Magenta
        Write-Host ""
    }
    
    if ($ISP_TOKEN) {
        Write-Host "JWT Access Token:" -ForegroundColor White
        Write-Host "   `$ISP_TOKEN = '$ISP_TOKEN'" -ForegroundColor Magenta
        Write-Host ""
    }
    
    Write-Host "Use these in PowerShell for further manual testing" -ForegroundColor Gray
}

Write-Host ""
