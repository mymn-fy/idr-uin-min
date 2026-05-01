# Scrape dan Sync ke Supabase
# Jalankan: powershell -ExecutionPolicy Bypass -File scrape-and-sync.ps1

$ErrorActionPreference = "Stop"

Write-Host "Starting scraping to Supabase..." -ForegroundColor Cyan

# Check if server is running
Write-Host "Checking server on localhost:3000..." -ForegroundColor Yellow
try {
    $test = Invoke-RestMethod -Uri "http://localhost:3000/api/statistics" -ErrorAction Stop
    Write-Host "Server is running!" -ForegroundColor Green
} catch {
    Write-Host "Server not running. Please start it first." -ForegroundColor Red
    exit 1
}

# Prepare request
$body = @{
    urls = @(
        "https://idr.uin-antasari.ac.id/view/doctype/thesis.html",
        "https://idr.uin-antasari.ac.id/view/doctype/skripsi.html",
        "https://idr.uin-antasari.ac.id/view/doctype/article.html",
        "https://idr.uin-antasari.ac.id/view/doctype/monograph.html",
        "https://idr.uin-antasari.ac.id/view/doctype/laporan=5Fpenelitian.html",
        "https://idr.uin-antasari.ac.id/view/doctype/conference=5Fitem.html",
        "https://idr.uin-antasari.ac.id/view/doctype/disertasi.html",
        "https://idr.uin-antasari.ac.id/view/doctype/book.html",
        "https://idr.uin-antasari.ac.id/view/doctype/other.html"
    )
    delay = 1000
} | ConvertTo-Json -Depth 3

Write-Host "Sending scraping request..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3000/api/scrape-multiple" `
        -Method Post `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -TimeoutSec 300
    
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Items found: $($response.itemsFound)" -ForegroundColor White
    Write-Host "Inserted: $($response.database.inserted)" -ForegroundColor Green
    Write-Host "Duplicates: $($response.database.duplicates)" -ForegroundColor Yellow
    Write-Host "Errors: $($response.database.errors)" -ForegroundColor Red
    
    # Get updated statistics
    $stats = Invoke-RestMethod -Uri "http://localhost:3000/api/statistics"
    Write-Host "Total in database: $($stats.total)" -ForegroundColor Green
    Write-Host "Data synced to Supabase and Vercel!" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
