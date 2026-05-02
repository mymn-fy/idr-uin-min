#!/usr/bin/env node

/**
 * Script untuk scrape dokumen dari EPrints berdasarkan document type
 * Menggunakan endpoint /cgi/search dengan parameter eprinttype
 */

require('dotenv').config({ override: true });
const axios = require('axios');
const cheerio = require('cheerio');
const db_module = require('./database');

// Map dari nama doctype ke parameter EPrints
const DOCTYPE_MAP = {
  'thesis': { param: 'thesis', name: 'Tesis' },
  'skripsi': { param: 'skripsi', name: 'Skripsi' },
  'article': { param: 'article', name: 'Artikel' },
  'monograph': { param: 'monograph', name: 'Monografi' },
  'laporan': { param: 'laporan_penelitian', name: 'Laporan Penelitian' },
  'conference': { param: 'conference_item', name: 'Konferensi' },
  'disertasi': { param: 'disertasi', name: 'Disertasi' },
  'book': { param: 'book', name: 'Buku' },
  'other': { param: 'other', name: 'Lainnya' }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scrape search results page untuk ekstrak document links
 */
async function searchDocuments(eprintType, page = 1) {
  try {
    const url = `https://idr.uin-antasari.ac.id/cgi/search?output=html&eprinttype=${eprintType}&page=${page}&order=creators`;
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const links = [];

    // Extract document links
    $('a[href*="/id/eprint/"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('login') && !href.includes('logout')) {
        const absoluteUrl = new URL(href, 'https://idr.uin-antasari.ac.id').href;
        if (!links.includes(absoluteUrl)) {
          links.push(absoluteUrl);
        }
      }
    });

    return links;
  } catch (error) {
    console.error(`❌ Error searching ${eprintType}:`, error.message);
    return [];
  }
}

/**
 * Scrape detail dokumen
 */
async function scrapeDocumentDetail(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract EPrints metadata
    const title = $('meta[name="eprints.title"]').attr('content') || $('h1.title_text').text().trim() || 'Untitled';
    const abstract = $('meta[name="eprints.abstract"]').attr('content') || '';
    const eprintsType = $('meta[name="eprints.type"]').attr('content') || '';
    const thesisType = $('meta[name="eprints.thesis_type"]').attr('content') || '';
    const creator = $('meta[name="eprints.creators_name"]').attr('content') || '';
    const creationDate = $('meta[name="eprints.date"]').attr('content') || '';
    const year = creationDate ? creationDate.substring(0, 4) : '';

    // Determine doc type
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

    return {
      title: title.slice(0, 200),
      link: url,
      description: abstract.slice(0, 200),
      content: abstract,
      type: docType,
      author: creator.slice(0, 100),
      year: year
    };
  } catch (error) {
    return null;
  }
}

/**
 * Main scraping function
 */
async function main() {
  try {
    const db = db_module.initConnection();
    let totalInserted = 0;

    console.log('\n🚀 Starting scraping from EPrints by document type...\n');

    for (const [key, info] of Object.entries(DOCTYPE_MAP)) {
      const eprintType = info.param;
      
      console.log(`\n[${Object.keys(DOCTYPE_MAP).indexOf(key) + 1}/${Object.keys(DOCTYPE_MAP).length}] Processing: ${info.name} (${eprintType})`);
      console.log('═'.repeat(60));

      let page = 1;
      let pageTotal = 0;
      let pageHasResults = true;
      const typeDocuments = [];

      // Paginate through all results
      while (pageHasResults && page <= 10) { // Limit to 10 pages per type
        console.log(`  Page ${page}...`);
        
        const docLinks = await searchDocuments(eprintType, page);
        
        if (docLinks.length === 0) {
          pageHasResults = false;
          break;
        }

        pageTotal += docLinks.length;

        // Scrape each document detail
        for (let j = 0; j < docLinks.length; j++) {
          const docUrl = docLinks[j];
          process.stdout.write(`    [${j + 1}/${docLinks.length}] Scraping...\r`);
          
          const docData = await scrapeDocumentDetail(docUrl);
          if (docData) {
            typeDocuments.push(docData);
          }
          
          await delay(300);
        }

        page++;
        console.log(`  ✓ Page ${page - 1} complete: ${docLinks.length} docs`);
        await delay(500);
      }

      console.log(`  ✓ Total documents scraped: ${pageTotal}\n`);

      // Insert to database
      if (typeDocuments.length > 0) {
        try {
          const result = await db_module.insertDocuments(db, typeDocuments);
          console.log(`  📊 Database insertion:`);
          console.log(`     - Inserted: ${result.inserted}`);
          console.log(`     - Duplicates: ${result.duplicates}`);
          console.log(`     - Errors: ${result.errors}\n`);
          
          totalInserted += result.inserted;
        } catch (error) {
          console.error(`  ❌ Database insertion error:`, error.message);
        }
      }
    }

    // Final statistics
    const stats = await db_module.getStatistics(db);
    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL STATISTICS:');
    console.log('═'.repeat(60));
    console.log(`✓ Total new documents inserted: ${totalInserted}`);
    console.log(`✓ Total documents in database: ${stats.total}`);
    console.log(`✓ Scraping completed at: ${new Date().toISOString()}\n`);

    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
