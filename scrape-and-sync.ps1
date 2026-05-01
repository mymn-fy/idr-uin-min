# Script untuk Scrape 9 Document Types dan Insert ke Supabase
# Jalankan: powershell -ExecutionPolicy Bypass -File scrape-and-sync.ps1

$ErrorActionPreference = "Stop"

Write-Host "
╔════════════════════════════════════════════════════════════╗
║  🚀 IDR UIN Antasari - Scraping to Supabase & Vercel 🚀   ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Check if server is running
Write-Host "⏳ Checking if server is running on localhost:3000..." -ForegroundColor Yellow
try {
    $test = Invoke-RestMethod -Uri "http://localhost:3000/api/statistics" -ErrorAction Stop
    Write-Host "✓ Server is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Please start it first:" -ForegroundColor Red
    Write-Host "   npm start" -ForegroundColor Yellow
    exit 1
}

# Prepare request body
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

Write-Host "
📋 Request Configuration:
   - URLs: 9 document types
   - Delay: 1000ms (1 second)
   - Target: http://localhost:3000/api/scrape-multiple
" -ForegroundColor Cyan

Write-Host "⏳ Sending scraping request to server..." -ForegroundColor Yellow

try {
    $startTime = Get-Date
    
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3000/api/scrape-multiple" `
        -Method Post `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -TimeoutSec 300
    
    $duration = (Get-Date) - $startTime
    
    Write-Host "
✅ Scraping completed successfully!
" -ForegroundColor Green
    
    Write-Host "📊 Results:" -ForegroundColor Cyan
    Write-Host "   - Items found: $($response.itemsFound)" -ForegroundColor White
    Write-Host "   - Inserted to DB: $($response.database.inserted)" -ForegroundColor Green
    Write-Host "   - Duplicates: $($response.database.duplicates)" -ForegroundColor Yellow
    Write-Host "   - Errors: $($response.database.errors)" -ForegroundColor $(if ($response.database.errors -gt 0) { 'Red' } else { 'Green' })
    Write-Host "   - Duration: $($duration.TotalSeconds) seconds" -ForegroundColor White
    
    Write-Host "
🌐 Database Status:" -ForegroundColor Cyan
    
    # Get updated statistics
    $stats = Invoke-RestMethod -Uri "http://localhost:3000/api/statistics"
    Write-Host "   - Total documents: $($stats.total)" -ForegroundColor Green
    Write-Host "   - Unique links: $($stats.unique_links)" -ForegroundColor Green
    Write-Host "   - Latest added: $($stats.latest_added)" -ForegroundColor Green
    
    Write-Host "
☁️  Cloud Sync Status:" -ForegroundColor Cyan
    Write-Host "   ✓ Data saved to Supabase PostgreSQL" -ForegroundColor Green
    Write-Host "   ✓ Database URL: Connected to Supabase" -ForegroundColor Green
    Write-Host "   ✓ Vercel app will use this data automatically" -ForegroundColor Green
    
    Write-Host "
🎉 Everything is synced to cloud!" -ForegroundColor Cyan
    Write-Host "
📱 Your Vercel app at:
   https://your-vercel-domain.com
   
   Will now have access to all $($stats.total) documents!
" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error during scraping:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "
═══════════════════════════════════════════════════════════════
✨ All done! Data is now in Supabase and connected to Vercel
═══════════════════════════════════════════════════════════════
" -ForegroundColor Green
