# Search Engine - IDR UIN Antasari

Mesin pencari sederhana untuk situs idr.uin-antasari.ac.id

## Stack Teknologi

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Database**: SQLite

## Struktur Project

```
idr-uin-min/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── search.js
│   └── index.html
├── database/
│   └── search.db (auto-created)
├── server.js
├── database.js
├── scraper.js
├── scraper-cli.js
├── scraper-test.js
├── package.json
├── .gitignore
├── README.md
├── DATABASE.md (dokumentasi database lengkap)
└── SCRAPER_GUIDE.js
```

## Instalasi

1. **Clone/Download project**

```bash
cd idr-uin-min
```

2. **Install dependencies**

```bash
npm install
```

3. **Jalankan server**

```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

## Fitur

✅ Search endpoint GET / (Homepage)
✅ Search endpoint GET /search?q= (API Search)
✅ **Scraping dengan axios + cheerio**
✅ Ekstrak title, link, dan description dari halaman
✅ Delay 1 detik antar request (anti-blocking)
✅ Database SQLite dengan sample data
✅ UI responsive dan user-friendly
✅ Highlight hasil pencarian
✅ Error handling

## API Endpoints

### GET /

Menampilkan homepage dengan form pencarian

### GET /search?q={query}

Melakukan pencarian berdasarkan query

- Parameter: `q` (string) - kata kunci pencarian
- Response: JSON dengan format:

```json
{
  "results": [
    {
      "id": 1,
      "title": "Halaman Title",
      "link": "https://idr.uin-antasari.ac.id/page",
      "description": "Deskripsi halaman",
      "content": "Konten lengkap halaman...",
      "created_at": "2026-05-01T10:30:00Z"
    }
  ],
  "query": "...",
  "count": 1
}
```

### POST /api/scrape

Scrape data dari satu URL dengan duplicate checking

**Request:**

```json
{
  "url": "https://idr.uin-antasari.ac.id"
}
```

**Response:**

```json
{
  "success": true,
  "url": "https://idr.uin-antasari.ac.id",
  "itemsFound": 15,
  "items": [
    {
      "title": "Halaman",
      "link": "https://idr.uin-antasari.ac.id/page",
      "description": "Deskripsi singkat..."
    }
  ],
  "database": {
    "inserted": 10,
    "duplicates": 3,
    "errors": 0
  }
}
```

### POST /api/scrape-multiple

Scrape data dari multiple URLs dengan delay 1 detik antar request dan duplicate checking

**Request:**

```json
{
  "urls": [
    "https://idr.uin-antasari.ac.id",
    "https://idr.uin-antasari.ac.id/akademik",
    "https://idr.uin-antasari.ac.id/penelitian"
  ],
  "delay": 1000
}
```

**Response:**

```json
{
  "success": true,
  "urls": ["..."],
  "itemsFound": 50,
  "items": [...],
  "database": {
    "inserted": 45,
    "duplicates": 4,
    "errors": 1
  }
}
```

### GET /api/scraped-data

Mengambil semua data yang sudah di-scrape dari database

**Query Parameters:**

- `limit` (optional) - Jumlah maksimal data (default: 100)

**Response:**

```json
{
  "total": 50,
  "unique": 50,
  "latest": "2026-05-01T10:30:00Z",
  "data": [
    {
      "id": 1,
      "title": "Halaman",
      "link": "https://idr.uin-antasari.ac.id/page",
      "description": "Deskripsi",
      "content": "Konten...",
      "created_at": "2026-05-01T10:30:00Z",
      "updated_at": "2026-05-01T10:30:00Z"
    }
  ]
}
```

### GET /api/documents/:id

Mengambil document spesifik berdasarkan ID

**Response:**

```json
{
  "id": 1,
  "title": "Halaman",
  "link": "https://idr.uin-antasari.ac.id/page",
  "description": "Deskripsi",
  "content": "Konten lengkap...",
  "created_at": "2026-05-01T10:30:00Z",
  "updated_at": "2026-05-01T10:30:00Z"
}
```

### GET /api/statistics

Mengambil statistik database

**Response:**

```json
{
  "total": 50,
  "unique_links": 50,
  "latest_added": "2026-05-01T10:30:00Z"
}
```

## Database Schema

### Tabel: documents

Struktur tabel untuk menyimpan dokumen/halaman yang di-scrape

| Kolom       | Tipe                 | Deskripsi                                    |
| ----------- | -------------------- | -------------------------------------------- |
| id          | INTEGER PRIMARY KEY  | ID unik (auto-increment)                     |
| title       | TEXT NOT NULL        | Judul halaman                                |
| **link**    | TEXT NOT NULL UNIQUE | URL halaman (unique untuk mencegah duplikat) |
| description | TEXT                 | Deskripsi singkat halaman                    |
| content     | TEXT                 | Konten lengkap halaman                       |
| created_at  | DATETIME             | Waktu pembuatan record                       |
| updated_at  | DATETIME             | Waktu update terakhir                        |

**Index:**

- `idx_documents_link` - Index pada kolom `link` untuk mempercepat query pencarian

### Fitur Duplicate Detection

Setiap kali melakukan insert data:

- Cek apakah `link` sudah ada di database
- Jika sudah ada, skip insert dan catat sebagai "duplicate"
- Jika belum ada, insert data baru
- Return summary: inserted, duplicates, errors

## Database Module (database.js)

Modul utility untuk mengelola database dengan fungsi-fungsi:

### Fungsi Utama

```javascript
// Initialize database connection
initConnection();

