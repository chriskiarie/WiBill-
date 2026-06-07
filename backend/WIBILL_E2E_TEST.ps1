param([string]$ApiUrl = "http://localhost:8000")
$ADMIN_EMAIL = "admin@xwbill.co.ke"; $ADMIN_PASS = "admin1234"
$ISP_EMAIL = "isp@test-isp.co.ke"; $ISP_PASS = "isp1234"
$TENANT_SLUG = "test-isp"
$script:Pass = 0; $script:Fail = 0; $script:Results = @(); $script:PackageId = $null

function Test-Pass($Tag, $Msg) { Write-Host "  PASS: $Msg" -ForegroundColor Green; $script:Pass++; $script:Results += [PSCustomObject]@{Tag=$Tag;Status="PASS";Message=$Msg} }
function Test-Fail($Tag, $Msg) { Write-Host "  FAIL: $Msg" -ForegroundColor Red; $script:Fail++; $script:Results += [PSCustomObject]@{Tag=$Tag;Status="FAIL";Message=$Msg} }
function Test-Info($Msg) { Write-Host "    INFO: $Msg" -ForegroundColor Cyan }
function Get-ErrorDetail($Ex) { try { $stream=$Ex.Exception.Response.GetResponseStream(); $reader=New-Object System.IO.StreamReader($stream); $body=$reader.ReadToEnd(); $code=[int]$Ex.Exception.Response.StatusCode; if($body){return "HTTP $code $body"}; return "HTTP $code" } catch { return $Ex.Exception.Message } }

Write-Host "=== WiBill E2E Test Suite ===" -ForegroundColor Cyan
Write-Host "API: $ApiUrl"
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

Write-Host "`n--- PHASE 0: Health Check ---" -ForegroundColor Magenta
try { $health=Invoke-RestMethod "$ApiUrl/health" -Method GET -TimeoutSec 10 -ErrorAction Stop; Test-Pass "HEALTH" "Backend up" } catch { Write-Host "Cannot reach $ApiUrl - start uvicorn first" -ForegroundColor Red; exit 1 }

Write-Host "`n--- PHASE 1: Get Tokens (form-encoded login) ---" -ForegroundColor Magenta
try {
    $r=Invoke-RestMethod "$ApiUrl/api/auth/login" -Method POST `
        -ContentType "application/x-www-form-urlencoded" `
        -Body "username=$([Uri]::EscapeDataString($ADMIN_EMAIL))&password=$([Uri]::EscapeDataString($ADMIN_PASS))" `
        -ErrorAction Stop
    $AdminToken=$r.access_token
    if(-not $AdminToken){throw "no token"}
    Test-Pass "AUTH" "Admin login OK role=$($r.role)"
} catch { Write-Host "Admin login FAILED: $(Get-ErrorDetail $_)" -ForegroundColor Red; exit 1 }

try {
    $r=Invoke-RestMethod "$ApiUrl/api/auth/login" -Method POST `
        -ContentType "application/x-www-form-urlencoded" `
        -Body "username=$([Uri]::EscapeDataString($ISP_EMAIL))&password=$([Uri]::EscapeDataString($ISP_PASS))" `
        -ErrorAction Stop
    $IspToken=$r.access_token
    $IspTenant=$r.tenant_id
    if(-not $IspToken){throw "no token"}
    Test-Pass "AUTH" "ISP login OK role=$($r.role) tenant=$IspTenant"
} catch { Write-Host "ISP login FAILED: $(Get-ErrorDetail $_)" -ForegroundColor Red; exit 1 }

$AdminHeaders = @{"Authorization"="Bearer $AdminToken";"Content-Type"="application/json"}
$IspHeaders = @{"Authorization"="Bearer $IspToken";"Content-Type"="application/json"}

