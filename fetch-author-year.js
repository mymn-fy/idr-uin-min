#!/usr/bin/env node

/**
 * Script untuk extract Author dan Year dari EPrints meta tags
 * dan update database Supabase - SEMUA DOKUMEN
 */

require('dotenv').config({ override: true });
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const db_module = require('./database');
const axios = require('axios');
const cheerio = require('cheerio');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Map dari eprinttype ke nama kategori
const DOCTYPE_MAP = {
  'thesis': 'Tesis',
  'skripsi': 'Skripsi',
  'article': 'Artikel',
  'monograph': 'Monografi',
  'laporan_penelitian': 'Laporan Penelitian',
  'conference_item': 'Konferensi',
  'disertasi': 'Disertasi',
  'book': 'Buku',
  'other': 'Lainnya'
};

/**
 * Scrape document detail untuk extract author dan year dari meta tags
 */
async function scrapeDocumentMeta(docUrl) {
  try {
    const response = await axios.get(docUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract dari EPrints meta tags
    const author = $('meta[name="eprints.creators_name"]').attr('content') || 
                   $('meta[name="DC.creator"]').attr('content') || '';
    const creationDate = $('meta[name="eprints.date"]').attr('content') || 
                        $('meta[name="DC.date"]').attr('content') || '';
    const year = creationDate ? creationDate.substring(0, 4) : '';

    return {
      author: author.slice(0, 100) || 'Penulis Tidak Diketahui',
      year: year
    };
  } catch (error) {
    return { author: '', year: '' };
  }
}

/**
 * Get ALL dokumen dari search results dengan pagination
 */
async function getAllDocumentLinksFromSearch(eprinttype) {
  const allLinks = [];
  let page = 1;
  let hasMore = true;

  try {
    while (hasMore && page <= 100) { // Limit 100 pages untuk safety
      const url = `https://idr.uin-antasari.ac.id/cgi/search?output=html&eprinttype=${eprinttype}&order=creators&page=${page}`;
      
      try {
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const $ = cheerio.load(response.data);
        const pageLinks = [];

        // Extract semua link dokumen dari search results
        $('a[href*="/id/eprint/"]').each((i, el) => {
          let href = $(el).attr('href');
          if (href && !href.includes('login') && !href.includes('logout')) {
            const absoluteUrl = new URL(href, 'https://idr.uin-antasari.ac.id').href;
            if (!allLinks.includes(absoluteUrl) && !pageLinks.includes(absoluteUrl)) {
              pageLinks.push(absoluteUrl);
            }
          }
        });

        if (pageLinks.length === 0) {
          hasMore = false;
        } else {
          allLinks.push(...pageLinks);
          page++;
          await delay(500); // Delay antar page
        }
      } catch (error) {
        hasMore = false;
      }
    }
  } catch (error) {
    console.error(`Error searching ${eprinttype}: ${error.message}`);
  }

  return allLinks;
}

/**
 * Main function
 */
async function main() {
  const db = db_module.initConnection();
  
  console.log('\n========================================');
  console.log('  Fetching Author & Year - ALL DOCS');
  console.log('========================================\n');

  let totalUpdated = 0;
  let totalProcessed = 0;
  let categoryCount = Object.keys(DOCTYPE_MAP).length;
  let currentCategory = 0;

  try {
    for (const [eprinttype, categoryName] of Object.entries(DOCTYPE_MAP)) {
      currentCategory++;
      console.log(`\n[${currentCategory}/${categoryCount}] Processing: ${categoryName}`);
      console.log('═'.repeat(50));

      // Get ALL documents dari search dengan pagination
      console.log(`  Fetching all documents...`);
      const docLinks = await getAllDocumentLinksFromSearch(eprinttype);
      
      if (docLinks.length === 0) {
        console.log(`  No documents found for ${categoryName}`);
        continue;
      }

      console.log(`  Found ${docLinks.length} documents. Fetching metadata...`);

      // Scrape setiap dokumen untuk ambil author dan year
      for (let i = 0; i < docLinks.length; i++) {
        const docUrl = docLinks[i];
        process.stdout.write(`  [${i + 1}/${docLinks.length}] Scraping...\r`);

        const meta = await scrapeDocumentMeta(docUrl);
        totalProcessed++;

        // Extract ID dari URL untuk UPDATE query
        const idMatch = docUrl.match(/\/(\d+)\/?$/);
        if (idMatch) {
          const eprintId = idMatch[1];
          
          try {
            // Update document dengan author dan year yang sudah dicari
            const result = await db.query(
              `UPDATE documents 
               SET author = $1, year = $2, updated_at = CURRENT_TIMESTAMP 
               WHERE link LIKE $3 
               AND (author IS NULL OR author = '' OR author = 'Penulis Tidak Diketahui' OR year IS NULL OR year = '')`,
              [meta.author, meta.year, `%/${eprintId}%`]
            );

            if (result.rowCount > 0) {
              totalUpdated++;
            }
          } catch (err) {
            // Ignore update errors
          }
        }

        // Delay antar request
        await delay(300);
      }

      console.log(`  ✓ Completed ${categoryName}: ${docLinks.length} documents processed`);
      await delay(1000);
    }

    console.log(`\n${'═'.repeat(50)}`);
    console.log('✅ PROCESS COMPLETE!\n');
    console.log(`📊 Statistics:`);
    console.log(`   - Total processed: ${totalProcessed}`);
    console.log(`   - Total updated: ${totalUpdated}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

main();