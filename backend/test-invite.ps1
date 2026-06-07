# WiBill Invite Generation Test
# Simple, clean diagnostic

$API = "http://localhost:8000"

Write-Host ""
Write-Host "Testing WiBill Invite Generation..." -ForegroundColor Cyan
Write-Host ""

# Get token
Write-Host "Step 1: Login..." -ForegroundColor Yellow
$loginBody = @{ username = "admin@xwbill.co.ke"; password = "admin1234" } | ConvertTo-Json

$login = Invoke-RestMethod -Uri "$API/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody

$token = $login.access_token
Write-Host "Token: $($token.Substring(0,30))..." -ForegroundColor Green

# Test invite generation
Write-Host ""
Write-Host "Step 2: Generate Invite..." -ForegroundColor Yellow

$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$body = @{ isp_name = "Test ISP"; expires_in_days = 7 } | ConvertTo-Json

Write-Host "Request: $body" -ForegroundColor Gray

try {
    $result = Invoke-RestMethod -Uri "$API/api/admin/invites/generate" -Method POST -Headers $headers -Body $body
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Token: $($result.token)" -ForegroundColor Cyan
    Write-Host "Expires: $($result.expires_at)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Full Response:" -ForegroundColor Gray
    $result | ConvertTo-Json
}
catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
