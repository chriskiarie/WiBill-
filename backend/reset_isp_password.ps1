# reset_isp_password.ps1
# Run from D:\honestbill\backend\
# Uses psql directly - no Python imports needed

Write-Host ""
Write-Host "Resetting ISP password..." -ForegroundColor Yellow

# The bcrypt hash for "isp1234"
$hash = '$2b$12$P0bQIz8iPglNHaEikUpODe15aZhyh.ldgNzmCmirwxIF/ynhlE4DW'

$py  = "import asyncio" + [Environment]::NewLine
$py += "from sqlalchemy.ext.asyncio import create_async_engine" + [Environment]::NewLine
$py += "from sqlalchemy import text" + [Environment]::NewLine
$py += "DB = 'postgresql+asyncpg://honestbill:honestbill_dev_secret@localhost:5432/honestbill'" + [Environment]::NewLine
$py += "HASH = '$hash'" + [Environment]::NewLine
$py += "async def fix():" + [Environment]::NewLine
$py += "    engine = create_async_engine(DB)" + [Environment]::NewLine
$py += "    async with engine.begin() as conn:" + [Environment]::NewLine
$py += "        r = await conn.execute(text(""UPDATE admin_users SET hashed_password = :h WHERE email = 'isp@test-isp.co.ke'""), {'h': HASH})" + [Environment]::NewLine
$py += "        print('Rows updated: ' + str(r.rowcount))" + [Environment]::NewLine
$py += "        if r.rowcount == 0:" + [Environment]::NewLine
$py += "            print('WARNING: no row found for isp@test-isp.co.ke')" + [Environment]::NewLine
$py += "        else:" + [Environment]::NewLine
$py += "            print('Password reset to: isp1234')" + [Environment]::NewLine
$py += "    await engine.dispose()" + [Environment]::NewLine
$py += "asyncio.run(fix())" + [Environment]::NewLine

$tmp = "$env:TEMP\reset_pw.py"
$py | Out-File $tmp -Encoding utf8

# Run inside the venv so sqlalchemy is available
.venv\Scripts\python.exe $tmp

if ($LASTEXITCODE -eq 0) {
    Write-Host "Done." -ForegroundColor Green
} else {
    Write-Host "FAILED." -ForegroundColor Red
}
Write-Host ""s