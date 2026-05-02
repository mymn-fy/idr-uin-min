# Scrape dan Sync ke Supabase
# Jalankan: powershell -ExecutionPolicy Bypass -File scrape-and-sync.ps1

$ErrorActionPreference = "Stop"

Write-Host "--- Memulai proses Sinkronisasi ke Supabase ---" -ForegroundColor Cyan

# 1. Cek apakah server sedang berjalan
Write-Host "[1/3] Mengecek server di localhost:3000..." -ForegroundColor Yellow
try {
    $test = Invoke-RestMethod -Uri "http://localhost:3000/api/statistics" -ErrorAction Stop
    Write-Host "Server aktif dan merespon!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Server tidak berjalan. Silakan jalankan 'node server.js' terlebih dahulu." -ForegroundColor Red
    exit 1
}

# 2. Persiapkan data request
# Daftar URL yang akan di-scrape
$targetUrls = @(
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

$body = @{
    urls = $targetUrls
    delay = 1000
} | ConvertTo-Json -Depth 3

# 3. Kirim permintaan scraping
Write-Host "[2/3] Mengirim permintaan scraping (ini memakan waktu lama)..." -ForegroundColor Yellow
Write-Host "Jangan tutup jendela ini sampai selesai." -ForegroundColor White

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3000/api/scrape-multiple" `
        -Method Post `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -TimeoutSec 3600
    
    Write-Host "[3/3] Selesai!" -ForegroundColor Green
    Write-Host "---------------------------------------" -ForegroundColor White
    Write-Host "Data ditemukan : $($response.itemsFound)" -ForegroundColor White
    Write-Host "Data Berhasil  : $($response.database.inserted)" -ForegroundColor Green
    Write-Host "Data Duplikat  : $($response.database.duplicates)" -ForegroundColor Yellow
    Write-Host "Data Error     : $($response.database.errors)" -ForegroundColor Red
    
    # Ambil statistik terbaru
    $stats = Invoke-RestMethod -Uri "http://localhost:3000/api/statistics"
    Write-Host "Total data di database sekarang: $($stats.total)" -ForegroundColor Cyan
    Write-Host "---------------------------------------" -ForegroundColor White
    
} catch {
    Write-Host "Terjadi kesalahan saat proses scraping: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}