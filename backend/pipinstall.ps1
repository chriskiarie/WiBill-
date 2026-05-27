# Install required Python packages for testing

Write-Host ""
Write-Host "Installing required Python packages..." -ForegroundColor Cyan
Write-Host ""

# Install requests
Write-Host "Installing requests..." -ForegroundColor Gray
pip install requests

Write-Host ""

# Install psycopg2 (if not already installed)
Write-Host "Installing psycopg2..." -ForegroundColor Gray
pip install psycopg2-binary

Write-Host ""
Write-Host "SUCCESS: All packages installed!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the test scripts:" -ForegroundColor Cyan
Write-Host "  python step1_get_package.py" -ForegroundColor Yellow
Write-Host "  python step2_to_4_session_tests.py <PACKAGE_ID>" -ForegroundColor Yellow
Write-Host ""