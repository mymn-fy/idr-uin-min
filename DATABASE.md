# Database Integration Guide

Panduan lengkap untuk integrasi SQLite dalam project Search Engine IDR UIN Antasari.

## Ringkasan Cepat

✅ **Tabel Documents** dengan schema: id, title, link, description, content, created_at, updated_at
✅ **Duplicate Detection** berbasis `link` (UNIQUE constraint)
✅ **Database Module** dengan 13 fungsi utility yang siap pakai
✅ **Batch Insert** dengan tracking: inserted, duplicates, errors
✅ **Search & Query** dengan LIKE dan filtering

---

## Struktur Database

### Tabel: documents

```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  description TEXT,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Penjelasan Kolom:**

| Kolom       | Tipe     | Constraints                 | Deskripsi                          |
| ----------- | -------- | --------------------------- | ---------------------------------- |
| id          | INTEGER  | PRIMARY KEY, AUTO INCREMENT | Identifier unik                    |
| title       | TEXT     | NOT NULL                    | Judul halaman/dokumen              |
| **link**    | TEXT     | NOT NULL, **UNIQUE**        | URL halaman (kunci untuk duplikat) |
| description | TEXT     | Optional                    | Deskripsi singkat (max 150 char)   |
| content     | TEXT     | Optional                    | Konten lengkap halaman             |
| created_at  | DATETIME | DEFAULT CURRENT_TIMESTAMP   | Waktu record dibuat                |
| updated_at  | DATETIME | DEFAULT CURRENT_TIMESTAMP   | Waktu record terakhir diupdate     |

**Index:**

```sql
CREATE INDEX idx_documents_link ON documents(link)
```

Mempercepat query pencarian berdasarkan `link`.

---

## Fitur Duplicate Detection

### Cara Kerja

1. **Insert Satu Document:**

   ```javascript
   await insertDocument(db, {
     title: "Halaman Baru",
     link: "https://idr.uin-antasari.ac.id/new",
     description: "Desc",
     content: "Content",
   });
   ```

   Proses:
   - ✓ Cek apakah `link` sudah ada
   - ✓ Jika ada → skip, return `{ success: false, id: existingId }`
   - ✓ Jika tidak → insert, return `{ success: true, id: newId }`

2. **Batch Insert Multiple:**

   ```javascript
   await insertDocuments(db, [
     { title: 'Doc 1', link: 'url1', ... },
     { title: 'Doc 2', link: 'url2', ... }
   ]);
   ```

   Return:

   ```javascript
   {
     inserted: 2,      // Berhasil insert
     duplicates: 1,    // Link sudah ada
     errors: 0,        // Ada error
     details: [...]    // Detail setiap item
   }
   ```

### Keuntungan Unique Constraint

- ✅ Database-level integrity
- ✅ Otomatis reject duplicate on insert
- ✅ Performance lebih baik untuk checking
- ✅ Tidak perlu query tambahan

---

## API Database Module

File: `database.js`

### 1. initConnection()

Membuat koneksi ke SQLite database.

```javascript
const db = db_module.initConnection();
```

**Return:** SQLite database object

---

### 2. initDatabase(db)

Inisialisasi tabel dan index.

```javascript
await db_module.initDatabase(db);
```

**Tindakan:**

- Buat tabel `documents` jika belum ada
- Buat index pada kolom `link`

**Return:** boolean (success/fail)

---

### 3. insertSampleData(db)

Insert 4 data sample ke database.

```javascript
await db_module.insertSampleData(db);
```

**Data Sample:**

- Universitas Islam Negeri Antasari
- Program Studi Informatika
- Penelitian dan Pengembangan
- Layanan Akademik

---

### 4. documentExists(db, link)

Cek apakah document dengan link tertentu sudah ada.

```javascript
const id = await db_module.documentExists(db, "https://idr.uin-antasari.ac.id");
// id = null (tidak ada) atau id = 1 (ada)
```

**Return:** ID jika ada, null jika tidak ada

---

### 5. insertDocument(db, data)

Insert satu document dengan duplicate checking.

```javascript
const result = await db_module.insertDocument(db, {
  title: "Halaman Baru",
  link: "https://idr.uin-antasari.ac.id/page",
  description: "Deskripsi singkat",
  content: "Konten lengkap halaman...",
});

// result:
// { success: true, id: 5 }  ← insert berhasil
// { success: false, message: 'Link sudah ada', id: 2 }  ← duplikat
```

**Parameters:**

- `title` (required) - Judul halaman
- `link` (required) - URL halaman
- `description` (optional) - Deskripsi singkat
- `content` (optional) - Konten lengkap

**Return:**

```javascript
{
  success: boolean,
  id?: number,           // ID document
  message?: string,      // Pesan error/info
  error?: string         // Detail error
}
```

---

### 6. insertDocuments(db, documents)

Insert multiple documents sekaligus dengan batch processing.

```javascript
const results = await db_module.insertDocuments(db, [
  {
    title: 'Halaman 1',
    link: 'https://idr.uin-antasari.ac.id/page1',
    description: 'Desc 1',
    content: 'Content 1'
  },
  {
    title: 'Halaman 2',
    link: 'https://idr.uin-antasari.ac.id/page2',
    description: 'Desc 2',
    content: 'Content 2'
  }
]);