// Inisialisasi tabel dan index
initDatabase(db);

// Insert sample data
insertSampleData(db);

// Insert satu document dengan duplicate checking
insertDocument(db, data); // data: { title, link, description, content }

// Insert multiple documents (batch) dengan duplicate checking
insertDocuments(db, documents); // Return: { inserted, duplicates, errors, details }

// Search documents
searchDocuments(db, query, limit);

// Get all documents
getAllDocuments(db, limit);

// Get document by ID
getDocumentById(db, id);

// Update document
updateDocument(db, id, data);

// Delete document
deleteDocument(db, id);

// Get statistics
getStatistics(db);

// Clear all documents
clearAllDocuments(db);
```

### Contoh Penggunaan

```javascript
const db_module = require("./database");

// Initialize
const db = db_module.initConnection();
await db_module.initDatabase(db);

// Insert satu document
const result = await db_module.insertDocument(db, {
  title: "Halaman Baru",
  link: "https://idr.uin-antasari.ac.id/new",
  description: "Deskripsi halaman",
  content: "Konten halaman...",
});

// Insert multiple dengan duplicate checking
const batchResult = await db_module.insertDocuments(db, [
  {
    title: "Page 1",
    link: "url1",
    description: "Desc 1",
    content: "Content 1",
  },
  {
    title: "Page 2",
    link: "url2",
    description: "Desc 2",
    content: "Content 2",
  },
]);
// batchResult: { inserted: 2, duplicates: 0, errors: 0, details: [...] }

// Search
const results = await db_module.searchDocuments(db, "informatika", 20);

// Get statistics
const stats = await db_module.getStatistics(db);
// stats: { total: 50, unique_links: 50, latest_added: '...' }
```

## Development

Untuk pengembangan lebih lanjut:

1. **Tambah data ke database** - edit sample data di `server.js`
2. **Styling** - modifikasi `public/css/style.css`
3. **Frontend logic** - edit `public/js/search.js`
4. **Backend** - edit `server.js`
5. **Scraper logic** - edit `scraper.js`

## Menggunakan Scraper

### Via API (dari server yang berjalan)

**Single URL:**

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://idr.uin-antasari.ac.id"}'
```

**Multiple URLs:**

```bash
curl -X POST http://localhost:3000/api/scrape-multiple \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://idr.uin-antasari.ac.id",
      "https://idr.uin-antasari.ac.id/page1"
    ],
    "delay": 1000
  }'
```

**Ambil data yang sudah di-scrape:**

```bash
curl http://localhost:3000/api/scraped-data
```

### Via CLI (Command Line)

Jalankan scraper langsung dari terminal:

```bash
# Scrape satu URL
node scraper-cli.js https://idr.uin-antasari.ac.id

# Scrape multiple URLs
node scraper-cli.js https://idr.uin-antasari.ac.id https://idr.uin-antasari.ac.id/page1 https://idr.uin-antasari.ac.id/page2
```

Hasil akan:

- Ditampilkan di console
- Disimpan ke file JSON (`scraped_data_<timestamp>.json`)
- Disimpan ke database

### Direct Import (dari code lain)

```javascript
const { scrapePage, scrapeMultiple } = require("./scraper");

// Scrape satu halaman
const results = await scrapePage("https://idr.uin-antasari.ac.id");
console.log(results);
// Output: Array of { title, link, description }

// Scrape multiple pages dengan delay
const allResults = await scrapeMultiple(
  ["https://idr.uin-antasari.ac.id", "https://idr.uin-antasari.ac.id/page1"],
  1000,
);
```

## Catatan

- Database otomatis membuat tabel dan sample data saat pertama kali dijalankan
- Search menggunakan SQLite LIKE query (simple search)
- Hasil dibatasi maksimal 20 items per pencarian
- UI responsive untuk mobile devices
- **Scraper Features:**
  - Menggunakan Axios untuk HTTP requests
  - Parse HTML dengan Cheerio
  - Delay 1 detik antar request (anti-blocking)
  - Automatic URL validation
  - Duplicate detection
  - Error handling lengkap
  - Max 150 chars untuk deskripsi, 100 chars untuk title

## License

ISC