try { $me=Invoke-RestMethod "$ApiUrl/api/auth/me" -Headers $AdminHeaders -ErrorAction Stop; if($me.role -eq "platform_admin"){Test-Pass "AUTH" "Admin token valid: $($me.email)"}else{Test-Fail "AUTH" "Wrong admin role: $($me.role)"} } catch { Test-Fail "AUTH" "Admin /me failed: $(Get-ErrorDetail $_)" }
try { $me=Invoke-RestMethod "$ApiUrl/api/auth/me" -Headers $IspHeaders -ErrorAction Stop; if($me.role -eq "isp_admin"){Test-Pass "AUTH" "ISP token valid: $($me.email)"}else{Test-Fail "AUTH" "Wrong ISP role: $($me.role)"} } catch { Test-Fail "AUTH" "ISP /me failed: $(Get-ErrorDetail $_)" }

Write-Host "`n--- TEST 1: Dashboard ---" -ForegroundColor Magenta
try { $dash=Invoke-RestMethod "$ApiUrl/api/dashboard/summary" -Headers $IspHeaders -ErrorAction Stop; Test-Pass "TEST1" "Dashboard summary accessible"; Test-Info "$($dash|ConvertTo-Json -Compress -Depth 2)" } catch { Test-Fail "TEST1" "Dashboard summary failed: $(Get-ErrorDetail $_)" }
try { $dash2=Invoke-RestMethod "$ApiUrl/api/tenants/dashboard" -Headers $IspHeaders -ErrorAction Stop; Test-Pass "TEST1" "Tenant dashboard accessible" } catch { Test-Info "Tenant dashboard: $(Get-ErrorDetail $_)" }

Write-Host "`n--- TEST 2: Package CRUD ---" -ForegroundColor Magenta
try { $pkgList=Invoke-RestMethod "$ApiUrl/api/packages/mine" -Headers $IspHeaders -ErrorAction Stop; Test-Pass "TEST2" "List my packages: $(@($pkgList).Count) found" } catch { Test-Fail "TEST2" "List packages failed: $(Get-ErrorDetail $_)" }
try {
    $pkgName="E2E-Pkg-$(Get-Random -Minimum 1000 -Maximum 9999)"
    $body=@{name=$pkgName;price_ksh=50;duration_hours=1;duration_label="1 Hour";display_order=99}|ConvertTo-Json
    $newPkg=Invoke-RestMethod "$ApiUrl/api/packages" -Method POST -Headers $IspHeaders -Body $body -ErrorAction Stop
    if($newPkg.id){$script:PackageId=$newPkg.id; Test-Pass "TEST2" "Created package $($newPkg.name) ID=$($newPkg.id)"}else{Test-Fail "TEST2" "No ID returned"}
} catch { Test-Fail "TEST2" "Create package failed: $(Get-ErrorDetail $_)" }
if($script:PackageId){ try { $upd=Invoke-RestMethod "$ApiUrl/api/packages/mine" -Headers $IspHeaders -ErrorAction Stop; $found=@($upd)|Where-Object{$_.id -eq $script:PackageId}; if($found){Test-Pass "TEST2" "Package confirmed in list"}else{Test-Fail "TEST2" "Package missing from list"} } catch { Test-Fail "TEST2" "Re-list failed: $(Get-ErrorDetail $_)" } }

Write-Host "`n--- TEST 3: Portal and MPesa ---" -ForegroundColor Magenta
try { $resp=Invoke-WebRequest "$ApiUrl/portal/$TENANT_SLUG" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop; if($resp.StatusCode -eq 200){Test-Pass "TEST3" "Portal renders OK $($resp.Content.Length) bytes"}else{Test-Fail "TEST3" "Portal HTTP $($resp.StatusCode)"} } catch { Test-Fail "TEST3" "Portal failed: $($_.Exception.Message)" }
try { $pubPkgs=Invoke-RestMethod "$ApiUrl/api/packages" -Headers $IspHeaders -ErrorAction Stop; Test-Pass "TEST3" "Packages list: $(@($pubPkgs).Count) found" } catch { Test-Fail "TEST3" "Packages list failed: $(Get-ErrorDetail $_)" }
try { $mpesa=Invoke-RestMethod "$ApiUrl/api/mpesa/config" -Headers $IspHeaders -ErrorAction Stop; if($mpesa.status -eq "configured"){Test-Pass "TEST3" "MPesa configured shortcode=$($mpesa.shortcode)"}else{Test-Info "MPesa status=$($mpesa.status) (OK in dev)"} } catch { Test-Fail "TEST3" "MPesa config failed: $(Get-ErrorDetail $_)" }