// results:
{
  inserted: 2,           // Berhasil insert
  duplicates: 0,         // Link sudah ada
  errors: 0,             // Ada error
  details: [
    { link: 'url1', status: 'inserted', id: 5 },
    { link: 'url2', status: 'inserted', id: 6 }
  ]
}
```

**Return:**

```javascript
{
  inserted: number,      // Jumlah yang berhasil
  duplicates: number,    // Jumlah duplikat
  errors: number,        // Jumlah error
  details: Array         // Detail untuk setiap item
}
```

---

### 7. searchDocuments(db, query, limit)

Cari document berdasarkan query (search dalam title, content, description).

```javascript
const results = await db_module.searchDocuments(db, "informatika", 20);

// results:
[
  {
    id: 1,
    title: "Program Studi Informatika",
    link: "https://...",
    description: "Informasi tentang...",
    content: "...",
    created_at: "2026-05-01T10:30:00Z",
  },
];
```

**Parameters:**

- `query` (string) - Kata kunci pencarian
- `limit` (number, default: 20) - Maksimal hasil

**Searchable Fields:**

- `title` (LIKE query)
- `content` (LIKE query)
- `description` (LIKE query)

**Return:** Array of documents

---

### 8. getAllDocuments(db, limit)

Ambil semua document dari database.

```javascript
const documents = await db_module.getAllDocuments(db, 100);
```

**Parameters:**

- `limit` (number, default: 100) - Maksimal document

**Return:** Array of documents ordered by created_at DESC

---

### 9. getDocumentById(db, id)

Ambil document spesifik berdasarkan ID.

```javascript
const doc = await db_module.getDocumentById(db, 1);

// doc:
{
  id: 1,
  title: 'Halaman',
  link: 'https://...',
  description: 'Desc',
  content: 'Content',
  created_at: '2026-05-01T10:30:00Z',
  updated_at: '2026-05-01T10:30:00Z'
}
```

**Return:** Document object atau null

---

### 10. updateDocument(db, id, data)

Update document yang sudah ada.

```javascript
await db_module.updateDocument(db, 1, {
  title: 'Title Baru',
  description: 'Description Baru',
  content: 'Content Baru'
});

// return:
{ success: true }
// atau
{ success: false, message: 'Document not found' }
```

**Return:**

```javascript
{
  success: boolean,
  message?: string,
  error?: string
}
```

---

### 11. deleteDocument(db, id)

Hapus document dari database.

```javascript
await db_module.deleteDocument(db, 1);

// return:
{
  success: true;
}
```

**Return:**

```javascript
{
  success: boolean,
  message?: string,
  error?: string
}
```

---

### 12. getStatistics(db)

Ambil statistik database.

```javascript
const stats = await db_module.getStatistics(db);

// stats:
{
  total: 50,                    // Total documents
  unique_links: 50,             // Unique links
  latest_added: '2026-05-01...' // Waktu document terbaru
}
```

**Return:** Statistics object

---

### 13. clearAllDocuments(db)

Hapus SEMUA documents dari database (hati-hati!).

```javascript
await db_module.clearAllDocuments(db);

// return:
{ success: true, deleted: 50 }
```

**Return:**

```javascript
{
  success: boolean,
  deleted?: number,
  error?: string
}
```

---

## Contoh Implementasi

### 1. Integrasi di server.js

```javascript
const db_module = require("./database");

// Initialize
const db = db_module.initConnection();

// Setup database
setTimeout(async () => {
  await db_module.initDatabase(db);

  // Insert sample data jika kosong
  const stats = await db_module.getStatistics(db);
  if (stats.total === 0) {
    await db_module.insertSampleData(db);
  }
}, 500);

// Express route
app.get("/search", async (req, res) => {
  const query = req.query.q || "";
  const results = await db_module.searchDocuments(db, query, 20);

  res.json({
    results: results,
    query: query,
    count: results.length,
  });
});
```

### 2. Insert Hasil Scraping

```javascript
const { scrapePage } = require("./scraper");
const db_module = require("./database");

// Scrape halaman
const scraped = await scrapePage("https://idr.uin-antasari.ac.id");

// Insert ke database (auto duplicate detection)
const result = await db_module.insertDocuments(db, scraped);

