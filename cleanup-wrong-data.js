#!/usr/bin/env node

/**
 * Script untuk menghapus data scrap yang salah
 * Menghapus semua dokumen yang berasal dari 9 link doctype yang error
 */

require('dotenv').config({ override: true });
const db_module = require('./database');

const WRONG_LINKS = [
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

async function cleanupWrongData() {
  try {
    const db = db_module.initConnection();
    
    console.log('\n🧹 Starting cleanup of wrong scraped data...\n');
    
    // Delete documents dari 9 link yang salah
    for (const link of WRONG_LINKS) {
      try {
        const result = await db.query(
          'DELETE FROM documents WHERE link = $1',
          [link]
        );
        console.log(`✓ Deleted from: ${link} (${result.rowCount} rows)`);
      } catch (error) {
        console.error(`❌ Error deleting ${link}:`, error.message);
      }
    }
    
    // Hapus juga dokumen yang link-nya mengandung pattern doctype jika ada
    try {
      const result = await db.query(
        "DELETE FROM documents WHERE link LIKE $1",
        ['%/view/doctype/%']
      );
      console.log(`\n✓ Deleted documents with /view/doctype/ pattern (${result.rowCount} rows)`);
    } catch (error) {
      // Ignore if LIKE not supported
    }
    
    // Show database statistics after cleanup
    const stats = await db_module.getStatistics(db);
    console.log(`\n📊 Database Statistics After Cleanup:`);
    console.log(`   Total documents: ${stats.total}`);
    console.log(`   Last updated: ${new Date().toISOString()}`);
    
    console.log('\n✅ Cleanup completed!\n');
    
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup error:', error);
    process.exit(1);
  }
}

cleanupWrongData();
