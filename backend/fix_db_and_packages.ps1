# fix_db_and_packages.ps1
# Run from: D:\honestbill\backend\

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  WIBILL - APPLYING 3 FIXES" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# FIX 1: Lowercase enum values in DB

Write-Host ""
Write-Host "FIX 1: Lowercasing enum values in DB..." -ForegroundColor Yellow

$pyScript  = "import asyncio" + [Environment]::NewLine
$pyScript += "from sqlalchemy.ext.asyncio import create_async_engine" + [Environment]::NewLine
$pyScript += "from sqlalchemy import text" + [Environment]::NewLine
$pyScript += "DB = 'postgresql+asyncpg://honestbill:honestbill_dev_secret@localhost:5432/honestbill'" + [Environment]::NewLine
$pyScript += "async def fix():" + [Environment]::NewLine
$pyScript += "    engine = create_async_engine(DB)" + [Environment]::NewLine
$pyScript += "    async with engine.begin() as conn:" + [Environment]::NewLine
$pyScript += "        r = await conn.execute(text('UPDATE transactions SET status = LOWER(status) WHERE status != LOWER(status)'))" + [Environment]::NewLine
$pyScript += "        print('transactions: ' + str(r.rowcount) + ' rows fixed')" + [Environment]::NewLine
$pyScript += "        r = await conn.execute(text('UPDATE network_events SET status = LOWER(status) WHERE status != LOWER(status)'))" + [Environment]::NewLine
$pyScript += "        print('network_events: ' + str(r.rowcount) + ' rows fixed')" + [Environment]::NewLine
$pyScript += "        r = await conn.execute(text('UPDATE sessions SET status = LOWER(status) WHERE status != LOWER(status)'))" + [Environment]::NewLine
$pyScript += "        print('sessions: ' + str(r.rowcount) + ' rows fixed')" + [Environment]::NewLine
$pyScript += "        r = await conn.execute(text('UPDATE invoices SET status = LOWER(status) WHERE status != LOWER(status)'))" + [Environment]::NewLine
$pyScript += "        print('invoices: ' + str(r.rowcount) + ' rows fixed')" + [Environment]::NewLine
$pyScript += "        print('All done.')" + [Environment]::NewLine
$pyScript += "    await engine.dispose()" + [Environment]::NewLine
$pyScript += "asyncio.run(fix())" + [Environment]::NewLine

$tmpFile = "$env:TEMP\fix_enums.py"
$pyScript | Out-File $tmpFile -Encoding utf8
.venv\Scripts\python.exe $tmpFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "FIX 1 complete." -ForegroundColor Green
} else {
    Write-Host "FIX 1 FAILED - check DB connection." -ForegroundColor Red
}

# FIX 2: Packages route POST "/" to POST ""

Write-Host ""
Write-Host "FIX 2: Fixing packages POST route..." -ForegroundColor Yellow

$pkgFile = "app\api\routes\packages.py"
if (Test-Path $pkgFile) {
    $content = Get-Content $pkgFile -Raw
    $fixed = $content -replace '@router\.post\("\/"\)', '@router.post("")'
    $fixed | Set-Content $pkgFile -Encoding utf8
    Write-Host "packages.py fixed." -ForegroundColor Green
} else {
    Write-Host "ERROR: $pkgFile not found." -ForegroundColor Red
}

# FIX 3: Add /health to Next.js proxy

Write-Host ""
Write-Host "FIX 3: Adding /health to Next.js proxy..." -ForegroundColor Yellow

$nextConfig = "..\frontend\wibill\next.config.ts"
if (Test-Path $nextConfig) {
    $nc = Get-Content $nextConfig -Raw
    if ($nc -match "source: '/health'") {
        Write-Host "Already has /health rewrite - skipping." -ForegroundColor Cyan
    } else {
        $old = "destination: 'http://localhost:8000/api/:path*'"
        $new = "destination: 'http://localhost:8000/api/:path*'" + [Environment]::NewLine + "        }," + [Environment]::NewLine + "        {" + [Environment]::NewLine + "          source: '/health'," + [Environment]::NewLine + "          destination: 'http://localhost:8000/health'"
        $nc = $nc -replace [regex]::Escape($old), $new
        $nc | Set-Content $nextConfig -Encoding utf8
        Write-Host "next.config.ts updated." -ForegroundColor Green
    }
} else {
    Write-Host "ERROR: next.config.ts not found at $nextConfig" -ForegroundColor Red
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  DONE - Now follow the next steps below" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Copy network_event.py  -> backend\app\models\network_event.py" -ForegroundColor White
Write-Host "2. Copy transaction.py    -> backend\app\models\transaction.py" -ForegroundColor White
Write-Host "3. Restart backend:  uvicorn app.main:app --reload" -ForegroundColor White
Write-Host "4. Restart frontend: npm run dev" -ForegroundColor White
Write-Host "5. Run: verify_fixes.ps1" -ForegroundColor White
Write-Host ""