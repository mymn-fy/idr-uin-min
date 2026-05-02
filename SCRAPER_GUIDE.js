// Scraper Module - Dokumentasi Singkat

/**
 * =====================================================
 * MODUL SCRAPER - DOKUMENTASI LENGKAP
 * =====================================================
 * 
 * Module ini menyediakan fungsi untuk scrape data dari halaman web
 * dengan fitur:
 * - Delay 1 detik antar request (anti-blocking)
 * - Error handling lengkap
 * - Ekstrak title, link, description
 * - Duplicate detection
 * - URL validation
 */

// =====================================================
// 1. IMPORTASI MODUL
// =====================================================

const { scrapePage, scrapeMultiple, delay } = require('./scraper');


// =====================================================
// 2. BASIC USAGE - Single URL
// =====================================================

async function example1() {
  // Scrape satu halaman
  const results = await scrapePage('https://idr.uin-antasari.ac.id');
  
  if (results.error) {
    console.error('Error:', results.message);
  } else {
    console.log(`Found ${results.length} items:`);
    results.forEach(item => {
      console.log(`- ${item.title} (${item.link})`);
    });
  }
}


// =====================================================
// 3. MULTIPLE URLs dengan Delay
// =====================================================

async function example2() {
  const urls = [
    'https://idr.uin-antasari.ac.id',
    'https://idr.uin-antasari.ac.id/akademik',
    'https://idr.uin-antasari.ac.id/penelitian'
  ];
  
  // Scrape dengan delay 1 detik antar request
  const results = await scrapeMultiple(urls, 1000);
  
  console.log(`Total ${results.length} items dari ${urls.length} halaman`);
}


// =====================================================
// 4. CUSTOM DELAY
// =====================================================

async function example3() {
  const urls = ['url1', 'url2', 'url3'];
  
  // Scrape dengan delay 2 detik antar request
  const results = await scrapeMultiple(urls, 2000);
}


// =====================================================
// 5. RESPONSE FORMAT
// =====================================================

/*
Success Response (single):
[
  {
    title: "Halaman 1",
    link: "https://idr.uin-antasari.ac.id/page1",
    description: "Deskripsi halaman..."
  },
  {
    title: "Halaman 2",
    link: "https://idr.uin-antasari.ac.id/page2",
    description: "Deskripsi halaman..."
  }
]

Error Response (single):
{
  error: true,
  message: "Network Error",
  url: "https://..."
}
*/


// =====================================================
// 6. ERROR HANDLING
// =====================================================

async function example4() {
  try {
    const results = await scrapePage('https://idr.uin-antasari.ac.id');
    
    if (results.error) {
      // Handle error response
      console.error(`Failed to scrape: ${results.message}`);
    } else {
      // Process results
      console.log(`Found ${results.length} items`);
    }
  } catch (error) {
    // Handle exception
    console.error(`Exception: ${error.message}`);
  }
}


// =====================================================
// 7. DENGAN SERVER - Express Integration
// =====================================================

/*
// server.js sudah include scraper
const { scrapePage, scrapeMultiple } = require('./scraper');

// API endpoint sudah tersedia:
// POST /api/scrape - scrape single URL
// POST /api/scrape-multiple - scrape multiple URLs
// GET /api/scraped-data - ambil data dari database

// Curl example:
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://idr.uin-antasari.ac.id"}'
*/


// =====================================================
// 8. FITUR DETAIL
// =====================================================

/*
✓ Ekstraksi Data:
  - Title: Dari text content link, max 100 karakter
  - Link: Relative/absolute URL, auto-convert ke absolute
  - Description: Dari title/aria-label/parent, max 150 karakter

✓ Validasi:
  - URL format validation
  - Skip external links (bukan uin-antasari.ac.id)
  - Skip invalid links (javascript:, tel:, mailto:)
  - Skip empty titles

✓ Performance:
  - Timeout 10 detik per request
  - Delay 1 detik default antar request
  - Duplicate detection

✓ Error Handling:
  - Network errors
  - Timeout
  - Invalid URLs
  - Parse errors
  - All errors tertangani gracefully
*/


// =====================================================
// 9. CARA MENGGUNAKAN
// =====================================================

/*
A. Via CLI (Command Line Interface)
   node scraper-cli.js <url1> [url2] [url3]...
   
   Contoh:
   node scraper-cli.js https://idr.uin-antasari.ac.id
   
   Output:
   - Console display
   - JSON file (scraped_data_<timestamp>.json)
   - Database (jika running di dalam app)

B. Via API (Server running)
   POST http://localhost:3000/api/scrape
   Content-Type: application/json
   
   {"url": "https://idr.uin-antasari.ac.id"}

C. Via Direct Import
   const { scrapePage } = require('./scraper');
   const results = await scrapePage(url);

D. Via Test File
   node scraper-test.js
*/


// =====================================================
// 10. TIPS & BEST PRACTICES
// =====================================================

/*
✓ Best Practices:
  1. Selalu gunakan delay antar request (courtesy untuk server)
  2. Check error.error flag dalam response
  3. Validate URLs sebelum scraping
  4. Jangan scrape endpoint yang prohibited
  5. Update User-Agent header jika diperlukan
  6. Batch processing untuk banyak URLs

✓ Optimization:
  1. Gunakan try-catch untuk error handling
  2. Implement retry logic jika diperlukan
  3. Cache results untuk menghindari duplicate requests
  4. Monitor timeout dan error rates
  5. Log scraping activity untuk debugging

✓ Considerations:
  1. Respect robots.txt
  2. Check terms of service
  3. Use reasonable delay antar requests
  4. Don't overload target server
  5. Handle rate limiting gracefully
*/


// =====================================================
// 11. FILE STRUKTUR SCRAPER
// =====================================================

/*
scraper.js
  ├── scrapePage(url) - Scrape satu URL
  │   └── Validasi URL
  │   └── HTTP GET dengan Axios
  │   └── Parse dengan Cheerio
  │   └── Ekstraksi title, link, description
  │   └── Error handling
  │
  ├── scrapeMultiple(urls, delay) - Scrape multiple URLs
  │   └── Loop through URLs
  │   └── Call scrapePage() untuk setiap URL
  │   └── Add delay antar iteration
  │   └── Return combined results
  │
  └── delay(ms) - Utility function
      └── Promise-based delay

server.js
  ├── POST /api/scrape - endpoint single scrape
  ├── POST /api/scrape-multiple - endpoint multi scrape
  └── GET /api/scraped-data - ambil dari database

scraper-cli.js
  ├── Parse command line arguments
  ├── Call scraper functions
  ├── Display results
  └── Export ke JSON file

scraper-test.js
  ├── testSingleURL()
  ├── testMultipleURLs()
  ├── testErrorHandling()
  └── testPerformance()
*/


// =====================================================
// QUICK START
// =====================================================

/*
1. Install dependencies:
   npm install

2. Run server:
   npm start

3. Test scraper via CLI:
   node scraper-cli.js https://idr.uin-antasari.ac.id

4. Or use API:
   curl -X POST http://localhost:3000/api/scrape \
     -H "Content-Type: application/json" \
     -d '{"url":"https://idr.uin-antasari.ac.id"}'

5. Or test directly:
   node scraper-test.js
*/