console.log(`Inserted: ${result.inserted}, Duplicates: ${result.duplicates}`);
```

### 3. Batch Processing

```javascript
async function processManyPages(urls) {
  for (const url of urls) {
    // Scrape
    const data = await scrapePage(url);

    // Insert dengan duplicate checking
    const result = await db_module.insertDocuments(db, data);

    // Log hasil
    if (result.inserted > 0) {
      console.log(`✓ ${url}: ${result.inserted} items inserted`);
    }
    if (result.duplicates > 0) {
      console.log(`⚠️  ${url}: ${result.duplicates} duplicates`);
    }

    // Delay 1 detik
    await new Promise((r) => setTimeout(r, 1000));
  }
}
```

### 4. Search API

```javascript
// GET /search?q=informatika
app.get("/search", async (req, res) => {
  const query = req.query.q || "";

  try {
    const results = await db_module.searchDocuments(db, query, 20);

    res.json({
      results: results,
      query: query,
      count: results.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Query Optimization

### Indexed Searches

Kolom `link` sudah punya index untuk query cepat:

```javascript
// Fast (indexed):
const exists = await documentExists(db, link);

// Slow (full table scan):
const doc = await db.get("SELECT * FROM documents WHERE title = ?", [title]);
```

### LIKE Query Performance

Untuk mencari dalam content besar, gunakan simple LIKE:

```javascript
// Baik:
const results = await searchDocuments(db, "informatika", 20);

// Buruk (full scan):
const results = await db.all("SELECT * FROM documents WHERE content LIKE ?", [
  "%informatika%",
]);
```

---

## Error Handling

### Duplicate Detection

```javascript
const result = await insertDocument(db, data);

if (!result.success) {
  if (result.message === "Link sudah ada") {
    console.log(`Document already exists with ID: ${result.id}`);
  } else {
    console.error("Error:", result.error);
  }
}
```

### Batch Insert

```javascript
const results = await insertDocuments(db, documents);

console.log(`✓ Inserted: ${results.inserted}`);
console.log(`⚠️  Duplicates: ${results.duplicates}`);
console.log(`✗ Errors: ${results.errors}`);

results.details.forEach((detail) => {
  if (detail.status === "error") {
    console.error(`Error: ${detail.link} - ${detail.message}`);
  }
});
```

---

## Tips & Best Practices

1. **Always Initialize First:**

   ```javascript
   const db = db_module.initConnection();
   await db_module.initDatabase(db);
   ```

2. **Check for Duplicates:**

   ```javascript
   const exists = await db_module.documentExists(db, link);
   if (!exists) {
     await db_module.insertDocument(db, data);
   }
   ```

3. **Use Batch Insert for Multiple Items:**

   ```javascript
   // ✓ Baik
   await db_module.insertDocuments(db, items);

   // ✗ Buruk
   for (item of items) {
     await db_module.insertDocument(db, item);
   }
   ```

4. **Handle Errors Gracefully:**

   ```javascript
   try {
     const results = await db_module.insertDocuments(db, data);
     console.log(`Inserted: ${results.inserted}`);
   } catch (error) {
     console.error("Database error:", error);
   }
   ```

5. **Monitor Statistics:**
   ```javascript
   const stats = await db_module.getStatistics(db);
   console.log(`Total documents: ${stats.total}`);
   console.log(`Unique links: ${stats.unique_links}`);
   ```

---

## Troubleshooting

### Database Lock Error

**Problem:** `database is locked`

**Solution:**

- Kurangi concurrent writes
- Gunakan batch insert daripada single insert
- Tambah timeout

```javascript
const db = db_module.initConnection();
db.configure("busyTimeout", 10000); // 10 detik timeout
```

### Duplicate Insert Not Rejected

**Problem:** Record dengan link sama ter-insert dua kali

**Cause:** Unique constraint tidak aktif atau insert bypass

**Solution:**

- Pastikan menggunakan `insertDocuments()`
- Check sebelum insert dengan `documentExists()`
- Jangan gunakan raw SQL INSERT

### Search Query Slow

**Problem:** Search response lambat untuk banyak records

**Solution:**

- Limit hasil: `searchDocuments(db, query, 20)`
- Tambah more indexes jika perlu
- Use LIMIT dalam query

---

## File Reference

- **File:** `database.js` - Database module
- **File:** `server.js` - Express server dengan database integration
- **File:** `public/js/search.js` - Frontend search (updated untuk use `link` field)

---

## Quick Test

```javascript
// Test database integration
const db_module = require("./database");

async function test() {
  const db = db_module.initConnection();
  await db_module.initDatabase(db);

  // Insert test
  const result = await db_module.insertDocument(db, {
    title: "Test Page",
    link: "https://test.example.com",
    description: "Test description",
    content: "Test content",
  });

  console.log("Insert result:", result);

  // Search test
  const search = await db_module.searchDocuments(db, "test", 10);
  console.log("Search result:", search);

  // Stats test
  const stats = await db_module.getStatistics(db);
  console.log("Stats:", stats);
}

test().catch(console.error);
```

---

**Last Updated:** May 1, 2026
