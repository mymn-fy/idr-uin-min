# Update Author dan Year dari 9 Document Types
# Jalankan: powershell -ExecutionPolicy Bypass -File author-and-year-scraper.ps1

$ErrorActionPreference = "Stop"

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  Fetch Author and Year - IDR UIN" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Check server
Write-Host "Checking server on localhost:3000..." -ForegroundColor Yellow
try {
    $null = Invoke-RestMethod -Uri "http://localhost:3000/api/statistics" -ErrorAction Stop -TimeoutSec 5
    Write-Host "[OK] Server is running!`n" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Server not running. Start with: npm start`nDetail: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  - Target: 9 document types" -ForegroundColor White
Write-Host "  - Operation: Extract author and year from EPrints" -ForegroundColor White
Write-Host "  - Method: Meta tags extraction" -ForegroundColor White
Write-Host "  - Speed: Fast (20 documents per type)`n" -ForegroundColor White

Write-Host "Starting fetch process..." -ForegroundColor Yellow
try {
    $startTime = Get-Date
    & node fetch-author-year.js
    $duration = (Get-Date) - $startTime
    
    Write-Host "`n[OK] Process completed! ($($duration.TotalSeconds) seconds)`n" -ForegroundColor Green
    
    # Get stats
    try {
        $stats = Invoke-RestMethod -Uri "http://localhost:3000/api/statistics"
        Write-Host "Database Status:" -ForegroundColor Cyan
        Write-Host "  - Total docs: $($stats.total)" -ForegroundColor Green
        Write-Host "  - Unique links: $($stats.unique_links)" -ForegroundColor Green
    }
    catch {
        Write-Host "  [Warning] Could not fetch statistics" -ForegroundColor Yellow
    }
    
    Write-Host "`n[OK] Data updated in Supabase and Vercel!`n" -ForegroundColor Green
}
catch {
    Write-Host "`n[ERROR] Exception: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}