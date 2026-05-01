const { Pool } = require('pg');

/**
 * Database Module - Manajemen SQLite untuk Search Engine
 * 
 * Menyediakan fungsi untuk:
 * - Inisialisasi database dan tabel
 * - Insert data dengan duplicate detection
 * - Query data
 * - Update dan delete
 */

// Promisify database operations
function promisifyDb(db) {
  return {
    run: async (sql, params = []) => {
      let i = 1;
      const pgSql = sql.replace(/\?/g, () => `$${i++}`);
      const res = await db.query(pgSql, params);
      return { id: res.rows[0]?.id, changes: res.rowCount };
    },
    get: async (sql, params = []) => {
      let i = 1;
      const pgSql = sql.replace(/\?/g, () => `$${i++}`);
      const res = await db.query(pgSql, params);
      return res.rows[0];
    },
    all: async (sql, params = []) => {
      let i = 1;
      const pgSql = sql.replace(/\?/g, () => `$${i++}`);
      const res = await db.query(pgSql, params);
      return res.rows;
    }
  };
}

// Initialize database connection
function initConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('✓ Supabase PostgreSQL connected');
  return pool;
}

// Initialize database tables
async function initDatabase(db) {
  const asyncDb = promisifyDb(db);
  
  try {
    // Create documents table dengan schema baru
    await asyncDb.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        link TEXT NOT NULL UNIQUE,
        description TEXT,
        content TEXT,
        type TEXT DEFAULT 'Lainnya',
        author TEXT,
        year TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, []);
    
    console.log('✓ Table "documents" created or already exists');
    
    // Create index pada link untuk query lebih cepat
    await asyncDb.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_link ON documents(link)
    `, []);
    
    console.log('✓ Index created or already exists');
    
    // Catatan: FTS5 dihapus karena merupakan fitur eksklusif SQLite.
    // Pencarian akan dialihkan ke mode fallback secara otomatis.
    
    // Coba tambahkan kolom 'category' jika belum ada (untuk migrasi database lama)
    try {
      await asyncDb.run('ALTER TABLE documents ADD COLUMN category TEXT');
      console.log('✓ Column "category" added for migration.');
    } catch (error) {
      // Abaikan error jika kolom sudah ada
      if (!error.message.includes('duplicate column name')) {
        console.error('Migration error:', error);
      }
    }

    // Coba tambahkan kolom 'type' jika belum ada (untuk migrasi database lama)
    try {
      await asyncDb.run('ALTER TABLE documents ADD COLUMN type TEXT DEFAULT "Lainnya"');
      console.log('✓ Column "type" added for migration.');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        console.error('Migration error (type):', error);
      }
    }

    try {
      await asyncDb.run('ALTER TABLE documents ADD COLUMN author TEXT');
      console.log('✓ Column "author" added for migration.');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) console.error('Migration error (author):', error);
    }

    try {
      await asyncDb.run('ALTER TABLE documents ADD COLUMN year TEXT');
      console.log('✓ Column "year" added for migration.');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) console.error('Migration error (year):', error);
    }

    // Update otomatis data lama agar menyesuaikan tipe berdasarkan link-nya
    try {
      await asyncDb.run(`UPDATE documents SET type = 'Tesis' WHERE link LIKE '%thesis%' AND type = 'Lainnya'`, []);
      await asyncDb.run(`UPDATE documents SET type = 'Skripsi' WHERE link LIKE '%skripsi%' AND type = 'Lainnya'`, []);
      await asyncDb.run(`UPDATE documents SET type = 'Artikel' WHERE link LIKE '%article%' AND type = 'Lainnya'`, []);
      await asyncDb.run(`UPDATE documents SET type = 'Monografi' WHERE link LIKE '%monograph%' AND type = 'Lainnya'`, []);
      await asyncDb.run(`UPDATE documents SET type = 'Laporan Penelitian' WHERE (link LIKE '%laporan_penelitian%' OR link LIKE '%laporan=5fpenelitian%') AND type = 'Lainnya'`, []);
      await asyncDb.run(`UPDATE documents SET type = 'Konferensi' WHERE (link LIKE '%conference_item%' OR link LIKE '%conference=5fitem%') AND type = 'Lainnya'`, []);
      await asyncDb.run(`UPDATE documents SET type = 'Disertasi' WHERE link LIKE '%disertasi%' AND type = 'Lainnya'`, []);
      console.log('✓ Data lama berhasil disinkronisasi dengan tipe filter.');
    } catch (e) {
      console.error('Sinkronisasi tipe gagal:', e);
    }

    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    return false;
  }
}

// Insert sample data
async function insertSampleData(db) {
  const asyncDb = promisifyDb(db);
  
  const samples = [
    {
      title: 'Universitas Islam Negeri Antasari',
      link: 'https://idr.uin-antasari.ac.id',
      category: 'Homepage',
      type: 'Lainnya',
      author: '',
      year: '',
      description: 'Halaman utama UIN Antasari Banjarmasin',
      content: 'Universitas Islam Negeri Antasari Banjarmasin adalah perguruan tinggi negeri yang berlokasi di Banjarmasin, Indonesia'
    },
    {
      title: 'Program Studi Informatika',
      link: 'https://idr.uin-antasari.ac.id/informatika',
      category: 'Akademik',
      type: 'Lainnya',
      author: '',
      year: '',
      description: 'Informasi tentang program studi Informatika',
      content: 'Program Studi Informatika menyediakan pendidikan berkualitas dalam bidang teknologi informasi dan komputer'
    },
    {
      title: 'Penelitian dan Pengembangan',
      link: 'https://idr.uin-antasari.ac.id/research',
      category: 'Penelitian',
      type: 'Lainnya',
      author: '',
      year: '',
      description: 'Pusat penelitian dan pengembangan UIN Antasari',
      content: 'Penelitian di UIN Antasari mencakup berbagai bidang akademik dan inovasi teknologi'
    },
    {
      title: 'Layanan Akademik',
      link: 'https://idr.uin-antasari.ac.id/akademik',
      category: 'Akademik',
      type: 'Lainnya',
      author: '',
      year: '',
      description: 'Layanan akademik untuk mahasiswa',
      content: 'Layanan akademik meliputi pendaftaran, akademik, dan bantuan kepada mahasiswa'
    }
  ];

  try {
    for (const sample of samples) {
      await asyncDb.run(
        `INSERT INTO documents (title, link, description, content, category, type, author, year) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sample.title, sample.link, sample.description, sample.content, sample.category, sample.type, sample.author, sample.year]
      );
    }
    console.log(`✓ ${samples.length} sample data inserted`);
  } catch (error) {
    // Ignore duplicate key errors (link already exists)
    if (error.code !== 'SQLITE_CONSTRAINT') {
      console.error('❌ Error inserting sample data:', error);
    }
  }
}

