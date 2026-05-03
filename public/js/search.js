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
// Modal Management
// ========================================
const documentModal = document.createElement('div');
documentModal.className = 'document-modal';
documentModal.innerHTML = `
  <div class="document-modal-overlay"></div>
  <div class="document-modal-container">
    <div class="modal-top-bar">
      <div class="modal-badge-container"></div>
      <button class="document-modal-close" aria-label="Tutup"><span class="material-symbols-rounded">close</span></button>
    </div>
    <div class="document-modal-body"></div>
    <div class="modal-sticky-footer">
      <a href="#" target="_blank" rel="noopener noreferrer" class="modal-action-btn">
        <span class="material-symbols-rounded">open_in_new</span> Buka Dokumen Asli
      </a>
    </div>
  </div>
`;
document.body.appendChild(documentModal);

const modalOverlay = documentModal.querySelector('.document-modal-overlay');
const modalCloseBtn = documentModal.querySelector('.document-modal-close');
const modalBody = documentModal.querySelector('.document-modal-body');
const modalBadgeContainer = documentModal.querySelector('.modal-badge-container');
const modalActionBtn = documentModal.querySelector('.modal-action-btn');
const modalContainer = documentModal.querySelector('.document-modal-container');

function closeDocumentModal() {
  documentModal.classList.remove('active');
  document.body.style.overflow = '';
}

modalOverlay.addEventListener('click', closeDocumentModal);
modalCloseBtn.addEventListener('click', closeDocumentModal);

function showDocumentModal(result) {
  const typeKey = getTypeKey(result.type);
  const badgeClass = `result-badge--${typeKey}`;
  const typeColor = getTypeColor(result.type);
  
  modalContainer.style.setProperty('--type-color', typeColor);
  modalBadgeContainer.innerHTML = result.type ? `<span class="result-badge ${badgeClass}">${escapeHtml(result.type)}</span>` : '';
  modalActionBtn.href = escapeHtml(result.link);
  
  const cleanTitle = fixTypos(result.title);

  let arabicTitle = '';
  let latinTitle = cleanTitle;

  if (cleanTitle.includes('=')) {
    const parts = cleanTitle.split('=').map(p => p.trim()).filter(p => p.length > 0);
    const arabicParts = parts.filter(p => getTextDirection(p) === 'rtl');
    const latinParts = parts.filter(p => getTextDirection(p) === 'ltr');
    
    arabicTitle = arabicParts.join(' = ');
    latinTitle = latinParts.join(' = ');
  } else {
    if (getTextDirection(cleanTitle) === 'rtl') {
      arabicTitle = cleanTitle;
      latinTitle = '';
    } else {
      arabicTitle = '';
      latinTitle = cleanTitle;
    }
  }

  const metaItems = [];
  if (result.author) {
    metaItems.push(`
        <div class="modal-chip">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>${escapeHtml(formatAuthorNames(result.author))}</span>
        </div>
      `);
  }
  if (result.year) {
    metaItems.push(`
      <div class="modal-chip">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>${escapeHtml(result.year)}</span>
      </div>
    `);
  }
  const metaHtml = metaItems.length ? `<div class="modal-meta-chips">${metaItems.join('')}</div>` : '';

  let arabicHtml = '';
  if (arabicTitle) {
    arabicHtml = `
          <div class="modal-arabic-wrapper">
            <span class="ar-badge">AR</span>
            <div class="modal-arabic-title" dir="rtl">${wrapArabic(escapeHtml(toTitleCase(arabicTitle)))}</div>
          </div>
        `;
  }
  
  let latinHtml = '';
  if (latinTitle) {
    latinHtml = `
      <div class="modal-latin-title">${escapeHtml(toTitleCase(latinTitle))}</div>
    `;
  }

  let separatorHtml = (arabicHtml && latinHtml) ? `<div class="modal-title-separator"></div>` : '';

  modalBody.innerHTML = `
    <div class="modal-label">JUDUL</div>
    ${arabicHtml}
    ${separatorHtml}
    ${latinHtml}
    ${metaHtml}
  `;

  documentModal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Kunci scroll di halaman utama
}

// ========================================
// State Management
// ========================================
const state = {
  query: '',
  page: 1,
  totalPages: 1,
  total: 0,
  results: [],
  isLoading: false,
  error: null,
  sortBy: 'newest',
  selectedType: 'all'
};

let debounceTimer;

// ========================================
// Theme & Font Management
function initFontMode() {
  const savedFont = localStorage.getItem('arabicFont') || 'amiri';
  if (savedFont === 'aref') {
    document.body.classList.add('font-aref');
  } else {
    document.body.classList.remove('font-aref');
  }
}

