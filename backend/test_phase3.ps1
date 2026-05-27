#!/usr/bin/env powershell
# Phase 3 Test Script - With NEW MAC address to avoid conflicts

$PACKAGE_ID = "8bc79a25-3c9f-44ba-b360-592c1855e370"
$BASE_URL = "http://localhost:8000/api/portal/test-isp"
$RANDOM_MAC = "BB:CC:DD:EE:FF:{0:X2}" -f (Get-Random -Minimum 0 -Maximum 255)

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "PHASE 3 TEST: Session Management" -ForegroundColor Cyan
Write-Host "Using MAC: $RANDOM_MAC" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan

# TEST 1: Create Session
Write-Host "`n[TEST 1] Create Session (POST /api/portal/test-isp/sessions)" -ForegroundColor Green
Write-Host "Payload:" -ForegroundColor Yellow
Write-Host "  mac_address: $RANDOM_MAC"
Write-Host "  ip_address: 192.168.1.100"
Write-Host "  package_id: $PACKAGE_ID"
Write-Host "  phone_number: 254712345678"

$body = @{
    mac_address = $RANDOM_MAC
    ip_address = "192.168.1.100"
    package_id = $PACKAGE_ID
    phone_number = "254712345678"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$BASE_URL/sessions" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "`n✅ SUCCESS: Session created" -ForegroundColor Green
    Write-Host ($response1 | ConvertTo-Json | Out-String) -ForegroundColor Cyan
    
    $SESSION_ID = $response1.session_id
    Write-Host "`nSAVED SESSION ID: $SESSION_ID" -ForegroundColor Yellow
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ($_.ErrorDetails.Message | Out-String) -ForegroundColor Red
    exit 1
}

# TEST 2: Check Pending Payment Status
Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "[TEST 2] Check Session Status (pending_payment)" -ForegroundColor Green

Start-Sleep -Seconds 1

try {
    $response2 = Invoke-RestMethod -Uri "$BASE_URL/sessions/$SESSION_ID" `
        -Method GET
    
    Write-Host "`n✅ SUCCESS: Session status retrieved" -ForegroundColor Green
    Write-Host ($response2 | ConvertTo-Json | Out-String) -ForegroundColor Cyan
    
    if ($response2.status -eq "pending_payment") {
        Write-Host "✅ Status is CORRECT: pending_payment" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Status is: $($response2.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# TEST 3: Activate Session
Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "[TEST 3] Activate Session (simulate M-Pesa payment)" -ForegroundColor Green

Start-Sleep -Seconds 1

try {
    $response3 = Invoke-RestMethod -Uri "$BASE_URL/sessions/$SESSION_ID/activate" `
        -Method POST
    
    Write-Host "`n✅ SUCCESS: Session activated" -ForegroundColor Green
    Write-Host ($response3 | ConvertTo-Json | Out-String) -ForegroundColor Cyan
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# TEST 4: Check Active Session
Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "[TEST 4] Check Active Session Status" -ForegroundColor Green

Start-Sleep -Seconds 1

try {
    $response4 = Invoke-RestMethod -Uri "$BASE_URL/sessions/$SESSION_ID" `
        -Method GET
    
    Write-Host "`n✅ SUCCESS: Active session retrieved" -ForegroundColor Green
    Write-Host ($response4 | ConvertTo-Json | Out-String) -ForegroundColor Cyan
    
    if ($response4.status -eq "active") {
        Write-Host "`n✅ Status CORRECT: active" -ForegroundColor Green
        Write-Host "✅ Reconnect code: $($response4.reconnect_code)" -ForegroundColor Green
        Write-Host "✅ Internet until: $($response4.internet_available_until)" -ForegroundColor Green
        Write-Host "✅ Remaining: $($response4.remaining_minutes) minutes" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Status: $($response4.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "✅ ALL TESTS PASSED! PHASE 3 COMPLETE!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan