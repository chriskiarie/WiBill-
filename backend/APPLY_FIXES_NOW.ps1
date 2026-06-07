# Direct file fix - no manual editing needed

$FILE = "D:\honestbill\frontend\wibill\app\admin\isps\page.tsx"

Write-Host "Reading file..." -ForegroundColor Cyan
$content = Get-Content $FILE -Raw

Write-Host "Applying fixes..." -ForegroundColor Yellow

# Fix 1: Replace /api/admin/ paths
$content = $content -replace '/api/admin/tenants', '/api/tenants'
$content = $content -replace '/api/admin/invites', '/api/invites'

# Fix 2: Replace data.url with data.invite_link
$content = $content -replace 'data\.url', 'data.invite_link'

Write-Host "Writing fixed content back to file..." -ForegroundColor Yellow
$content | Set-Content $FILE -Encoding UTF8 -Force

Write-Host "✅ File fixed!" -ForegroundColor Green

# Verify
$verify = Get-Content $FILE -Raw
$hasOldPaths = $verify -match '/api/admin/'
$hasNewPaths = $verify -match '/api/tenants' -and $verify -notmatch '/api/admin/'
$hasDataUrl = $verify -match 'data\.url' -and $verify -notmatch 'data\.invite_link'
$hasInviteLink = $verify -match 'data\.invite_link'

Write-Host ""
Write-Host "Verification:" -ForegroundColor Cyan
Write-Host "  Old paths removed: $(-not $hasOldPaths)" -ForegroundColor $(if (-not $hasOldPaths) { 'Green' } else { 'Red' })
Write-Host "  New paths added: $hasNewPaths" -ForegroundColor $(if ($hasNewPaths) { 'Green' } else { 'Red' })
Write-Host "  data.url removed: $(-not $hasDataUrl)" -ForegroundColor $(if (-not $hasDataUrl) { 'Green' } else { 'Red' })
Write-Host "  data.invite_link added: $hasInviteLink" -ForegroundColor $(if ($hasInviteLink) { 'Green' } else { 'Red' })

Write-Host ""
Write-Host "Now committing and pushing..." -ForegroundColor Yellow

cd D:\honestbill
git add frontend/wibill/app/admin/isps/page.tsx
git commit -m "fix: correct API paths and invite response field"
git push

Write-Host ""
Write-Host "✅ All done! Deployed to production." -ForegroundColor Green
Write-Host "Check: wi-bill.vercel.app/admin/isps in 2-3 minutes" -ForegroundColor Cyan

