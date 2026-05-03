const axios = require('axios');
const cheerio = require('cheerio');

// Delay function (1 second)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scrape halaman web dan ekstrak data judul, link, dan deskripsi
 * @param {string} url - URL yang akan di-scrape
 * @returns {Promise<Array>} Array of objects dengan struktur {title, link, description}
 */
async function scrapePage(url) {
  try {
    // 1. Validasi URL
    if (!url || typeof url !== 'string') throw new Error('URL harus berupa string');
    try { new URL(url); } catch (e) { throw new Error(`URL tidak valid: ${url}`); }

    // 2. Ambil halaman
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // 3. Logika [SUPER SCRAPER] - Untuk halaman detail (Meta Tags)
    const eprintsType = $('meta[name="eprints.type"]').attr('content') || $('meta[name="DC.type"]').attr('content');
    
    if (eprintsType) {
      const docTitle = $('meta[name="eprints.title"]').attr('content') || $('meta[name="DC.title"]').attr('content') || $('h1').text().trim();
      const docAbstract = $('meta[name="eprints.abstract"]').attr('content') || $('meta[name="DC.description"]').attr('content') || '';
      const docAuthor = $('meta[name="eprints.creators_name"]').attr('content') || $('meta[name="DC.creator"]').attr('content') || '';
      const docDate = $('meta[name="eprints.date"]').attr('content') || $('meta[name="DC.date"]').attr('content') || '';
      const docYear = docDate ? docDate.substring(0, 4) : '';
      
      results.push({
        title: docTitle,
        link: url,
        description: docAbstract.slice(0, 200),
        type: 'Lainnya', // Akan diupdate otomatis oleh database.js berdasarkan link
        author: docAuthor,
        year: docYear
      });
    }

    // 4. Logika [LIST SCRAPER] - Untuk halaman daftar (Kategori)
    // Ini adalah bagian paling penting untuk mengambil data masal (Author & Year)
    const listItems = $('.ep_view_content p');
    
    if (listItems.length > 0) {
      listItems.each((index, element) => {
        const $element = $(element);
        const $link = $element.find('a').first();
        
        let title = $link.text().trim();
        let link = $link.attr('href');
        
        // Sisipkan spasi setelah span untuk mencegah teks saling menempel (fused text)
        $element.find('span').after(' ');
        let fullText = $element.text().replace(/\s+/g, ' ').trim();

        if (title && link) {
          // Convert relative URL ke absolute
          if (!link.startsWith('http')) {
            link = new URL(link, url).href;
          }

          // Ekstrak Author & Year dari teks: "Nama Penulis (Tahun) Judul Dokumen"
          let author = '';
          let year = '';

          if (fullText.includes('(')) {
            // Author adalah teks sebelum kurung buka pertama
            author = fullText.split('(')[0].trim();
            
            // Year adalah 4 digit di dalam kurung
            const yearMatch = fullText.match(/\((\d{4})\)/);
            year = yearMatch ? yearMatch[1] : '';
          }

          // Tambahkan ke hasil
          results.push({
            title: title,
            link: link,
            description: fullText.slice(0, 200),
            type: 'Lainnya', // Biarkan database.js yang menentukan tipenya
            author: author || 'Penulis Tidak Diketahui',
            year: year
          });
        }
      });
    }

    // 5. Filter hasil agar hanya link dari uin-antasari
    const filtered = results.filter((item) => {
      return item.link.includes('uin-antasari.ac.id') && item.title.length > 2;
    });

    console.log(`✓ Berhasil scrape ${url} - ${filtered.length} items ditemukan`);
    return filtered;

  } catch (error) {
    console.error(`✗ Error scraping ${url}:`, error.message);
    return { error: true, message: error.message, url: url };
  }
}

/**
 * Scrape multiple pages dengan delay antar request
 * @param {Array<string>} urls - Array of URLs to scrape
 * @param {number} delayMs - Delay antara request dalam ms (default: 1000)
 * @returns {Promise<Array>} Array of all scraped results
 */
async function scrapeMultiple(urls, delayMs = 1000) {
  const allResults = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`Scraping [${i + 1}/${urls.length}]: ${url}`);
    
    const result = await scrapePage(url);
    
    if (!result.error) {
      allResults.push(...result);
    }

    // Delay sebelum request berikutnya (tidak perlu delay di iterasi terakhir)
    if (i < urls.length - 1) {
      await delay(delayMs);
    }
  }

  return allResults;
}

/**
 * Crawl website otomatis dengan mengikuti link internal
 * @param {string} startUrl - URL awal untuk mulai crawling
 * @param {number} maxPages - Maksimal halaman yang akan dikunjungi (maks 20)
 * @param {number} delayMs - Delay antar request dalam ms (default: 1000)
 * @returns {Promise<Array>} Array of all unique scraped results
 */
async function crawlWebsite(startUrl, maxPages = 20, delayMs = 1000) {
  const visited = new Set();
  const queued = new Set([startUrl]); // Melacak url yang masuk antrean agar tidak duplikat
  const queue = [startUrl];
  const allResults = [];
  const extractedLinks = new Set();
  
  // Batasi maksimal 20 halaman
  const limit = Math.min(maxPages, 20);
  
  console.log(`🚀 Mulai crawling dari: ${startUrl} (Max: ${limit} halaman)`);

  while (queue.length > 0 && visited.size < limit) {
    const currentUrl = queue.shift();
    
    // Normalisasi URL (hilangkan hash untuk menghindari infinite loop pada halaman yang sama)
    let normalizedUrl;
    try {
      const urlObj = new URL(currentUrl);
      urlObj.hash = ''; 
      normalizedUrl = urlObj.href;
    } catch (e) {
      continue; // Skip jika URL tidak valid
    }

    if (visited.has(normalizedUrl)) {
      continue;
    }

    visited.add(normalizedUrl);
    console.log(`🕷️  Crawling [${visited.size}/${limit}]: ${normalizedUrl}`);

    if (visited.size > 1) {
      await delay(delayMs);
    }

    const pageResults = await scrapePage(normalizedUrl);

    if (!pageResults.error) {
      for (const item of pageResults) {
        let itemUrl;
        try {
           const iUrlObj = new URL(item.link);
           iUrlObj.hash = '';
           itemUrl = iUrlObj.href;
        } catch(e) { continue; }
        
        // Pastikan link internal (uin-antasari.ac.id) & belum dikunjungi atau diantrekan
        if (itemUrl.includes('uin-antasari.ac.id') && !visited.has(itemUrl) && !queued.has(itemUrl)) {
          queued.add(itemUrl);
          queue.push(itemUrl);
        }
        
        // Simpan data item jika belum pernah diekstrak
        if (!extractedLinks.has(item.link)) {
          extractedLinks.add(item.link);
          allResults.push(item);
        }
      }
    }
  }

  console.log(`✅ Crawl selesai! Mengunjungi ${visited.size} halaman dan menemukan ${allResults.length} data unik.`);
  return allResults;
}

module.exports = {
  scrapePage,
  scrapeMultiple,
  delay,
  crawlWebsite
};
