// ========================================
// DOM Elements
// ========================================
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const noResultsDiv = document.getElementById('noResults');
const resultInfoDiv = document.getElementById('resultInfo');
const sortFilter = document.getElementById('sortFilter');
const paginationDiv = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageNumbersDiv = document.getElementById('pageNumbers');
const syncBtn = document.getElementById('syncBtn');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const toastContainer = document.getElementById('toastContainer');
const navItems = document.querySelectorAll('.nav-item');
const filterBtn = document.getElementById('filterBtn');
const filterDropdown = document.getElementById('filterDropdown');
const filterDropdownOverlay = document.getElementById('filterDropdownOverlay');

// Stats elements
const statTotal = document.getElementById('statTotal');
const statLatest = document.getElementById('statLatest');
const statStatus = document.getElementById('statStatus');

// ========================================
// State Management
// ========================================
const state = {
  query: '',
  page: 1,
  sortBy: 'newest',
  selectedType: 'Skripsi',
  results: [],
  total: 0,
  totalPages: 0,
  isLoading: false,
  error: null
};

let debounceTimer;

// ========================================
// Theme Management
// ========================================
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

// ========================================
// Sidebar Management
// ========================================
function toggleSidebar() {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
  } else {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
  }
}

// GANTI DENGAN INI ↓↓↓
// ========================================
// Sidebar Mode Management
// ========================================

const controlMenuBtn = document.getElementById('controlMenuBtn');
const controlMenuPanel = document.getElementById('controlMenuPanel');
const sidebarModeInputs = document.querySelectorAll('input[name="sidebarMode"]');

// Toggle control panel
controlMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  controlMenuPanel.classList.toggle('open');
});

// Close panel when clicking outside
document.addEventListener('click', (e) => {
  if (!controlMenuPanel.contains(e.target) && e.target !== controlMenuBtn) {
    controlMenuPanel.classList.remove('open');
  }
});

// Apply sidebar mode
function setSidebarMode(mode) {
  sidebarModeInputs.forEach(input => {
    input.checked = input.value === mode;
  });
  
  sidebar.classList.remove('expand-hover');
  
  if (mode === 'expanded') {
    sidebar.classList.remove('collapsed');
    localStorage.setItem('sidebarMode', 'expanded');
    localStorage.setItem('sidebarCollapsed', 'false');
  } 
  else if (mode === 'collapsed') {
    sidebar.classList.add('collapsed');
    sidebar.classList.remove('expand-hover');
    localStorage.setItem('sidebarMode', 'collapsed');
    localStorage.setItem('sidebarCollapsed', 'true');
  } 
  else if (mode === 'expandOnHover') {
    sidebar.classList.add('collapsed');
    sidebar.classList.add('expand-hover');
    localStorage.setItem('sidebarMode', 'expandOnHover');
    localStorage.setItem('sidebarCollapsed', 'true');
  }
}

sidebarModeInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (input.checked) setSidebarMode(input.value);
  });
});

function initSidebarMode() {
  const savedMode = localStorage.getItem('sidebarMode') || 'expanded';
  setSidebarMode(savedMode);
}

function closeMobileSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ========================================
// Toast Notifications
// ========================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info'
  };

  toast.innerHTML = `
    <span class="material-symbols-rounded toast-icon">${icons[type]}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <div class="toast-progress"></div>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// ========================================
// Statistics
// ========================================
async function loadStatistics() {
  try {
    const response = await fetch('/api/statistics');
    if (!response.ok) return;

    const data = await response.json();

    if (typeof data.total === 'number') {
      statTotal.textContent = formatNumber(data.total);
    }

    if (data.latest_added) {
      statLatest.textContent = formatRelativeTime(data.latest_added);
    }

    statStatus.textContent = 'Online';
    statStatus.style.color = '#10b981';
  } catch (e) {
    statStatus.textContent = 'Offline';
    statStatus.style.color = '#ef4444';
  }
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return Math.floor(diff / 60) + ' menit lalu';
  if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu';
  if (diff < 604800) return Math.floor(diff / 86400) + ' hari lalu';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// ========================================
// Event Listeners
// ========================================
searchInput.addEventListener('input', () => {
  const rawQuery = searchInput.value;
  state.query = rawQuery.replace(/<[^>]*>?/gm, '').trim();

  clearSearchBtn.classList.toggle('visible', searchInput.value.length > 0);

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.page = 1;
    search();
  }, 350);
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  state.query = '';
  clearSearchBtn.classList.remove('visible');
  state.page = 1;
  search();
  searchInput.focus();
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchInput.value) {
    clearSearchBtn.click();
  }
});

// Sidebar nav items
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    state.selectedType = item.dataset.type;
    state.page = 1;
    search();

    if (window.innerWidth <= 768) {
      closeMobileSidebar();
    }
  });
});

// ========================================
// Custom Dropdown Sort Filter
// ========================================

const sortFilterTrigger = document.getElementById('sortFilterTrigger');
const sortFilterDropdown = document.getElementById('sortFilterDropdown');
const sortFilterOptions = document.querySelectorAll('.custom-select-option');
const sortFilterValue = sortFilterTrigger.querySelector('.custom-select-value');

function toggleSortDropdown(e) {
  e.stopPropagation();
  const isOpen = sortFilterDropdown.classList.contains('open');
  
  // Close all other dropdowns first
  document.querySelectorAll('.custom-select-dropdown.open').forEach(d => {
    if (d !== sortFilterDropdown) d.classList.remove('open');
  });
  document.querySelectorAll('.custom-select-trigger.open').forEach(t => {
    if (t !== sortFilterTrigger) t.classList.remove('open');
  });
  
  sortFilterDropdown.classList.toggle('open', !isOpen);
  sortFilterTrigger.classList.toggle('open', !isOpen);
}

function closeSortDropdown() {
  sortFilterDropdown.classList.remove('open');
  sortFilterTrigger.classList.remove('open');
}

sortFilterTrigger.addEventListener('click', toggleSortDropdown);

sortFilterOptions.forEach(option => {
  option.addEventListener('click', () => {
    const value = option.dataset.value;
    const label = option.querySelector('span:last-child').textContent;
    
    // Update state
    state.sortBy = value;
    state.page = 1;
    
    // Update UI
    sortFilterValue.textContent = label;
    sortFilterOptions.forEach(o => o.classList.remove('active'));
    option.classList.add('active');
    
    closeSortDropdown();
    search();
  });
});

// Close when clicking outside
document.addEventListener('click', (e) => {
  if (!sortFilterTrigger.contains(e.target) && !sortFilterDropdown.contains(e.target)) {
    closeSortDropdown();
  }
  if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
    closeFilterDropdown();
  }
  if (!controlMenuBtn.contains(e.target) && !controlMenuPanel.contains(e.target)) {
    controlMenuPanel.classList.remove('open');
  }
});

prevPageBtn.addEventListener('click', () => {
  if (state.page > 1) {
    state.page--;
    search();
  }
});

nextPageBtn.addEventListener('click', () => {
  if (state.page < state.totalPages) {
    state.page++;
    search();
  }
});

sidebarToggle.addEventListener('click', () => {
  const isCollapsed = sidebar.classList.contains('collapsed');
  
  if (isCollapsed) {
    // Dari collapsed → expanded
    setSidebarMode('expanded');
  } else {
    // Dari expanded → collapsed
    setSidebarMode('collapsed');
  }
});
mobileMenuBtn.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', closeMobileSidebar);
themeToggle.addEventListener('click', toggleTheme);

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    closeMobileSidebar();
  }
});

// Sync button
syncBtn.addEventListener('click', async () => {
  syncBtn.disabled = true;
  syncBtn.classList.add('spinning');
  const textSpan = syncBtn.querySelector('.nav-text');
  const originalText = textSpan ? textSpan.textContent : 'Sinkronisasi Data';
  if (textSpan) textSpan.textContent = 'Menarik data...';

  try {
    const response = await fetch('/api/cron/crawl');
    const data = await response.json();

    if (data.success) {
      const inserted = data.database?.inserted || 0;
      const duplicates = data.database?.duplicates || 0;
      showToast(`Selesai! ${inserted} data baru, ${duplicates} duplikat dilewati.`, 'success');
      await loadStatistics();
      search();
    } else {
      showToast('Gagal menarik data.', 'error');
    }
  } catch (e) {
    showToast('Terjadi kesalahan koneksi.', 'error');
  } finally {
    syncBtn.disabled = false;
    syncBtn.classList.remove('spinning');
    if (textSpan) textSpan.textContent = originalText;
  }
});

// ========================================
// Search
// ========================================
async function search() {
  state.isLoading = true;
  state.error = null;
  renderAll();

  try {
    const response = await fetch(
      `/search?q=${encodeURIComponent(state.query)}&type=${encodeURIComponent(state.selectedType)}&page=${state.page}&sort=${state.sortBy}`
    );

    if (!response.ok) {
      throw new Error('Error fetching search results');
    }

    const data = await response.json();
    state.results = data.results || [];
    state.total = data.total || 0;
    state.totalPages = data.totalPages || 0;
  } catch (error) {
    console.error('Search error:', error);
    state.error = 'Terjadi kesalahan saat mencari. Silakan coba lagi.';
    state.results = [];
    state.total = 0;
    state.totalPages = 0;
    showToast(state.error, 'error');
  } finally {
    state.isLoading = false;
    renderAll();
  }
}

// ========================================
// Rendering
// ========================================
function renderAll() {
  renderResults();
  renderPagination();
}

function renderResults() {
  resultsDiv.innerHTML = '';

  if (state.isLoading) {
    loadingDiv.style.display = 'block';
    noResultsDiv.style.display = 'none';
    resultInfoDiv.textContent = '';
    paginationDiv.style.display = 'none';
    return;
  }

  loadingDiv.style.display = 'none';

  if (state.error) {
    noResultsDiv.style.display = 'none';
    resultInfoDiv.textContent = state.error;
    resultInfoDiv.style.color = '#ef4444';
    paginationDiv.style.display = 'none';
    return;
  }

  if (state.results.length === 0) {
    noResultsDiv.style.display = 'flex';
    resultInfoDiv.textContent = '';
    paginationDiv.style.display = 'none';
    return;
  }

  noResultsDiv.style.display = 'none';
  resultInfoDiv.style.color = 'var(--text-secondary)';

  if (state.query) {
    resultInfoDiv.innerHTML = `Ditemukan <strong>${state.total}</strong> hasil untuk "<strong>${escapeHtml(state.query)}</strong>"`;
  } else if (state.selectedType !== 'all') {
    resultInfoDiv.innerHTML = `Menampilkan <strong>${state.total}</strong> dokumen <strong>${escapeHtml(state.selectedType)}</strong>`;
  } else {
    resultInfoDiv.innerHTML = `Menampilkan <strong>${state.total}</strong> dokumen`;
  }

  state.results.forEach((result) => {
    const card = document.createElement('a');
    card.className = 'result-card';
    card.href = result.link;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.dataset.link = result.link;

    const typeKey = getTypeKey(result.type);
    const badgeClass = `result-badge--${typeKey}`;
    const typeColor = getTypeColor(result.type);

    const metaItems = [];
    if (result.author) {
      metaItems.push(`<span class="result-meta-item"><span class="material-symbols-rounded">person</span> ${escapeHtml(formatAuthorNames(result.author))}</span>`);
    }
    if (result.year) {
      metaItems.push(`<span class="result-meta-item"><span class="material-symbols-rounded">calendar_today</span> ${escapeHtml(result.year)}</span>`);
    }
    const metaHtml = metaItems.length ? `<div class="result-meta">${metaItems.join('')}</div>` : '';

    const descHtml = result.description 
      ? `<div class="result-description">${wrapArabic(highlightQuery(result.description, state.query))}</div>` 
      : '';
    const contentHtml = result.content 
      ? `<div class="result-content">${wrapArabic(highlightQuery(result.content, state.query))}</div>` 
      : '';

    card.style.setProperty('--type-color', typeColor);

    card.innerHTML = `
      <div class="result-header">
        <h3 class="result-title">${wrapArabic(escapeHtml(toTitleCase(result.title)))}</h3>
        ${result.type ? `<span class="result-badge ${badgeClass}">${escapeHtml(result.type)}</span>` : ''}
      </div>
      <div class="result-url">${escapeHtml(result.link)}</div>
      ${metaHtml}
      ${descHtml}
      ${contentHtml}
    `;

    resultsDiv.appendChild(card);
  });
}

function renderPagination() {
  if (state.totalPages <= 1 || state.isLoading || state.results.length === 0) {
    paginationDiv.style.display = 'none';
    return;
  }

  paginationDiv.style.display = 'flex';
  prevPageBtn.disabled = state.page <= 1;
  nextPageBtn.disabled = state.page >= state.totalPages;

  pageNumbersDiv.innerHTML = '';
  const pages = getPageNumbers(state.page, state.totalPages);

  pages.forEach(p => {
    if (p === '...') {
      const span = document.createElement('span');
      span.className = 'page-number ellipsis';
      span.textContent = '...';
      pageNumbersDiv.appendChild(span);
    } else {
      const btn = document.createElement('button');
      btn.className = `page-number ${p === state.page ? 'active' : ''}`;
      btn.textContent = p;
      btn.addEventListener('click', () => {
        state.page = p;
        search();
      });
      pageNumbersDiv.appendChild(btn);
    }
  });
}

function getPageNumbers(current, total) {
  const pages = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);

    if (current > 3) pages.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (current < total - 2) pages.push('...');

    if (!pages.includes(total)) pages.push(total);
  }

  return pages;
}

// ========================================
// Helpers
// ========================================
function getTypeKey(type) {
  if (!type) return 'lainnya';
  const map = {
    'Artikel': 'artikel',
    'Monografi': 'monografi',
    'Buku': 'buku',
    'Book': 'buku',
    'Laporan Penelitian': 'laporan',
    'Konferensi': 'konferensi',
    'Skripsi': 'skripsi',
    'Tesis': 'tesis',
    'Disertasi': 'disertasi'
  };
  return map[type] || 'lainnya';
}

function getTypeColor(type) {
  const map = {
    'Artikel': '#10b981',
    'Monografi': '#f59e0b',
    'Buku': '#8b5cf6',
    'Book': '#8b5cf6',
    'Laporan Penelitian': '#3b82f6',
    'Konferensi': '#8b5cf6',
    'Skripsi': '#06b6d4',
    'Tesis': '#ec4899',
    'Disertasi': '#ef4444',
    'Lainnya': '#6b7280'
  };
  return map[type] || '#6366f1';
}

function highlightQuery(content, query) {
  if (!query || !content) return escapeHtml(content || '');

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return escapeHtml(content).replace(regex, '<mark>$1</mark>');
}

function wrapArabic(text) {
  if (!text) return '';
  // Regex menangkap huruf Arab dan spasi di antaranya 
  // Tidak menangkap tag HTML sehingga aman digabungkan dengan highlight
  const arabicRegex = /([\u0600-\u06FF\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[\s]+[\u0600-\u06FF\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g;
  return text.replace(arabicRegex, '<span class="arabic-text" dir="rtl">$1</span>');
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

function formatAuthorNames(authorStr) {
  if (!authorStr) return '';
  
  // 1. Perbaiki nama yang tergabung/fused akibat bug spasi HTML scraper lawas
  // Contoh: "MasdariWardani" dipisahkan menjadi "Masdari; Wardani"
  let fixedStr = authorStr.replace(/([a-z])([A-Z])/g, '$1; $2');
  
  // 2. Pisahkan berdasarkan pemisah yang umum (titik koma, kata "and", atau "&")
  let authors = fixedStr.split(/\s*;\s*|\s+and\s+|\s*&\s*/i);
  
  let formattedAuthors = authors.map(author => {
    author = author.trim();
    // 3. Jika formatnya "Nama Belakang, Nama Depan", kita balik posisinya
    if (author.includes(',')) {
      let parts = author.split(',');
      if (parts.length >= 2) {
        const lastName = parts[0].trim();
        const firstName = parts.slice(1).join(',').trim();
        if (!firstName) return toTitleCase(lastName);
        return `${toTitleCase(firstName)} ${toTitleCase(lastName)}`.trim();
      }
    }
    return toTitleCase(author);
  });
  
  return formattedAuthors.filter(a => a).join(', ');
}

function toTitleCase(str) {
  if (!str) return '';

  // 1. Daftar singkatan yang harus tetap HURUF BESAR (Acronyms)
  const acronyms = [
    'UPT', 'UIN', 'IAIN', 'IDR', 'PTIPD', 'LPM', 'LP2M', 'NIDN', 'NIP', 
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
    'ST', 'SI', 'TI', 'KKN', 'PPL', 'SK', 'UU', 'KUA', 'DIY', 'KTP',
    'SD', 'SMP', 'SMA', 'SMK', 'SMAK', 'TK', 'PAUD', 'MI', 'MTS', 'MTSN', 'MA', 'SDN', 'SMPN', 'SMAN', 'SMKN', 'MAN', 'MIN',
    'ITB', 'UGM', 'UI', 'UNAIR', 'UNPADM', 'UNSYIAH', 'UNDIP', 'IPB',
    'PhD', 'M.A.', 'M.SI', 'M.ENG', 'DR', 'PROF', 'ASSOC',
    'ISSN', 'ISBN', 'DOI', 'URL', 'API', 'PHP', 'HTML', 'CSS', 'SQL',
    'PDF', 'JPG', 'PNG', 'MP4', 'MOV', 'ZIP', 'RAR', 'XML', 'JSON'
  ];

  // 2. Daftar kata hubung yang harus tetap huruf kecil (kecuali di awal kalimat)
  const minorWords = [
    'di', 'ke', 'dari', 'pada', 'dalam', 'dan', 'yang', 'untuk', 
    'dengan', 'terhadap', 'sebagai', 'oleh', 'a', 'an', 'the', 'of', 'in',
    'by', 'about', 'after', 'before', 'at', 'as', 'or', 'but', 'is', 'on'
  ];

  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Hilangkan tanda baca untuk pengecekan singkatan (misal "UIN," menjadi "UIN")
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toUpperCase();

      // Jika kata ada di daftar singkatan, kembalikan versi huruf besar semua
      if (acronyms.includes(cleanWord)) {
        return word.toUpperCase();
      }
      
      // Jika kata ada di daftar minorWords dan bukan kata pertama, biarkan kecil
      if (index > 0 && minorWords.includes(word)) {
        return word;
      }

      // Standar Title Case: Huruf pertama kapital, sisanya kecil
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// ========================================
// Category Counts
// ========================================

// ========================================
// Global Click Handler
// ========================================

document.addEventListener('click', (e) => {
  // Close sort dropdown
  if (!sortFilterTrigger.contains(e.target) && !sortFilterDropdown.contains(e.target)) {
    closeSortDropdown();
  }
  
  // Close filter dropdown
  if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
    closeFilterDropdown();
  }
  
  // Close control menu
  if (!controlMenuBtn.contains(e.target) && !controlMenuPanel.contains(e.target)) {
    controlMenuPanel.classList.remove('open');
  }
});

// ========================================
// Initialization
// ========================================

function initSortDisplay() {
  const sortFilterValue = document.querySelector('.custom-select-value');
  if (sortFilterValue && state.sortBy === 'newest') {
    sortFilterValue.textContent = 'Paling Baru';
  }
}

function handleMobileDropdown() {
  const isMobile = window.innerWidth <= 768;
  const headerLeft = document.querySelector('.header-left');
  
  if (isMobile) {
    if (filterDropdown && filterDropdown.parentNode !== document.body) {
      document.body.appendChild(filterDropdown);
    }
  } else {
    if (filterDropdown && headerLeft && filterDropdown.parentNode !== headerLeft) {
      headerLeft.appendChild(filterDropdown);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebarMode();
  initSortDisplay();
  handleMobileDropdown();
  loadStatistics();
  if (window.innerWidth > 768) {
    searchInput.focus();
  }
  search();
});

window.addEventListener('resize', () => {
  handleMobileDropdown();
});

// ========================================
// Filter Dropdown
// ========================================

const filterOptions = document.querySelectorAll('.filter-option');
let filterDebounceTimer;
let touchStartY = 0;
let touchEndY = 0;

function toggleFilterDropdown(e) {
  e.stopPropagation();
  const isOpen = filterDropdown.classList.contains('open');
  
  closeSortDropdown();
  controlMenuPanel.classList.remove('open');
  
  filterDropdown.classList.toggle('open', !isOpen);
  filterBtn.classList.toggle('active', !isOpen);
  
  if (filterDropdownOverlay) {
    filterDropdownOverlay.classList.toggle('active', !isOpen);
  }
  
  if (window.innerWidth <= 768) {
    document.body.style.overflow = !isOpen ? 'hidden' : '';
  }
}

function closeFilterDropdown() {
  filterDropdown.classList.remove('open');
  filterBtn.classList.remove('active');
  filterDropdown.style.transform = '';
  
  if (filterDropdownOverlay) {
    filterDropdownOverlay.classList.remove('active');
  }
  
  document.body.style.overflow = '';
}

// Swipe down gesture detection untuk mobile
if (filterDropdown) {
  filterDropdown.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchEndY = touchStartY;
    filterDropdown.style.transition = 'none';
  }, { passive: true });
  
  filterDropdown.addEventListener('touchmove', (e) => {
    touchEndY = e.touches[0].clientY;
    const swipeDistance = touchEndY - touchStartY;
    if (swipeDistance > 0 && filterDropdown.scrollTop <= 0) {
      filterDropdown.style.transform = `translateY(${swipeDistance}px)`;
      if(e.cancelable) e.preventDefault();
    }
  }, { passive: false });
  
  filterDropdown.addEventListener('touchend', () => {
    filterDropdown.style.transition = '';
    const swipeDistance = touchEndY - touchStartY;
    // Jika swipe down lebih dari 50px dan user tidak sedang scroll, tutup dropdown
    if (swipeDistance > 80 && filterDropdown.scrollTop <= 0) {
      closeFilterDropdown();
    } else {
      filterDropdown.style.transform = '';
    }
  }, { passive: true });
}

filterBtn.addEventListener('click', toggleFilterDropdown);

if (filterDropdownOverlay) {
  filterDropdownOverlay.addEventListener('click', closeFilterDropdown);
}

filterOptions.forEach(option => {
  option.addEventListener('click', () => {
    const type = option.dataset.type;
    
    filterOptions.forEach(o => o.classList.remove('active'));
    option.classList.add('active');
    
    navItems.forEach(n => {
      n.classList.toggle('active', n.dataset.type === type);
    });
    
    state.selectedType = type;
    state.page = 1;
    closeFilterDropdown();

    // Debounce filter option click
    clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(() => {
      search();
    }, 300);
  });
});