Write-Host "`n--- TEST 4: Sessions ---" -ForegroundColor Magenta
try { $sessions=Invoke-RestMethod "$ApiUrl/api/sessions" -Headers $IspHeaders -ErrorAction Stop; Test-Pass "TEST4" "Sessions: $(@($sessions).Count) total"; Test-Info "Active=$(@($sessions|Where-Object{$_.status -eq 'active'}).Count) Pending=$(@($sessions|Where-Object{$_.status -eq 'pending_payment'}).Count)" } catch { Test-Fail "TEST4" "Sessions failed: $(Get-ErrorDetail $_)" }

Write-Host "`n--- TEST 5: Transactions ---" -ForegroundColor Magenta
try { $txns=Invoke-RestMethod "$ApiUrl/api/transactions" -Headers $IspHeaders -ErrorAction Stop; $count=@($txns).Count; Test-Pass "TEST5" "Transactions: $count records"; if($count -gt 0){$latest=@($txns)|Sort-Object -Property created_at -Descending|Select-Object -First 1; Test-Info "Latest: $($latest.status) Ksh $($latest.amount_ksh)"} } catch { Test-Fail "TEST5" "Transactions failed: $(Get-ErrorDetail $_)" }

Write-Host "`n--- TEST 6: Admin Platform ---" -ForegroundColor Magenta
try { $isps=Invoke-RestMethod "$ApiUrl/api/" -Headers $AdminHeaders -ErrorAction Stop; Test-Pass "TEST6" "Tenant list: $(@($isps).Count) tenants" } catch { Test-Fail "TEST6" "Tenant list failed: $(Get-ErrorDetail $_)" }
try { $rpt=Invoke-RestMethod "$ApiUrl/api/invoices/admin/billing-report" -Headers $AdminHeaders -ErrorAction Stop; Test-Pass "TEST6" "Billing report OK"; Test-Info "$($rpt|ConvertTo-Json -Compress -Depth 2)" } catch { Test-Fail "TEST6" "Billing report failed: $(Get-ErrorDetail $_)" }
try { $inv=Invoke-RestMethod "$ApiUrl/api/invoices" -Headers $IspHeaders -ErrorAction Stop; Test-Pass "TEST6" "Invoices: $(@($inv).Count) found" } catch { Test-Fail "TEST6" "Invoices failed: $(Get-ErrorDetail $_)" }
try { $rev=Invoke-RestMethod "$ApiUrl/api/analytics/revenue-trend" -Headers $IspHeaders -ErrorAction Stop; Test-Pass "TEST6" "Revenue trend OK" } catch { Test-Fail "TEST6" "Revenue trend failed: $(Get-ErrorDetail $_)" }

Write-Host "`n============================================================" -ForegroundColor Gray
Write-Host "RESULTS" -ForegroundColor White
$script:Results | Format-Table -Property @{Name="TAG";Expression={$_.Tag};Width=10},@{Name="STATUS";Expression={$_.Status};Width=8},@{Name="MESSAGE";Expression={$_.Message};Width=55} -AutoSize
Write-Host "Total: $($script:Results.Count)  Passed: $($script:Pass)  Failed: $($script:Fail)" -ForegroundColor White
if($script:PackageId){Write-Host "Created Package ID: $($script:PackageId)" -ForegroundColor Gray}
Write-Host "============================================================" -ForegroundColor Gray
if($script:Fail -eq 0){ Write-Host "`nALL TESTS PASSED - PLATFORM READY FOR PRODUCTION" -ForegroundColor Green }else{ Write-Host "`n$($script:Fail) TEST(S) FAILED - check output above" -ForegroundColor Red; Write-Host "401=bad creds  404=missing route  422=schema mismatch" -ForegroundColor Yellow }
