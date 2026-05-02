#!/usr/bin/env node

/**
 * Script untuk menghapus SEMUA data scrap dari database
 */

require('dotenv').config({ override: true });
const db_module = require('./database');

async function clearAllData() {
  try {
    const db = db_module.initConnection();
    
    console.log('\n⚠️  WARNING: This will DELETE ALL documents from database!\n');
    
    // Get current count before deletion
    const statsBefore = await db_module.getStatistics(db);
    console.log(`📊 Documents before deletion: ${statsBefore.total}`);
    
    // Delete all documents
    const result = await db.query('DELETE FROM documents');
    console.log(`\n✓ Deleted: ${result.rowCount} rows\n`);
    
    // Verify deletion
    const statsAfter = await db_module.getStatistics(db);
    console.log(`📊 Documents after deletion: ${statsAfter.total}`);
    
    console.log('\n✅ All data cleared!\n');
    
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

clearAllData();
