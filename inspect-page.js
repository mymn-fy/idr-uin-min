#!/usr/bin/env node

/**
 * Script untuk inspect HTML structure dari halaman doctype
 * Membantu debug struktur untuk scraping yang lebih akurat
 */

const axios = require('axios');
const cheerio = require('cheerio');

const testUrls = [
  "https://idr.uin-antasari.ac.id/view/doctype/thesis/",
  "https://idr.uin-antasari.ac.id/view/eprinttype/thesis/",
  "https://idr.uin-antasari.ac.id/cgi/search?output=html&eprinttype=thesis&order=creators",
  "https://idr.uin-antasari.ac.id/cgi/search?output=json&eprinttype=thesis"
];

let currentUrl = testUrls[0];

async function inspectPage() {
  try {
    console.log(`\n📋 Trying multiple URL patterns...\n`);
    
    for (let urlIdx = 0; urlIdx < testUrls.length; urlIdx++) {
      const url = testUrls[urlIdx];
      console.log(`\n[${urlIdx + 1}/${testUrls.length}] Testing: ${url}\n`);
      
      try {
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const $ = cheerio.load(response.data);
        
        console.log('Page Title:', $('title').text());
        console.log('Response length:', response.data.length, 'bytes\n');
        
        // Check if it's JSON
        if (response.headers['content-type']?.includes('json')) {
          console.log('Content-Type: JSON');
          try {
            const data = JSON.parse(response.data);
            console.log('JSON keys:', Object.keys(data).slice(0, 10));
          } catch (e) {}
        }
        
        console.log('------- LINKS/ITEMS FOUND -------\n');
        const items = [];
        $('a[href*="/id/"]').each((i, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          if (text.length > 0 && !href.includes('login') && !href.includes('logout')) {
            items.push({ text: text.substring(0, 60), href });
          }
        });
        
        items.slice(0, 15).forEach(item => {
          console.log(item.text);
          console.log(`  → ${item.href}\n`);
        });
        
        console.log(`Total items found: ${items.length}`);
        console.log('═'.repeat(60));
        
        if (items.length > 0) {
          console.log('\n✓ Found documents! Using this URL pattern.');
          break;
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

inspectPage();
