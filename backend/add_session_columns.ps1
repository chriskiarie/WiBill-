# add_session_columns.ps1
# Adds phone_number and checkout_request_id to sessions table
# Run from D:\honestbill\backend\

Write-Host ""
Write-Host "Adding missing session columns..." -ForegroundColor Yellow

$py  = "import asyncio" + [Environment]::NewLine
$py += "from sqlalchemy.ext.asyncio import create_async_engine" + [Environment]::NewLine
$py += "from sqlalchemy import text" + [Environment]::NewLine
$py += "DB = 'postgresql+asyncpg://honestbill:honestbill_dev_secret@localhost:5432/honestbill'" + [Environment]::NewLine
$py += "async def fix():" + [Environment]::NewLine
$py += "    engine = create_async_engine(DB)" + [Environment]::NewLine
$py += "    async with engine.begin() as conn:" + [Environment]::NewLine
$py += "        # Add phone_number if missing" + [Environment]::NewLine
$py += "        await conn.execute(text(""ALTER TABLE sessions ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)""))" + [Environment]::NewLine
$py += "        print('phone_number: OK')" + [Environment]::NewLine
$py += "        # Add checkout_request_id if missing" + [Environment]::NewLine
$py += "        await conn.execute(text(""ALTER TABLE sessions ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100)""))" + [Environment]::NewLine
$py += "        print('checkout_request_id: OK')" + [Environment]::NewLine
$py += "        # Add unique index on checkout_request_id" + [Environment]::NewLine
$py += "        await conn.execute(text(""CREATE UNIQUE INDEX IF NOT EXISTS ix_sessions_checkout_request_id ON sessions(checkout_request_id) WHERE checkout_request_id IS NOT NULL""))" + [Environment]::NewLine
$py += "        print('index: OK')" + [Environment]::NewLine
$py += "        print('All done.')" + [Environment]::NewLine
$py += "    await engine.dispose()" + [Environment]::NewLine
$py += "asyncio.run(fix())" + [Environment]::NewLine

$tmp = "$env:TEMP\add_cols.py"
$py | Out-File $tmp -Encoding utf8
.venv\Scripts\python.exe $tmp

if ($LASTEXITCODE -eq 0) {
    Write-Host "Session columns added." -ForegroundColor Green
} else {
    Write-Host "FAILED - check output above." -ForegroundColor Red
}
Write-Host ""
