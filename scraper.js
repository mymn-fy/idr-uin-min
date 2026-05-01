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
    // Validasi URL
    if (!url || typeof url !== 'string') {
      throw new Error('URL harus berupa string yang valid');
    }

    // Validasi format URL
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`URL tidak valid: ${url}`);
    }

    // Ambil halaman dengan timeout 10 detik
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Load HTML dengan cheerio
    const $ = cheerio.load(response.data);
    const results = [];

    // [SUPER SCRAPER] Ekstrak Meta Tag EPrints (Membaca tipe data dari dalam dokumen)
    const eprintsType = $('meta[name="eprints.type"]').attr('content') || $('meta[name="DC.type"]').attr('content');
    
    if (eprintsType) {
      const docTitle = $('meta[name="eprints.title"]').attr('content') || $('meta[name="DC.title"]').attr('content') || $('h1').text().trim();
      const docAbstract = $('meta[name="eprints.abstract"]').attr('content') || $('meta[name="DC.description"]').attr('content') || '';
      const thesisType = $('meta[name="eprints.thesis_type"]').attr('content') || '';
      const docAuthor = $('meta[name="eprints.creators_name"]').attr('content') || $('meta[name="DC.creator"]').attr('content') || '';
      const docDate = $('meta[name="eprints.date"]').attr('content') || $('meta[name="DC.date"]').attr('content') || '';
      const docYear = docDate ? docDate.substring(0, 4) : '';
      
      let docType = 'Lainnya';
      const typeLower = (eprintsType + ' ' + thesisType).toLowerCase();
      
      if (typeLower.includes('skripsi')) docType = 'Skripsi';
      else if (typeLower.includes('disertasi')) docType = 'Disertasi';
      else if (typeLower.includes('thesis') || typeLower.includes('tesis')) docType = 'Tesis';
      else if (typeLower.includes('article')) docType = 'Artikel';
      else if (typeLower.includes('monograph')) docType = 'Monografi';
      else if (typeLower.includes('conference')) docType = 'Konferensi';
      else if (typeLower.includes('book')) docType = 'Buku';
      else if (typeLower.includes('laporan')) docType = 'Laporan Penelitian';

      if (docTitle) {
        results.push({
          title: docTitle.slice(0, 100),
          link: url, // Daftarkan halaman detail ini sendiri sebagai dokumen utama
          description: docAbstract.slice(0, 150) + (docAbstract.length > 150 ? '...' : ''),
          type: docType,
          author: docAuthor,
          year: docYear
        });
      }
    }

    // Menentukan default type berdasarkan URL halaman yang sedang di-scrape
    let defaultType = 'Lainnya';
    const urlLower = url.toLowerCase();
    if (urlLower.includes('thesis')) defaultType = 'Tesis';
    else if (urlLower.includes('skripsi')) defaultType = 'Skripsi';
    else if (urlLower.includes('article')) defaultType = 'Artikel';
    else if (urlLower.includes('monograph')) defaultType = 'Monografi';
    else if (urlLower.includes('laporan_penelitian') || urlLower.includes('laporan=5fpenelitian')) defaultType = 'Laporan Penelitian';
    else if (urlLower.includes('conference_item') || urlLower.includes('conference=5fitem')) defaultType = 'Konferensi';
    else if (urlLower.includes('disertasi')) defaultType = 'Disertasi';

    // Strategi scraping: cari link dari berbagai selector umum
    const selectors = [
      'a[href]', // Semua link
    ];

    // Ekstrak data dari setiap link
    $(selectors.join(', ')).each((index, element) => {
      const $element = $(element);
      
      // Ambil title dan link
      let title = $element.text().trim();
      let link = $element.attr('href');

      // Skip jika title atau link kosong
      if (!title || !link || link === '#') {
        return;
      }

      // Skip link eksternal atau anchor
      if (link.startsWith('http') || link.startsWith('javascript:') || link.startsWith('tel:') || link.startsWith('mailto:')) {
        if (!link.includes('uin-antasari.ac.id')) {
          return;
        }
      }

      // Convert relative URL ke absolute
      if (!link.startsWith('http')) {
        const baseUrl = new URL(url);
        link = new URL(link, baseUrl).href;
      }

      // Ambil deskripsi dari parent element atau aria-label
      let description = $element.attr('title') || $element.attr('aria-label') || '';
      
      // Jika tidak ada, coba ambil dari parent paragraf atau div sebelahnya
      if (!description) {
        const $parent = $element.parent();
        description = $parent.find('p, .description, .excerpt').text().trim().slice(0, 150);
      }

      // Limit deskripsi hingga 150 karakter
      if (description.length > 150) {
        description = description.slice(0, 150) + '...';
      }

      // Limit title hingga 100 karakter
      if (title.length > 100) {
        title = title.slice(0, 100) + '...';
      }

      // Menentukan type berdasarkan link
      let type = defaultType;
      const linkLower = link.toLowerCase();
      if (linkLower.includes('thesis')) type = 'Tesis';
      else if (linkLower.includes('skripsi')) type = 'Skripsi';
      else if (linkLower.includes('article')) type = 'Artikel';
      else if (linkLower.includes('monograph')) type = 'Monografi';
      else if (linkLower.includes('laporan_penelitian') || linkLower.includes('laporan=5fpenelitian')) type = 'Laporan Penelitian';
      else if (linkLower.includes('conference_item') || linkLower.includes('conference=5fitem')) type = 'Konferensi';
      else if (linkLower.includes('disertasi')) type = 'Disertasi';

      // Tambah ke results jika belum ada duplikat
      const isDuplicate = results.some(
        (item) => item.link === link && item.title === title
      );

      if (!isDuplicate) {
        results.push({
          title,
          link,
          description,
        type,
        author: '',
        year: ''
        });
      }
    });

    // Filter hasil yang relevan (dengan title yang berarti)
    const filtered = results.filter((item) => {
      return item.title.length > 2 && !item.title.match(/^[\W_]+$/);
    });

    console.log(`✓ Berhasil scrape ${url} - ${filtered.length} items ditemukan`);
    return filtered;
  } catch (error) {
    console.error(`✗ Error scraping ${url}:`, error.message);
    
    // Return error object
    return {
      error: true,
      message: error.message,
      url: url
    };
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
