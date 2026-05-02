#!/usr/bin/env node

/**
 * Scraper CLI - Test script untuk scraping data
 * 
 * Penggunaan:
 *   node scraper-cli.js <url>
 *   node scraper-cli.js <url1> <url2> <url3>
 * 
 * Contoh:
 *   node scraper-cli.js https://idr.uin-antasari.ac.id
 */

const { scrapePage, scrapeMultiple } = require('./scraper');

// Get URLs dari command line arguments
const urls = process.argv.slice(2);

// Validasi input
if (urls.length === 0) {
  console.error('❌ Masukkan minimal satu URL');
  console.log('\nPenggunaan:');
  console.log('  node scraper-cli.js <url>');
  console.log('  node scraper-cli.js <url1> <url2> <url3>');
  console.log('\nContoh:');
  console.log('  node scraper-cli.js https://idr.uin-antasari.ac.id');
  process.exit(1);
}

// Main function
async function main() {
  try {
    console.log('\n🚀 Memulai scraping...\n');

    let results = [];

    if (urls.length === 1) {
      // Single URL
      console.log(`📄 Scraping: ${urls[0]}`);
      results = await scrapePage(urls[0]);

      if (results.error) {
        console.error(`\n❌ Error: ${results.message}`);
        process.exit(1);
      }
    } else {
      // Multiple URLs
      console.log(`📄 Scraping ${urls.length} halaman...`);
      results = await scrapeMultiple(urls, 1000);
    }

    // Display results
    console.log(`\n✅ Scraping selesai!\n`);
    console.log(`📊 Total items: ${results.length}\n`);

    if (results.length > 0) {
      console.log('📋 Hasil:\n');
      results.forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   Link: ${item.link}`);
        if (item.description) {
          console.log(`   Desc: ${item.description.substring(0, 80)}...`);
        }
        console.log();
      });

      // Export hasil ke JSON file
      const fs = require('fs');
      const filename = `scraped_data_${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(results, null, 2));
      console.log(`💾 Hasil disimpan ke: ${filename}`);
    } else {
      console.log('⚠️  Tidak ada data yang ditemukan');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