// Check if document exists by link
async function documentExists(db, link) {
  const asyncDb = promisifyDb(db);
  
  try {
    const result = await asyncDb.get(
      `SELECT id FROM documents WHERE link = ?`,
      [link]
    );
    return result ? result.id : null;
  } catch (error) {
    console.error('❌ Error checking document:', error);
    return null;
  }
}

// Insert single document (dengan duplicate checking)
async function insertDocument(db, data) {
  const asyncDb = promisifyDb(db);
  
  try {
    // Validasi input
    if (!data.title || !data.link) {
      throw new Error('title dan link harus diisi');
    }

    // Cek apakah link sudah ada (ambil ID dan tipe lama)
    const existingDoc = await asyncDb.get('SELECT id, type FROM documents WHERE link = ?', [data.link]);
    
    if (existingDoc) {
      // Jika data lama bertipe "Lainnya" dan kita mendapat tipe baru yang lebih spesifik, lakukan UPDATE!
      if (existingDoc.type === 'Lainnya' && data.type && data.type !== 'Lainnya') {
        await asyncDb.run(
          `UPDATE documents SET title = ?, description = ?, content = ?, type = ?, author = ?, year = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [data.title, data.description || '', data.content || '', data.type, data.author || '', data.year || '', existingDoc.id]
        );
        console.log(`✨ Document Di-upgrade: ${data.title} (Menjadi: ${data.type})`);
        return { success: true, id: existingDoc.id };
      }
      return { success: false, message: 'Link sudah ada', id: existingDoc.id };
    }

    // Insert data baru
    const result = await asyncDb.run(
      `INSERT INTO documents (title, link, description, content, category, type, author, year) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [data.title, data.link, data.description || '', data.content || '', data.category || null, data.type || 'Lainnya', data.author || '', data.year || '']
    );

    console.log(`✓ Document inserted: ${data.title} (ID: ${result.id})`);
    return { success: true, id: result.id };
  } catch (error) {
    console.error(`❌ Error inserting document:`, error);
    return { success: false, error: error.message };
  }
}

// Insert multiple documents (batch insert)
async function insertDocuments(db, documents) {
  const asyncDb = promisifyDb(db);
  
  const results = {
    inserted: 0,
    duplicates: 0,
    errors: 0,
    details: []
  };

  const total = documents.length;
  if (total > 0) {
    console.log(`\n⏳ Mulai menyinkronkan ${total} data ke Supabase... (Ini mungkin memakan waktu belasan menit)`);
  }

  try {
    for (let i = 0; i < total; i++) {
      const doc = documents[i];
      
      // Tampilkan progress setiap 500 data agar tidak terlihat macet
      if ((i + 1) % 500 === 0 || i + 1 === total) {
        console.log(`   ➔ Progress: [${i + 1}/${total}] data telah diproses...`);
      }

      try {
        // Validasi
        if (!doc.title || !doc.link) {
          results.errors++;
          results.details.push({ link: doc.link, status: 'error', message: 'title atau link kosong' });
          continue;
        }

        // Cek duplikat & Auto-Upgrade Type
        const existingDoc = await asyncDb.get('SELECT id, type FROM documents WHERE link = ?', [doc.link]);
        if (existingDoc) {
          if (existingDoc.type === 'Lainnya' && doc.type && doc.type !== 'Lainnya') {
            await asyncDb.run(
              `UPDATE documents SET title = ?, description = ?, content = ?, type = ?, author = ?, year = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [doc.title, doc.description || '', doc.content || '', doc.type, doc.author || '', doc.year || '', existingDoc.id]
            );
            results.inserted++; // Hitung sebagai berhasil terproses
          } else {
            results.duplicates++;
            results.details.push({ link: doc.link, status: 'duplicate' });
          }
          continue;
        }

        // Insert
        const result = await asyncDb.run(
          `INSERT INTO documents (title, link, description, content, category, type, author, year) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
          [doc.title, doc.link, doc.description || '', doc.content || '', doc.category || null, doc.type || 'Lainnya', doc.author || '', doc.year || '']
        );

        results.inserted++;
        results.details.push({ link: doc.link, status: 'inserted', id: result.id });
      } catch (error) {
        results.errors++;
        results.details.push({ link: doc.link, status: 'error', message: error.message });
      }
    }
  } catch (error) {
    console.error('❌ Error in batch insert:', error);
  }

  return results;
}

// Search documents
async function searchDocuments(db, query, limit = 20) {
  const asyncDb = promisifyDb(db);
  
  try {
    if (!query || query.trim() === '') {
      return [];
    }

    const searchQuery = `%${query}%`;
    const results = await asyncDb.all(
      `SELECT id, title, link, description, content, category, type, author, year, created_at 
       FROM documents 
       WHERE title LIKE ? OR content LIKE ? OR description LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [searchQuery, searchQuery, searchQuery, limit]
    );

    return results;
  } catch (error) {
    console.error('❌ Error searching documents:', error);
    return [];
  }
}

// Search documents dengan FTS5 (Full Text Search dengan ranking)
async function searchDocumentsWithFTS(db, query, typeFilter, page = 1, limit = 10, sortBy = 'relevance') {
  const asyncDb = promisifyDb(db);
  
  try {
    const offset = (page - 1) * limit;

    // Jika query kosong, gunakan standar SELECT (tanpa algoritma MATCH FTS5)
    if (!query || query.trim() === '') {
      let baseSql = `FROM documents WHERE 1=1`;
      const params = [];

      if (typeFilter && typeFilter !== 'all') {
        baseSql += ` AND type = ?`;
        params.push(typeFilter);
      }

      let orderByClause = 'ORDER BY created_at DESC'; // default
      if (sortBy === 'newest') {
        orderByClause = 'ORDER BY created_at DESC';
      }

      const countSql = `SELECT COUNT(*) as total ${baseSql}`;
      const countResult = await asyncDb.get(countSql, params);
      const total = countResult ? parseInt(countResult.total) : 0;

      const dataSql = `
        SELECT id, title, link, description, content, category, type, author, year, created_at, 0 as relevance_score
        ${baseSql} ${orderByClause} LIMIT ? OFFSET ?`;
      const results = await asyncDb.all(dataSql, [...params, limit, offset]);

      return { results, total, page, totalPages: Math.ceil(total / limit) };
    }

    // FTS5 query dengan OR operator untuk pencarian lebih luas
    // Escape quotes dan prepare query
    const ftsQuery = query
      .trim()
      .replace(/"/g, '""')
      .split(/\s+/)
      .join(' OR ');

    let baseSql = `
       FROM documents_fts as fts
       JOIN documents as d ON fts.rowid = d.id
       WHERE documents_fts MATCH ?
    `;
    const params = [ftsQuery];

    // Tambahkan filter tipe jika ada (digunakan server.js saat passing typeFilter)
    if (typeFilter && typeFilter !== 'all') {
      baseSql += ' AND d.type = ?';
      params.push(typeFilter);
    }

    // Tentukan klausa ORDER BY berdasarkan parameter sortBy
    let orderByClause = 'ORDER BY fts.rank'; // Default: urutkan berdasarkan relevansi
    if (sortBy === 'newest') {
      orderByClause = 'ORDER BY d.created_at DESC';
    }

    // 1. Hitung total data untuk meta pagination
    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const countResult = await asyncDb.get(countSql, params);
    const total = countResult ? parseInt(countResult.total) : 0;

    // 2. Ambil hasil query dengan FULLTEXT search & prepared statements
    const dataSql = `
      SELECT 
        d.id, d.title, d.link, d.description, d.content, 
        d.category, d.type, d.author, d.year, d.created_at,
        CAST(fts.rank AS REAL) as relevance_score
      ${baseSql} ${orderByClause} LIMIT ? OFFSET ?`;
    const results = await asyncDb.all(dataSql, [...params, limit, offset]);

    return {
      results,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('❌ Error searching with FTS:', error);
    // Return fallback result dalam format yang sama
    const fallback = await searchDocuments(db, query, limit);
    return { results: fallback, total: fallback.length, page: 1, totalPages: 1 };
  }
}

// Get all documents
async function getAllDocuments(db, limit = 100) {
  const asyncDb = promisifyDb(db);
  
  try {
    const results = await asyncDb.all(
      `SELECT id, title, link, description, content, category, type, author, year, created_at, updated_at 
       FROM documents 
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    return results;
  } catch (error) {
    console.error('❌ Error getting documents:', error);
    return [];
  }
}

// Get document by ID
async function getDocumentById(db, id) {
  const asyncDb = promisifyDb(db);
  
  try {
    const result = await asyncDb.get(
      `SELECT id, title, link, description, content, category, type, author, year, created_at, updated_at 
       FROM documents 
       WHERE id = ?`,
      [id]
    );

    return result;
  } catch (error) {
    console.error('❌ Error getting document:', error);
    return null;
  }
}

// Update document
async function updateDocument(db, id, data) {
  const asyncDb = promisifyDb(db);
  
  try {
    const result = await asyncDb.run(
      `UPDATE documents 
       SET title = ?, description = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [data.title || '', data.description || '', data.content || '', id]
    );

    if (result.changes > 0) {
      console.log(`✓ Document updated: ID ${id}`);
      return { success: true };
    } else {
      return { success: false, message: 'Document not found' };
    }
  } catch (error) {
    console.error('❌ Error updating document:', error);
    return { success: false, error: error.message };
  }
}

// Delete document
async function deleteDocument(db, id) {
  const asyncDb = promisifyDb(db);
  
  try {
    const result = await asyncDb.run(
      `DELETE FROM documents WHERE id = ?`,
      [id]
    );

    if (result.changes > 0) {
      console.log(`✓ Document deleted: ID ${id}`);
      return { success: true };
    } else {
      return { success: false, message: 'Document not found' };
    }
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    return { success: false, error: error.message };
  }
}

// Get statistics
async function getStatistics(db) {
  const asyncDb = promisifyDb(db);
  
  try {
    const result = await asyncDb.get(
      `SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT link) as unique_links,
        MAX(created_at) as latest_added
       FROM documents`
    );

    return {
      total: parseInt(result.total || 0),
      unique_links: parseInt(result.unique_links || 0),
      latest_added: result.latest_added
    };
  } catch (error) {
    console.error('❌ Error getting statistics:', error);
    return { total: 0, unique_links: 0 };
  }
}

// Clear all documents (dangerous!)
async function clearAllDocuments(db) {
  const asyncDb = promisifyDb(db);
  
  try {
    const result = await asyncDb.run(
      `DELETE FROM documents`,
      []
    );

    console.log(`✓ All documents cleared (${result.changes} rows deleted)`);
    return { success: true, deleted: result.changes };
  } catch (error) {
    console.error('❌ Error clearing documents:', error);
    return { success: false, error: error.message };
  }
}

// Export functions
module.exports = {
  initConnection,
  initDatabase,
  insertSampleData,
  documentExists,
  insertDocument,
  insertDocuments,
  searchDocuments,
  searchDocumentsWithFTS,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getStatistics,
  clearAllDocuments,
  promisifyDb
};
