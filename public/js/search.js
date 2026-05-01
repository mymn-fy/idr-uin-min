// DOM Elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const noResultsDiv = document.getElementById('noResults');
const resultInfoDiv = document.getElementById('resultInfo');
const suggestionDiv = document.getElementById('suggestion');
const typeFilter = document.getElementById('typeFilter');
const sortFilter = document.getElementById('sortFilter');
const paginationDiv = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfoSpan = document.getElementById('pageInfo');
const syncBtn = document.getElementById('syncBtn');

// State Management
const state = {
  query: '',
  page: 1,
  sortBy: 'relevance',
  selectedType: 'all',
  results: [],
  total: 0,
  totalPages: 0,
  isLoading: false,
  error: null
};

let debounceTimer; // Menyimpan ID timer untuk fungsi debounce

// Event Listeners
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearTimeout(debounceTimer); // Hapus timer jika user menekan Enter
  
  const rawQuery = searchInput.value;
  state.query = rawQuery.replace(/<[^>]*>?/gm, '').trim();
  state.page = 1;
  
  search();
});

searchInput.addEventListener('input', () => {
  const rawQuery = searchInput.value;
  state.query = rawQuery.replace(/<[^>]*>?/gm, '').trim();
  
  // Debounce 300ms
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.page = 1;
    search();
  }, 300);
});

// Tambahkan event listener untuk filter tipe
if (typeFilter) {
  typeFilter.addEventListener('change', () => {
    state.selectedType = typeFilter.value;
    state.page = 1;
    search();
  });
}

// Tambahkan event listener untuk filter urutan
if (sortFilter) {
  sortFilter.addEventListener('change', () => {
    state.sortBy = sortFilter.value;
    state.page = 1;
    search(); // Langsung cari jika sorting berubah
  });
}

// Handle clicks on result items using event delegation
resultsDiv.addEventListener('click', (e) => {
  const resultItem = e.target.closest('.result-item[data-link]');
  if (resultItem) {
    window.open(resultItem.dataset.link, '_blank');
  }
});

// Event listeners untuk pagination
if (prevPageBtn) {
  prevPageBtn.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      search();
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener('click', () => {
    if (state.page < state.totalPages) {
      state.page++;
      search();
    }
  });
}

// Perform search
async function search() {
  // Scroll to the top of the results for better UX on pagination
  resultsDiv.scrollIntoView({ behavior: 'smooth' });

  state.isLoading = true;
  state.error = null;
  renderAll(); // Menampilkan skeleton/loading

  try {
    const response = await fetch(`/search?q=${encodeURIComponent(state.query)}&type=${encodeURIComponent(state.selectedType)}&page=${state.page}&sort=${state.sortBy}`);
    
    if (!response.ok) {
      throw new Error('Error fetching search results');
    }

    const data = await response.json();
    
    // Update state dengan data hasil response
    state.results = data.results || [];
    state.total = data.total || 0;
    state.totalPages = data.totalPages || 0;
  } catch (error) {
    console.error('Search error:', error);
    state.error = 'Terjadi kesalahan saat mencari. Coba lagi.';
    state.results = [];
    state.total = 0;
    state.totalPages = 0;
  } finally {
    state.isLoading = false;
    renderAll(); // Menampilkan hasil atau error
  }
}

// Orchestrator Rendering
function renderAll() {
  renderResults();
  renderPagination();
}

