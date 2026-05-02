#!/usr/bin/env node

/**
 * Script untuk melengkapi data Penulis (Author) dan Tahun (Year)
 * untuk dokumen yang sudah tersimpan di database tetapi belum memiliki data tersebut.
 */

require('dotenv').config({ override: true });
const dns = require('dns');
// Paksa Node.js menggunakan IPv4 untuk menghindari masalah blokir ISP
dns.setDefaultResultOrder('ipv4first');

const db_module = require('./database');
const axios = require('axios');
const cheerio = require('cheerio');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TARGET_LINKS = [
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

async function updateAuthorYear() {
  const db = db_module.initConnection();
  
  console.log('\n Memulai mode FAST UPDATE dari 9 halaman kategori...\n');
  console.log('Metode ini HANYA butuh 9 request web. Sangat cepat dan aman dari blokir!\n');

  let totalUpdated = 0;
  let totalSkipped = 0;

  try {
    for (let i = 0; i < TARGET_LINKS.length; i++) {
      const url = TARGET_LINKS[i];
      console.log(`\n[${i + 1}/${TARGET_LINKS.length}] Fetching list: ${url}`);
      
      try {
        const response = await axios.get(url, {
          timeout: 60000, // Timeout besar krn halamannya bisa panjang (ribuan list)
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const $ = cheerio.load(response.data);
        const listItems = $('.ep_view_content p');
        
        console.log(`   Ditemukan ${listItems.length} dokumen. Memproses update ke DB...`);
        
        const updates = [];
        listItems.each((index, element) => {
          const $element = $(element);
          const $link = $element.find('a').first();
          
          let link = $link.attr('href');
          let fullText = $element.text().trim();
          
          if (link && fullText) {
            // Normalisasi link menjadi format absolute URL yg ada di Supabase
            if (!link.startsWith('http')) {
              link = new URL(link, url).href;
            }
            
            let author = '';
            let year = '';
            
            // Pisahkan format "Nama Penulis (2025) Judul..."
            if (fullText.includes('(')) {
              author = fullText.split('(')[0].trim();
              const yearMatch = fullText.match(/\((\d{4})\)/);
              year = yearMatch ? yearMatch[1] : '';
            }
            
            author = author || 'Penulis Tidak Diketahui';
            updates.push({ link, author, year });
          }
        });

        // Eksekusi update baris per baris ke Supabase
        let pageUpdated = 0;
        for (let j = 0; j < updates.length; j++) {
          const item = updates[j];
          
          // Ambil ID Unik Eprints dari link (misal: "12345" dari ".../12345/" atau ".../eprint/12345/")
          const idMatch = item.link.match(/\/(\d+)\/?$/) || item.link.match(/\/eprint\/(\d+)/);
          const eprintId = idMatch ? idMatch[1] : null;
          
          let res;
          if (eprintId) {
            // Gunakan pencocokan ID eprint agar aman dari perbedaan format URL (http vs https atau tambahan /id/eprint/)
            res = await db.query(`
              UPDATE documents 
              SET author = $1, year = $2, updated_at = CURRENT_TIMESTAMP 
              WHERE (link LIKE '%/' || $3 || '/' OR link LIKE '%/eprint/' || $3 || '/%' OR link LIKE '%/' || $3) 
                AND (author IS NULL OR author = '' OR author = 'Penulis Tidak Diketahui' OR year IS NULL OR year = '')
            `, [item.author, item.year, eprintId]);
          } else {
            // Fallback jika tidak menemukan ID di URL
            res = await db.query(`
              UPDATE documents 
              SET author = $1, year = $2, updated_at = CURRENT_TIMESTAMP 
              WHERE link = $3 
                AND (author IS NULL OR author = '' OR author = 'Penulis Tidak Diketahui' OR year IS NULL OR year = '')
            `, [item.author, item.year, item.link]);
          }

          if (res.rowCount > 0) {
            pageUpdated++;
            totalUpdated++;
          } else {
            totalSkipped++;
          }

          if ((j + 1) % 1000 === 0) {
            console.log(`     Progress DB: ${j + 1}/${updates.length} di-scan...`);
          }
        }
        
        console.log(`   ✓ Selesai update dari halaman ini: ${pageUpdated} baris baru di-lengkapi.`);
        await delay(2000); // Beri nafas sedikit sebelum fetch halaman selanjutnya
        
      } catch (err) {
        console.error(`   ❌ Error fetching ${url}:`, err.message);
      }
    }

    console.log(`\n✅ SEMUA SELESAI!`);
    console.log(`📊 Total data yang berhasil dilengkapi (Di-update): ${totalUpdated}`);
    console.log(`⏭️  Total data yang dilewati (Karna sudah punya author/year): ${totalSkipped}\n`);

  } catch (error) {
    console.error('\n❌ Terjadi kesalahan pada database:', error.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

updateAuthorYear();