function toggleFontMode() {
  const isAref = document.body.classList.contains('font-aref');
  if (isAref) {
    document.body.classList.remove('font-aref');
    localStorage.setItem('arabicFont', 'amiri');
    showToast('Font Arab diubah ke Amiri', 'info');
  } else {
    document.body.classList.add('font-aref');
    localStorage.setItem('arabicFont', 'aref');
    showToast('Font Arab diubah ke Aref Ruqaa', 'info');
  }
}

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
    const card = document.createElement('div');
    card.className = 'result-card';
    card.dataset.link = result.link;

    const typeKey = getTypeKey(result.type);
    const badgeClass = `result-badge--${typeKey}`;
    const typeColor = getTypeColor(result.type);

    // Perbaiki typo/kesalahan ketik dari data sumber asli sebelum di-render
    const cleanTitle = fixTypos(result.title);
    const cleanDesc = fixTypos(result.description);
    const cleanContent = fixTypos(result.content);

    const metaItems = [];
    if (result.author) {
      metaItems.push(`<span class="result-meta-item"><span class="material-symbols-rounded">person</span> ${escapeHtml(formatAuthorNames(result.author))}</span>`);
    }
    if (result.year) {
      metaItems.push(`<span class="result-meta-item"><span class="material-symbols-rounded">calendar_today</span> ${escapeHtml(result.year)}</span>`);
    }
    const metaHtml = metaItems.length ? `<div class="result-meta">${metaItems.join('')}</div>` : '';

    const descDir = getTextDirection(cleanDesc);
    const descHtml = cleanDesc 
      ? `<div class="result-description" dir="${descDir}">${wrapArabic(highlightQuery(cleanDesc, state.query))}</div>` 
      : '';
      
    const contentDir = getTextDirection(cleanContent);
    const contentHtml = cleanContent 
      ? `<div class="result-content" dir="${contentDir}">${wrapArabic(highlightQuery(cleanContent, state.query))}</div>` 
      : '';

    card.style.setProperty('--type-color', typeColor);

    card.innerHTML = `
      <div class="result-header">
        <h3 class="result-title">${formatTitle(cleanTitle)}</h3>
        ${result.type ? `<span class="result-badge ${badgeClass}">${escapeHtml(result.type)}</span>` : ''}
      </div>
      <a href="${escapeHtml(result.link)}" target="_blank" rel="noopener noreferrer" class="result-url">${escapeHtml(result.link)}</a>
      ${metaHtml}
      ${descHtml}
      ${contentHtml}
    `;

    // Tambahkan event listener untuk memunculkan modal jika kartu diklik
    card.addEventListener('click', (e) => {
      // Tapi jangan munculkan modal jika user mengklik bagian link (URL) langsung
      if (!e.target.closest('.result-url')) {
        showDocumentModal(result);
      }
    });

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

  const totalEllipsis = pages.filter(p => p === '...').length;
  let ellipsisCount = 0;

  pages.forEach(p => {
    if (p === '...') {
      ellipsisCount++;
      
      // Jika ada 2 tanda '...', jadikan yang pertama sebagai teks titik biasa,
      // dan yang terakhir (atau satu-satunya) sebagai kotak input "Ke.."
      if (totalEllipsis > 1 && ellipsisCount === 1) {
        const span = document.createElement('span');
        span.className = 'page-number ellipsis';
        span.textContent = '...';
        pageNumbersDiv.appendChild(span);
        return; // Lanjut ke perulangan berikutnya
      }

      // Ganti titik tiga (...) dengan kotak input "Ke.."
      const jumpWrapper = document.createElement('div');
      jumpWrapper.className = 'page-jump-wrapper';

      const jumpInput = document.createElement('input');
      jumpInput.type = 'number';
      jumpInput.className = 'page-input';
      jumpInput.min = 1;
      jumpInput.max = state.totalPages;
      jumpInput.placeholder = 'Ke..';
      jumpInput.title = `Lompat ke halaman (1 - ${state.totalPages})`;

      jumpInput.addEventListener('change', () => {
        let val = parseInt(jumpInput.value, 10);
        if (!isNaN(val) && val >= 1 && val <= state.totalPages && val !== state.page) {
          state.page = val;
          search();
        } else if (jumpInput.value !== '') {
          jumpInput.value = '';
          showToast(`Masukkan angka 1 - ${state.totalPages}`, 'error');
        }
      });

      // FIX: Otomatis scroll ke atas saat input di-fokus pada mobile
      // agar tidak tertutup keyboard.
      jumpInput.addEventListener('focus', (e) => {
        if (window.innerWidth <= 768) {
          setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      });

      jumpWrapper.appendChild(jumpInput);
      pageNumbersDiv.appendChild(jumpWrapper);
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

function getTextDirection(text) {
  if (!text) return 'ltr';
  // Abaikan angka/simbol, temukan HURUF pertama (Latin atau Arab) dalam teks
  const match = text.match(/[a-zA-Z\u0600-\u06FF]/);
  // Jika huruf pertama adalah Arab, jadikan 'rtl' (Kanan), selain itu 'ltr' (Kiri)
  return match && /[\u0600-\u06FF]/.test(match[0]) ? 'rtl' : 'ltr';
}

function formatTitle(title) {
  if (!title) return '';
  
  // Pisahkan judul jika mengandung tanda "=" (biasanya format dwibahasa)
  if (title.includes('=')) {
    // Filter untuk mencegah bagian kosong jika ada "=" berlebih di awal/akhir
    const parts = title.split('=').filter(p => p.trim().length > 0);
    const formattedParts = parts.map(part => {
      const trimmed = part.trim();
      const dir = getTextDirection(trimmed);
      return `<div class="title-part" dir="${dir}">${wrapArabic(escapeHtml(toTitleCase(trimmed)))}</div>`;
    });
    // Gabungkan kembali menggunakan span sebagai garis pemisah secara vertikal
    return formattedParts.join('<div class="title-separator"></div>');
  }
  
  const dir = getTextDirection(title);
  return `<div class="title-part" dir="${dir}">${wrapArabic(escapeHtml(toTitleCase(title)))}</div>`;
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
  // Regex menangkap kalimat Arab utuh (termasuk angka dan tanda baca di tengahnya).
  // Disertai Kuantifier (+) agar performa cepat dan aman dari memori browser yang freeze.
  const arabicRegex = /([\u0600-\u06FF\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:(?:[\s0-9.,\-\/()\[\]{}:'"=+]|<\/?mark>|&(?:[a-z]+|#\d+);)+[\u0600-\u06FF\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g;
  
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  return text.replace(arabicRegex, (match) => {
    // Mengubah angka Latin (0-9) menjadi angka Timur/Arab (٠-٩) khusus pada porsi teks Arab.
    // Regex /(<[^>]+>|&#?\w+;)|([0-9])/g digunakan untuk MELINDUNGI tag HTML (cth: <mark>)
    // dan karakter entitas HTML agar angkanya tidak ikut terkonversi dan merusak tampilan web.
    const converted = match.replace(/(<[^>]+>|&#?\w+;)|([0-9])/g, (m, htmlOrEntity, digit) => {
      if (htmlOrEntity) return htmlOrEntity; // Abaikan jika ini adalah tag/entitas HTML
      return arabicDigits[digit];            // Ubah menjadi angka Arab jika ini sekadar angka biasa
    });
    return `<span class="arabic-text" dir="rtl">${converted}</span>`;
  });
}

function fixTypos(text) {
  if (!text) return '';
  
  // 1. Normalisasi Unicode (NFKC)
  // Mengubah karakter "Arabic Presentation Forms" (biasanya akibat copy-paste dari PDF)
  // kembali menjadi huruf Arab standar, sehingga font Aref Ruqaa bisa merendernya secara utuh.
  let fixedText = text.normalize('NFKC');

  // Kamus perbaikan teks bawaan dari sumber aslinya yang salah ketik/terbalik
  const corrections = [
    // Memperbaiki teks "Al-Qira'ah Al-Rasyidah" yang terbalik harfiah (termasuk spasi invisible)
    { error: /ةديشرلا[\s\u200B-\u200F\uFEFF]*ةءارقلا/g, fix: 'القراءة الرشيدة' },
    { error: /Qur;an/gi, fix: "Qur'an" },
    { error: /Qira;ah/gi, fix: "Qira'ah" },
    // Memperbaiki typo bawaan penulis: kurung ganda dan titik di akhir judul Arab
    { error: /\(([^()]+?)\s*\((دراسة\s*داللية|دراسةداللية)\./g, fix: '$1 (دراسة داللية)' }
  ];
  
  corrections.forEach(c => {
    fixedText = fixedText.replace(c.error, c.fix);
  });
  
  return fixedText;
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

function initFontToggleBtn() {
  if (document.getElementById('fontToggleBtn')) return; // Cegah tombol ganda
  const fontToggleBtn = document.createElement('button');
  fontToggleBtn.id = 'fontToggleBtn';
  fontToggleBtn.className = 'icon-btn desktop-only'; 
  fontToggleBtn.title = 'Ganti Font Arab (Amiri / Aref Ruqaa)';
  fontToggleBtn.innerHTML = '<span class="material-symbols-rounded">text_format</span>';
  fontToggleBtn.addEventListener('click', toggleFontMode);
  
  if (themeToggle && themeToggle.parentNode) {
    themeToggle.parentNode.insertBefore(fontToggleBtn, themeToggle);
  }
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
  initFontMode();
  initFontToggleBtn();
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