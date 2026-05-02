#!/usr/bin/env node

/**
 * Script untuk scrape semua dokumen dari 9 halaman doctype
 * Ekstrak dokumen individual dengan meta EPrints lengkap
 */

require('dotenv').config({ override: true });
const axios = require('axios');
const cheerio = require('cheerio');
const db_module = require('./database');

const DOCTYPE_LINKS = [
  "https://idr.uin-antasari.ac.id/view/doctype/thesis.html",
  "https://idr.uin-antasari.ac.id/view/doctype/skripsi.html",
  "https://idr.uin-antasari.ac.id/view/doctype/article.html",
  "https://idr.uin-antasari.ac.id/view/doctype/monograph.html",
  "https://idr.uin-antasari.ac.id/view/doctype/laporan=5Fpenelitian.html",
  "https://idr.uin-antasari.ac.id/view/doctype/conference=5Fitem.html",
  "https://idr.uin-antasari.ac.id/view/doctype/disertasi.html",
  "https://idr.uin-antasari.ac.id/view/doctype/book.html",
  "https://idr.uin-antasari.ac.id/view/doctype/other.html"
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extract dokumen links dari halaman listing doctype
 */
async function extractDocumentLinks(typeUrl) {
  try {
    console.log(`  📄 Fetching: ${typeUrl}`);
    
    const response = await axios.get(typeUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const links = [];

    // Extract semua link dokumen dari halaman
    // Biasanya ada di selector: a[href*="/id/"] atau class tertentu
    $('a[href]').each((i, el) => {
      let href = $(el).attr('href');
      
      if (href && href.includes('/id/') && !href.includes('login') && !href.includes('logout')) {
        // Convert relative URL ke absolute
        if (!href.startsWith('http')) {
          const baseUrl = new URL(typeUrl);
          href = new URL(href, baseUrl).href;
        }
        
        if (!links.includes(href)) {
          links.push(href);
        }
      }
    });

    console.log(`  ✓ Found ${links.length} documents\n`);
    return links;
  } catch (error) {
    console.error(`  ❌ Error extracting from ${typeUrl}:`, error.message);
    return [];
  }
}

/**
 * Scrape detail dokumen dan ekstrak EPrints metadata
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
    console.error(`  ❌ Error scraping ${url}:`, error.message);
    return null;
  }
}

/**
 * Main scraping function
 */
async function main() {
  try {
    const db = db_module.initConnection();
    let totalScraped = 0;

    console.log('\n🚀 Starting comprehensive scraping from 9 document types...\n');

    for (let i = 0; i < DOCTYPE_LINKS.length; i++) {
      const typeUrl = DOCTYPE_LINKS[i];
      const docTypeName = typeUrl.split('/').pop().replace('.html', '').replace('=5F', '_');
      
      console.log(`\n[${i + 1}/${DOCTYPE_LINKS.length}] Processing: ${docTypeName}`);
      console.log('═'.repeat(60));

      // Extract document links from listing page
      const docLinks = await extractDocumentLinks(typeUrl);
      
      if (docLinks.length === 0) {
        console.log('  ⚠️  No documents found\n');
        continue;
      }

      // Scrape each document detail
      const documents = [];
      for (let j = 0; j < docLinks.length; j++) {
        const docUrl = docLinks[j];
        process.stdout.write(`  [${j + 1}/${docLinks.length}] Scraping... \r`);
        
        const docData = await scrapeDocumentDetail(docUrl);
        if (docData) {
          documents.push(docData);
        }
        
        // Delay between requests
        await delay(500);
      }

      console.log(`  ✓ Scraped ${documents.length} documents\n`);

      // Insert to database
      if (documents.length > 0) {
        try {
          const result = await db_module.insertDocuments(db, documents);
          console.log(`  📊 Database insertion result:`);
          console.log(`     - Inserted: ${result.inserted}`);
          console.log(`     - Duplicates: ${result.duplicates}`);
          console.log(`     - Errors: ${result.errors}\n`);
          
          totalScraped += result.inserted;
        } catch (error) {
          console.error(`  ❌ Database insertion error:`, error.message);
        }
      }

      // Delay before next doctype
      await delay(1000);
    }

    // Final statistics
    const stats = await db_module.getStatistics(db);
    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL STATISTICS:');
    console.log('═'.repeat(60));
    console.log(`✓ Total new documents scraped: ${totalScraped}`);
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
