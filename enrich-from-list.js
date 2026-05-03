/**
 * enrich-from-list.js
 *
 * Scrape 9 halaman list doctype IDR, lalu:
 *   - Kalau link SUDAH ada di DB → UPDATE author, year, type (jika lebih spesifik)
 *   - Kalau link BELUM ada di DB → INSERT sebagai record baru
 *
 * Script ini aman dijalankan berulang kali — tidak akan duplikat data.
 *
 * Cara pakai:
 *   node enrich-from-list.js            → upsert ke DB sesungguhnya
 *   node enrich-from-list.js --dry-run  → simulasi, tidak ada perubahan DB
 */

require('dotenv').config();
const axios   = require('axios');
const cheerio = require('cheerio');
const { initConnection, promisifyDb } = require('./database');

// ─── CONFIG ────────────────────────────────────────────────────────────────

const LIST_URLS = [
    { url: 'https://idr.uin-antasari.ac.id/view/doctype/thesis.html',               type: 'Tesis' },
  { url: 'https://idr.uin-antasari.ac.id/view/doctype/skripsi.html',              type: 'Skripsi' },
  { url: 'https://idr.uin-antasari.ac.id/view/doctype/article.html',              type: 'Artikel' },
  { url: 'https://idr.uin-antasari.ac.id/view/doctype/monograph.html',            type: 'Monografi' },
  { url: 'https://idr.uin-antasari.ac.id/view/doctype/book.html',                 type: 'Buku' },
  { url: 'https://idr.uin-antasari.ac.id/view/doctype/laporan=5Fpenelitian.html', type: 'Laporan Penelitian' },
  { url: 'https://idr.uin-antasari.ac.id/view/doctype/conference=5Fitem.html',    type: 'Konferensi' },
  { url: 'https://idr.uin-antasari.ac.id/view/doctype/disertasi.html',            type: 'Disertasi' },
  { url: 'https://idr.uin-antasari.ac.id/view/doctype/book.html',                 type: 'Buku' },
  { url: 'https://idr.uin-antasari.ac.id/view/doctype/other.html',                type: 'Lainnya' },
];

const DELAY_BETWEEN_PAGES_MS = 1500;
const BAR_WIDTH = 30;
const USER_AGENT = 'Mozilla/5.0 (compatible; IDR-ListEnricher/1.0)';

// ─── HELPERS ───────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function pad(n, w) { return String(n).padStart(w, ' '); }

/** Progress bar — overwrite baris yang sama setiap item */
function renderProgress(current, total, stats) {
  const filled = Math.round((current / total) * BAR_WIDTH);
  const bar    = '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
  const pct    = ((current / total) * 100).toFixed(1).padStart(5);
  const cur    = String(current).padStart(String(total).length);
  process.stdout.write(
    `\r  [${bar}] ${pct}%  ${cur}/${total}` +
    `  ✓${stats.inserted} ↑${stats.updated} ○${stats.skipped} ✗${stats.error}   `
  );
}

// ─── PARSER ────────────────────────────────────────────────────────────────

/**
 * Parse semua item dari satu halaman list EPrints.
 *
 * Struktur HTML aktual IDR:
 *   <div class="ep_view_page ep_view_page_view_doctype">
 *     <p>
 *       <span class="person_name">Khoiri, Afif</span>
 *       " (2026) "
 *       <a href="https://idr.uin-antasari.ac.id/30794/">
 *         <em>Judul Dokumen.</em>
 *       </a>
 *       " Skripsi, Syariah. "
 *     </p>
 *   </div>
 */
