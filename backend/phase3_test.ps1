# STEP 1: Get a Real Package ID from Database
# This script connects to PostgreSQL and fetches the first package

Write-Host ""
Write-Host "STEP 1: Get a Real Package UUID from Database" -ForegroundColor Cyan
Write-Host ""

# Check if psql is available
Write-Host "Checking if psql is installed..." -ForegroundColor Gray
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "SUCCESS: psql found" -ForegroundColor Green
    Write-Host "  $psqlVersion" -ForegroundColor Gray
}
catch {
    Write-Host "ERROR: psql not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "You have two options:" -ForegroundColor Yellow
    Write-Host "1. Install PostgreSQL tools (includes psql)" -ForegroundColor Yellow
    Write-Host "2. Use Python instead (recommended for Windows)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Using Python instead..." -ForegroundColor Gray
    
    # Use Python to connect instead
    python3 << 'PYEOF'
import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        database="honestbill",
        user="honestbill",
        password="honestbill_dev_secret"
    )
    
    cursor = conn.cursor()
    
    # Get the first package for test-isp tenant
    query = """
    SELECT id, name, price_ksh FROM packages 
    WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'test-isp')
    LIMIT 1;
    """
    
    cursor.execute(query)
    result = cursor.fetchone()
    
    if result:
        package_id, name, price = result
        print("")
        print("SUCCESS: Found package")
        print(f"  Package ID: {package_id}")
        print(f"  Name: {name}")
        print(f"  Price: KSH {price}")
        print("")
        print(f"Use this Package ID in next tests: {package_id}")
    else:
        print("ERROR: No packages found")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"ERROR: {e}")
    print("")
    print("Make sure PostgreSQL is running and credentials are correct")

PYEOF
    exit
}

# If psql is available, use it
Write-Host ""
Write-Host "Running query..." -ForegroundColor Gray
Write-Host ""

# PowerShell-compatible way to use psql
$env:PGPASSWORD="honestbill_dev_secret"

$queryResult = psql -h localhost -U honestbill -d honestbill -c "SELECT id, name, price_ksh FROM packages WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'test-isp') LIMIT 1;" 2>&1

if ($queryResult -match "ERROR|error") {
    Write-Host "ERROR: $queryResult" -ForegroundColor Red
}
else {
    Write-Host "SUCCESS: Query executed" -ForegroundColor Green
    Write-Host ""
    Write-Host $queryResult -ForegroundColor Gray
    Write-Host ""
    
    # Extract the UUID (first column)
    $lines = $queryResult -split "`n"
    foreach ($line in $lines) {
        if ($line -match "([a-f0-9\-]{36})") {
            $packageId = $matches[1]
            Write-Host "PACKAGE ID FOUND:" -ForegroundColor Green
            Write-Host "  $packageId" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Copy this ID for the next test step." -ForegroundColor Cyan
        }
    }
}

Write-Host ""