// Render hasil search ke DOM
function renderResults() {
  resultsDiv.innerHTML = '';
  suggestionDiv.textContent = '';

  if (state.isLoading) {
    loadingDiv.style.display = 'block';
    noResultsDiv.style.display = 'none';
    resultInfoDiv.style.display = 'none';
    return;
  }
  
  loadingDiv.style.display = 'none';

  // Handle Error State
  if (state.error) {
    noResultsDiv.style.display = 'none';
    resultInfoDiv.textContent = state.error;
    resultInfoDiv.style.display = 'block';
    return;
  }

  // Handle Empty Results State
  if (state.results.length === 0) {
    noResultsDiv.style.display = 'block';
    resultInfoDiv.textContent = state.query ? `Tidak ada hasil untuk "${state.query}"` : 'Tidak ada hasil yang ditemukan.';
    resultInfoDiv.style.display = 'block';
    return;
  }

  // Handle Success State
  noResultsDiv.style.display = 'none';
  resultInfoDiv.textContent = state.query ? `Ditemukan ${state.total} hasil untuk "${state.query}"` : `Menampilkan ${state.total} dokumen`;
  resultInfoDiv.style.display = 'block';

  state.results.forEach((result) => {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    resultItem.dataset.link = result.link;
    
    const typeBadge = result.type ? `<span class="result-category">${escapeHtml(result.type)}</span>` : '';
    
    const highlightedDescription = result.description ? highlightQuery(result.description, state.query) : '';
    const highlightedContent = result.content ? highlightQuery(result.content, state.query) : '';
    
    // Format meta info (Author & Year)
    const metaTags = [];
    if (result.author) metaTags.push(`<span class="result-author">👤 ${escapeHtml(result.author)}</span>`);
    if (result.year) metaTags.push(`<span class="result-year">📅 ${escapeHtml(result.year)}</span>`);
    const metaHtml = metaTags.length > 0 ? `<div class="result-meta">${metaTags.join(' &nbsp;|&nbsp; ')}</div>` : '';

    resultItem.innerHTML = `
      <div class="result-title">${escapeHtml(result.title)}</div>
      <div class="result-url">${escapeHtml(result.link)}</div>
      ${typeBadge}
      ${metaHtml}
      ${highlightedDescription ? `<div class="result-description">${highlightedDescription}</div>` : ''}
      ${highlightedContent ? `<div class="result-content">${highlightedContent}</div>` : ''}
    `;
    
    resultsDiv.appendChild(resultItem);
  });
}

// Render Pagination ke DOM
function renderPagination() {
  if (!paginationDiv) return;
  
  // Sembunyikan jika tidak ada cukup halaman atau sedang loading
  if (state.totalPages <= 1 || state.isLoading || state.results.length === 0) {
    paginationDiv.style.display = 'none';
    return;
  }
  
  paginationDiv.style.display = 'flex';
  
  if (pageInfoSpan) {
    pageInfoSpan.textContent = `Halaman ${state.page} dari ${state.totalPages}`;
  }
  
  if (prevPageBtn) {
    prevPageBtn.disabled = state.page <= 1;
  }
  
  if (nextPageBtn) {
    nextPageBtn.disabled = state.page >= state.totalPages;
  }
}

// Highlight search query in content
function highlightQuery(content, query) {
  if (!query) return escapeHtml(content);
  
  const regex = new RegExp(`(${query})`, 'gi');
  const highlighted = escapeHtml(content).replace(
    regex,
    '<mark style="background-color: #ffeb3b; font-weight: bold;">$1</mark>'
  );
  
  return highlighted;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// Focus search input on page load
window.addEventListener('load', () => {
  searchInput.focus();
  suggestionDiv.textContent = 'Ketik kata kunci untuk memulai pencarian...';
});

// Fitur Sinkronisasi Manual (Manual Trigger Vercel Cron)
if (syncBtn) {
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    const originalText = syncBtn.textContent;
    syncBtn.textContent = '⏳ Sedang menarik data...';
    
    try {
      const response = await fetch('/api/cron/crawl');
      const data = await response.json();
      if (data.success) {
        alert(`✅ Selesai! ${data.database.inserted} data baru/diupgrade, dan ${data.database.duplicates} data duplikat dilewati.`);
        search(); // Muat ulang hasil pencarian jika ada
      } else {
        alert('❌ Gagal menarik data.');
      }
    } catch (e) {
      alert('❌ Terjadi kesalahan koneksi.');
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = originalText;
    }
  });
}