function parseListPage(html, baseUrl, type) {
  const $ = cheerio.load(html);
  const items = [];

  $('.ep_view_page p').each((_, el) => {
    const $el     = $(el);
    const $anchor = $el.find('a').first();

    let link = $anchor.attr('href');
    if (!link) return;

    if (!link.startsWith('http')) {
      try { link = new URL(link, baseUrl).href; } catch { return; }
    }
    if (!link.includes('uin-antasari.ac.id')) return;

    // Title: di dalam <a><em>...</em></a>
    let title = ($anchor.find('em').text() || $anchor.text())
      .trim()
      .replace(/^[\u201c\u201d"]+|[\u201c\u201d"]+$/g, '');
      
    // Tangani struktur E-Prints rusak (contoh: <a>)</a> Antasari Press...)
    if (!title || title === ')' || title === '(' || title.length < 3) {
      let fullText = $el.text().replace(/\s+/g, ' ').trim();
      const authorText = $el.find('span.person_name').text();
      const yearMatch = fullText.match(/\(\d{4}\)/);
      
      if (authorText) fullText = fullText.replace(authorText, '');
      if (yearMatch) fullText = fullText.replace(yearMatch[0], '');
      if ($anchor.text()) fullText = fullText.replace($anchor.text(), '');
      
      title = fullText.replace(/^[,\.\s"'\)and]+/, '').trim();
      if (!title) title = "Dokumen Tanpa Judul";
    }

    // Author: dukung multiple authors yang terpisah elemen
    let authors = [];
    $el.find('span.person_name').each((_, span) => {
      authors.push($(span).text().trim());
    });
    const author = authors.length > 0 ? authors.join('; ') : null;

    // Year: cari pola (YYYY) di teks lengkap elemen
    const yearMatch = $el.text().match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : null;

    items.push({ link, title, author, year, type });
  });

  return items;
}

// ─── UPSERT ────────────────────────────────────────────────────────────────

/**
 * Upsert satu item ke database.
 *
 * Strategi:
 *   - INSERT baru jika link belum ada.
 *   - Jika link sudah ada, UPDATE hanya field yang masih kosong/lebih umum:
 *       • author  → update jika DB kosong / 'Penulis Tidak Diketahui'
 *       • year    → update jika DB kosong
 *       • type    → update jika DB = 'Lainnya' dan data baru lebih spesifik
 *
 * Menggunakan PostgreSQL ON CONFLICT untuk atomicity.
 *
 * @returns {'inserted'|'updated'|'skipped'|'error'}
 */
async function upsertItem(asyncDb, item) {
  try {
    // Pakai ON CONFLICT untuk atomic upsert
    // Pada CONFLICT (link sudah ada), kita hanya update field yang:
    //   - author: jika EXCLUDED.author tidak null DAN (DB null/kosong/unknown)
    //   - year  : jika EXCLUDED.year tidak null DAN DB null/kosong
    //   - type  : jika DB masih 'Lainnya' DAN type baru lebih spesifik
    const result = await asyncDb.run(
      `INSERT INTO documents (title, link, type, author, year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (link) DO UPDATE SET
         title  = CASE
                    WHEN documents.title IS NULL OR documents.title = ''
                    THEN EXCLUDED.title
                    ELSE documents.title
                  END,
         author = CASE
                    WHEN EXCLUDED.author IS NOT NULL
                     AND (documents.author IS NULL
                          OR documents.author = ''
                          OR documents.author = 'Penulis Tidak Diketahui')
                    THEN EXCLUDED.author
                    ELSE documents.author
                  END,
         year   = CASE
                    WHEN EXCLUDED.year IS NOT NULL
                     AND (documents.year IS NULL OR documents.year = '')
                    THEN EXCLUDED.year
                    ELSE documents.year
                  END,
         type   = CASE
                    WHEN documents.type = 'Lainnya' AND EXCLUDED.type <> 'Lainnya'
                    THEN EXCLUDED.type
                    ELSE documents.type
                  END,
         updated_at = CASE
                    WHEN (EXCLUDED.author IS NOT NULL
                          AND (documents.author IS NULL OR documents.author = '' OR documents.author = 'Penulis Tidak Diketahui'))
                      OR (EXCLUDED.year IS NOT NULL AND (documents.year IS NULL OR documents.year = ''))
                      OR (documents.type = 'Lainnya' AND EXCLUDED.type <> 'Lainnya')
                    THEN CURRENT_TIMESTAMP
                    ELSE documents.updated_at
                  END
       RETURNING (xmax = 0) AS is_insert,
                 (xmax <> 0 AND updated_at = CURRENT_TIMESTAMP) AS is_update`,
      [item.title, item.link, item.type, item.author, item.year]
    );

    // xmax = 0 artinya INSERT baru; xmax != 0 artinya row lama yang di-UPDATE
    // Kita deteksi via kolom returning
    const row = result._raw; // lihat catatan di bawah
    return 'inserted'; // fallback — kita gunakan pendekatan sederhana di bawah

  } catch (err) {
    return 'error';
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        IDR List-Page Scraper + Enricher                ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`  Mode   : ${isDryRun ? '🔍 DRY RUN (tidak ada perubahan DB)' : '✏️  LIVE'}`);
  console.log(`  Target : ${LIST_URLS.length} halaman list doctype\n`);

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL tidak ditemukan di .env');
    process.exit(1);
  }

  const db      = initConnection();
  const asyncDb = promisifyDb(db);

  // ══════════════════════════════════════════════════════════════════════
  // FASE 1 — Scrape halaman list
  // ══════════════════════════════════════════════════════════════════════

  console.log('── FASE 1: Scraping halaman list ────────────────────────\n');

  const allItems = [];

  for (let p = 0; p < LIST_URLS.length; p++) {
    const { url, type } = LIST_URLS[p];
    process.stdout.write(`  [${p + 1}/${LIST_URLS.length}] ${type.padEnd(20)} … `);

    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: { 'User-Agent': USER_AGENT },
        validateStatus: (s) => s < 500,
      });

      if (response.status !== 200) {
        console.log(`✗ HTTP ${response.status}`);
        continue;
      }

      const items = parseListPage(response.data, url, type);
      allItems.push(...items);
      console.log(`✓  ${items.length.toLocaleString()} item`);

    } catch (err) {
      console.log(`✗ ${err.message}`);
    }

    if (p < LIST_URLS.length - 1) await delay(DELAY_BETWEEN_PAGES_MS);
  }

  // Deduplikasi dari hasil scrape (satu link bisa muncul di dua halaman)
  const seen   = new Set();
  const unique = allItems.filter(({ link }) => {
    if (seen.has(link)) return false;
    seen.add(link);
    return true;
  });

  console.log('');
  console.log(`  Total terkumpul  : ${allItems.length.toLocaleString()}`);
  console.log(`  Setelah deduplikasi : ${unique.length.toLocaleString()} item unik\n`);

  // ══════════════════════════════════════════════════════════════════════
  // DRY RUN
  // ══════════════════════════════════════════════════════════════════════

  if (isDryRun) {
    console.log('── [DRY RUN] 5 sampel item yang akan diproses ──────────\n');
    unique.slice(0, 5).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.link}`);
      console.log(`     title  : ${item.title}`);
      console.log(`     author : ${item.author || '-'}`);
      console.log(`     year   : ${item.year   || '-'}`);
      console.log(`     type   : ${item.type}`);
      console.log('');
    });
    console.log('  Jalankan tanpa --dry-run untuk proses sesungguhnya.\n');
    await db.end();
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // FASE 2 — Upsert ke database
  // ══════════════════════════════════════════════════════════════════════

  console.log('── FASE 2: Upsert ke database ───────────────────────────');
  console.log('   ✓ = INSERT baru   ↑ = UPDATE   ○ = tidak berubah   ✗ = error\n');

  const stats = { inserted: 0, updated: 0, skipped: 0, error: 0 };
  const total = unique.length;

  renderProgress(0, total, stats);

  for (let i = 0; i < total; i++) {
    const item = unique[i];

    try {
      // Cek apakah link sudah ada
      const existing = await asyncDb.get(
        `SELECT id, title, author, year, type FROM documents WHERE link = $1`,
        [item.link]
      );

      if (!existing) {
        // ── INSERT baru ─────────────────────────────────────────────────
        await asyncDb.run(
          `INSERT INTO documents (title, link, type, author, year)
           VALUES ($1, $2, $3, $4, $5)`,
          [item.title, item.link, item.type, item.author || '', item.year || '']
        );
        stats.inserted++;

      } else {
        // ── UPDATE jika ada field yang perlu dilengkapi ─────────────────
        const authorEmpty = !existing.author || existing.author === '' || existing.author === 'Penulis Tidak Diketahui';
        const yearEmpty   = !existing.year   || existing.year === '';
        const typeUpgrade = existing.type === 'Lainnya' && item.type !== 'Lainnya';

        if (authorEmpty || yearEmpty || typeUpgrade) {
          let updates = [];
          let params = [];
          let pIdx = 1;

          if (authorEmpty && item.author) {
            updates.push(`author = $${pIdx++}`);
            params.push(item.author);
          }
          if (yearEmpty && item.year) {
            updates.push(`year = $${pIdx++}`);
            params.push(item.year);
          }
          if (typeUpgrade && item.type) {
            updates.push(`type = $${pIdx++}`);
            params.push(item.type);
          }

          if (updates.length > 0) {
            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            params.push(existing.id);
            const updateSql = `UPDATE documents SET ${updates.join(', ')} WHERE id = $${pIdx}`;
            await asyncDb.run(updateSql, params);
            stats.updated++;
          } else {
            stats.skipped++;
          }
        } else {
          stats.skipped++;
        }
      }

    } catch (err) {
      stats.error++;
      // Log error pertama agar mudah dilacak jika terjadi masalah koneksi DB
      if (stats.error === 1) {
        console.log(`\n\n[DEBUG ERROR] Gagal eksekusi DB: ${err.message}`);
      }
    }

    renderProgress(i + 1, total, stats);
  }

  process.stdout.write('\n\n');

  // ══════════════════════════════════════════════════════════════════════
  // RINGKASAN
  // ══════════════════════════════════════════════════════════════════════

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  SELESAI                                               ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  ✓ INSERT baru          : ${pad(stats.inserted, 6)}                   ║`);
  console.log(`║  ↑ UPDATE dilengkapi    : ${pad(stats.updated,  6)}                   ║`);
  console.log(`║  ○ Tidak ada perubahan  : ${pad(stats.skipped,  6)}                   ║`);
  console.log(`║  ✗ Error               : ${pad(stats.error,    6)}                   ║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');

  await db.end();
}

main().catch((err) => {
  process.stdout.write('\n');
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});