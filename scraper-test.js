/**
 * Test & Demo Script untuk Scraper
 * 
 * Demonstrasi berbagai cara menggunakan scraper:
 * 1. Direct function call
 * 2. Scrape single URL
 * 3. Scrape multiple URLs dengan delay
 * 4. Error handling
 */

const { scrapePage, scrapeMultiple } = require('./scraper');

// Test 1: Single URL
async function testSingleURL() {
  console.log('\n=== TEST 1: Single URL ===\n');
  
  const url = 'https://idr.uin-antasari.ac.id';
  console.log(`Scraping: ${url}\n`);
  
  const results = await scrapePage(url);
  
  if (results.error) {
    console.error('Error:', results.message);
  } else {
    console.log(`✓ Ditemukan ${results.length} items\n`);
    
    // Show first 3 results
    results.slice(0, 3).forEach((item, i) => {
      console.log(`${i + 1}. Title: ${item.title.substring(0, 50)}`);
      console.log(`   Link: ${item.link}`);
      console.log(`   Desc: ${item.description.substring(0, 50)}...\n`);
    });
  }
}

// Test 2: Multiple URLs
async function testMultipleURLs() {
  console.log('\n=== TEST 2: Multiple URLs ===\n');
  
  const urls = [
    'https://idr.uin-antasari.ac.id/view/doctype/thesis.html',
    'https://idr.uin-antasari.ac.id/view/doctype/skripsi.html'
  ];
  
  console.log(`Scraping ${urls.length} halaman dengan delay 1 detik...\n`);
  
  const results = await scrapeMultiple(urls, 1000);
  
  console.log(`✓ Total ${results.length} items dari ${urls.length} halaman\n`);
  
  // Kelompokkan berdasarkan URL
  const grouped = {};
  results.forEach(item => {
    const domain = new URL(item.link).hostname;
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(item);
  });
  
  Object.entries(grouped).forEach(([domain, items]) => {
    console.log(`📍 ${domain}: ${items.length} items`);
  });
}

// Test 3: Error handling
async function testErrorHandling() {
  console.log('\n=== TEST 3: Error Handling ===\n');
  
  const invalidURLs = [
    'invalid-url',
    'https://non-existent-domain-12345.com',
    'https://idr.uin-antasari.ac.id'
  ];
  
  for (const url of invalidURLs) {
    console.log(`Testing: ${url}`);
    const result = await scrapePage(url);
    
    if (result.error) {
      console.log(`  ✗ Error: ${result.message}`);
    } else {
      console.log(`  ✓ Success: ${result.length} items`);
    }
  }
}

// Test 4: Performance test
async function testPerformance() {
  console.log('\n=== TEST 4: Performance Test ===\n');
  
  const urls = [
    'https://idr.uin-antasari.ac.id',
  ];
  
  console.log(`Testing scraping performance for ${urls.length} URL(s)...\n`);
  
  const startTime = Date.now();
  const results = await scrapeMultiple(urls, 500);
  const endTime = Date.now();
  
  const duration = (endTime - startTime) / 1000;
  const itemsPerSecond = results.length / duration;
  
  console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
  console.log(`📊 Items extracted: ${results.length}`);
  console.log(`⚡ Speed: ${itemsPerSecond.toFixed(0)} items/sec\n`);
}

// Main test runner
async function runTests() {
  try {
    // Uncomment test yang ingin dijalankan:
    // await testSingleURL();
    await testMultipleURLs();
    // await testErrorHandling();
    // await testPerformance();
    
    console.log('\n✅ Tests completed!\n');
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests();
}

module.exports = { testSingleURL, testMultipleURLs, testErrorHandling, testPerformance };
