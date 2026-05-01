const express = require('express');
const path = require('path');
const { scrapePage, scrapeMultiple, crawlWebsite } = require('./scraper');
const db_module = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Database setup
const db = db_module.initConnection();

// Initialize database on startup
setTimeout(async () => {
  await db_module.initDatabase(db);
  
  // Insert sample data jika database kosong
  const stats = await db_module.getStatistics(db);
  if (stats.total === 0) {
    await db_module.insertSampleData(db);
  }

  // Catatan Migrasi Vercel:
  // Background process (setInterval) dihapus karena lingkungan Vercel Serverless
  // akan membunuh proses ini secara otomatis. Sebagai gantinya, 
  // siapkan "Vercel Cron Jobs" yang memanggil endpoint API /api/crawl secara berkala.
}, 500);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Search endpoint
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    // Mendukung parameter 'type' sesuai permintaan, fallback ke 'category' untuk kompatibilitas
    const type = req.query.type || req.query.category || 'all'; 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'relevance'; // Ambil parameter sort, default 'relevance'
    
    // 2. Validasi pagination
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Parameter page dan limit harus bernilai positif' });
    }
    
    // 3. Panggil fungsi FTS5 dengan parameter lengkap (filter, pagination)
    const searchData = await db_module.searchDocumentsWithFTS(db, query, type, page, limit, sort);
    
    res.json({
      results: searchData.results,
      total: searchData.total,
      page: searchData.page,
      totalPages: searchData.totalPages,
      count: searchData.results.length // Dipertahankan agar UI lama (search.js) tetap jalan
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Error searching database' });
  }
});

// Scraping endpoint - single URL
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL diperlukan' });
    }

    // Scrape halaman
    const results = await scrapePage(url);

    // Jika ada error
    if (results.error) {
      return res.status(400).json({
        error: results.message,
        url: results.url
      });
    }

    // Simpan hasil ke database dengan duplicate checking
    const insertResults = await db_module.insertDocuments(db, results);

    res.json({
      success: true,
      url: url,
      items: results,
      itemsFound: results.length,
      database: insertResults
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scraping endpoint - multiple URLs
app.post('/api/scrape-multiple', async (req, res) => {
  try {
    const { urls, delay } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array diperlukan' });
    }

    // Scrape multiple pages
    const results = await scrapeMultiple(urls, delay || 1000);

    // Simpan hasil ke database dengan duplicate checking
    const insertResults = await db_module.insertDocuments(db, results);

    res.json({
      success: true,
      urls: urls,
      items: results,
      itemsFound: results.length,
      database: insertResults
    });
  } catch (error) {
    console.error('Multiple scraping error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crawling endpoint - penelusuran otomatis dan penyimpanan ke database
app.post('/api/crawl', async (req, res) => {
  try {
    const { url, maxPages, delay } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL awal diperlukan' });
    }

    // Jalankan crawling dengan maksimal halaman 20 (atau sesuai limit opsional pengguna)
    const crawlResults = await crawlWebsite(url, maxPages || 20, delay || 1000);

    // Simpan otomatis ke database dengan validasi duplikasi bawaan
    const insertResults = await db_module.insertDocuments(db, crawlResults);

    res.json({
      success: true,
      startUrl: url,
      itemsFound: crawlResults.length,
      database: {
        ...insertResults,
        searchReady: true // Menandakan data sudah bisa langsung dicari
      }
    });
  } catch (error) {
    console.error('Crawl error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vercel Cron Job Endpoint (Berjalan otomatis)
app.get('/api/cron/crawl', async (req, res) => {
  try {
    // Catatan Vercel: Limit eksekusi Hobby tier adalah 10 detik!
    // Kita mengatur max 5 halaman dan delay 0ms agar selesai sebelum kena timeout.
    
    // Acak URL awal agar tidak merayapi halaman yang itu-itu saja setiap ditekan
    const targets = [
      'https://idr.uin-antasari.ac.id/view/doctype/skripsi.html',
      'https://idr.uin-antasari.ac.id/view/doctype/thesis.html',
      'https://idr.uin-antasari.ac.id/view/doctype/article.html',
      'https://idr.uin-antasari.ac.id/view/doctype/laporan=5Fpenelitian.html'
    ];
    const targetUrl = targets[Math.floor(Math.random() * targets.length)];
    
    console.log(`⏳ Menjalankan Vercel Cron Job dari: ${targetUrl}...`);
    
    const crawlResults = await crawlWebsite(targetUrl, 8, 0); // Naikkan dari 5 ke 8 halaman
    const insertResults = await db_module.insertDocuments(db, crawlResults);
    
    console.log(`✅ Cron Selesai: ${insertResults.inserted} tersimpan.`);
    res.json({ success: true, database: insertResults });
  } catch (error) {
    console.error('Cron error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get scraped data endpoint
app.get('/api/scraped-data', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const data = await db_module.getAllDocuments(db, limit);
    const stats = await db_module.getStatistics(db);

    res.json({
      total: stats.total,
      unique: stats.unique_links,
      latest: stats.latest_added,
      data: data
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// Get document by ID
app.get('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db_module.getDocumentById(db, id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(doc);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Error fetching document' });
  }
});

// Get database statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const stats = await db_module.getStatistics(db);
    res.json(stats);
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Error getting statistics' });
  }
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running di http://localhost:${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  db.end(() => {
    console.log('PostgreSQL pool closed');
    process.exit(0);
  });
});

// Export untuk Vercel Serverless
module.exports = app;
