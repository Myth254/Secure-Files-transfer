/**
 * ui.js
 * UI utilities: toast notifications, modal management,
 * button loading states, HTML helpers, and formatting.
 */

/* ════════════════════════════════════════
   TOAST NOTIFICATIONS
════════════════════════════════════════ */
const TOAST_ICONS = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

/**
 * Show a toast notification.
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} title
 * @param {string} message
 * @param {number} duration - ms before auto-dismiss
 */
function toast(type, title, message = '', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const el        = document.createElement('div');

  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${escHtml(title)}</div>
      ${message ? `<div class="toast-message">${escHtml(message)}</div>` : ''}
    </div>
    <span class="toast-close" onclick="removeToast(this.parentElement)">✕</span>
  `;

  container.appendChild(el);
  setTimeout(() => removeToast(el), duration);
}

/**
 * Animate and remove a toast element.
 * @param {HTMLElement} el
 */
function removeToast(el) {
  if (!el || !el.parentElement) return;
  el.classList.add('removing');
  setTimeout(() => el.parentElement && el.parentElement.removeChild(el), 300);
}

/* ════════════════════════════════════════
   INLINE ALERT HELPERS
════════════════════════════════════════ */

/**
 * Show an inline alert component.
 * @param {string} elId    - Container element id
 * @param {string} msgId   - Text element id inside container
 * @param {string} msg     - Message text
 * @param {string} type    - 'error' | 'success' | 'warning' | 'info'
 */
function showAlert(elId, msgId, msg, type = 'error') {
  const el    = document.getElementById(elId);
  const msgEl = document.getElementById(msgId);
  if (!el || !msgEl) return;
  el.className = `alert alert-${type}`;
  msgEl.textContent = msg;
  el.classList.remove('hidden');
}

/**
 * Hide an inline alert.
 * @param {string} elId
 */
function hideAlert(elId) {
  document.getElementById(elId)?.classList.add('hidden');
}

/* ════════════════════════════════════════
   MODAL MANAGEMENT
════════════════════════════════════════ */

/** Open a modal overlay by id */
function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

/** Close a modal overlay by id */
function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

/* ════════════════════════════════════════
   BUTTON LOADING STATE
════════════════════════════════════════ */

/**
 * Toggle a button's loading state.
 * Saves original HTML so it can be restored.
 * @param {string}  btnId
 * @param {boolean} loading
 * @param {string}  text  - Label shown while loading
 */
function setLoading(btnId, loading, text = '') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;

  if (loading) {
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> ${text || 'Loading...'}`;
  } else {
    btn.innerHTML = btn.dataset.origText || text;
  }
}

/* ════════════════════════════════════════
   FORM HELPERS
════════════════════════════════════════ */

/**
 * Toggle password input visibility.
 * @param {string}      inputId
 * @param {HTMLElement} iconEl   - Eye icon element
 */
function togglePasswordVisibility(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show   = input.type === 'password';
  input.type   = show ? 'text' : 'password';
  iconEl.textContent = show ? '🙈' : '👁';
}

/* ════════════════════════════════════════
   CLIPBOARD
════════════════════════════════════════ */

/**
 * Copy text to clipboard and show a toast.
 * @param {string} text
 * @param {string} successMsg
 */
function copyToClipboard(text, successMsg = 'Copied!') {
  navigator.clipboard.writeText(text)
    .then(() => toast('success', successMsg))
    .catch(() => toast('error', 'Copy failed'));
}

/* ════════════════════════════════════════
   FORMATTING
════════════════════════════════════════ */

/**
 * Escape HTML special characters to prevent XSS.
 * @param {*} str
 * @returns {string}
 */
function escHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[m]));
}

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k     = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format ISO date string to readable local datetime.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
         ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ════════════════════════════════════════
   FILE ICON HELPERS
════════════════════════════════════════ */
const FILE_EMOJI_MAP = {
  pdf: '📕', jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼',
  doc: '📝', docx: '📝', odt: '📝', xls: '📊', xlsx: '📊', ppt: '📋', pptx: '📋',
  txt: '📄', zip: '🗜', rar: '🗜',
};

const FILE_CLASS_MAP = {
  jpg: 'file-icon-img', jpeg: 'file-icon-img', png: 'file-icon-img',
  gif: 'file-icon-img', webp: 'file-icon-img',
  pdf: 'file-icon-pdf',
  doc: 'file-icon-doc', docx: 'file-icon-doc', odt: 'file-icon-doc',
  xls: 'file-icon-xls', xlsx: 'file-icon-xls',
  ppt: 'file-icon-ppt', pptx: 'file-icon-ppt',
  txt: 'file-icon-txt',
};

/**
 * Return emoji icon for a filename.
 * @param {string} filename
 * @returns {string}
 */
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_EMOJI_MAP[ext] || '📄';
}

/**
 * Return CSS class for a file icon element.
 * @param {string} filename
 * @returns {string}
 */
function getFileIconClass(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_CLASS_MAP[ext] || 'file-icon-default';
}

/* ════════════════════════════════════════
   VIEW / PAGE ROUTER
════════════════════════════════════════ */
const ALL_VIEWS = ['viewLogin', 'viewRegister', 'viewKeyBackup', 'viewOTP', 'viewDashboard'];

/**
 * Switch the top-level view (auth vs dashboard).
 * @param {string} id - Element id of the view to show
 */
function showView(id) {
  ALL_VIEWS.forEach(v => document.getElementById(v)?.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}

/**
 * Switch between dashboard sub-pages and trigger their data loads.
 * @param {string} page - 'files' | 'share' | 'monitoring' | 'profile'
 */
function switchPage(page) {
  const pages = ['files', 'share', 'monitoring', 'profile'];

  pages.forEach(p => {
    const pageId = `pag${p.charAt(0).toUpperCase() + p.slice(1)}`;
    document.getElementById(pageId)?.classList.add('hidden');
    document.getElementById(`nav-${p}`)?.classList.remove('active');
  });

  const pageEl = document.getElementById(`pag${page.charAt(0).toUpperCase() + page.slice(1)}`);
  if (pageEl) pageEl.classList.remove('hidden');
  document.getElementById(`nav-${page}`)?.classList.add('active');

  const TITLES = {
    files:      ['My Files',          'VaultSync / Files'],
    share:      ['File Sharing',      'VaultSync / Sharing'],
    monitoring: ['Monitoring',        'VaultSync / Monitoring'],
    profile:    ['Account Settings',  'VaultSync / Profile'],
  };

  const [title, breadcrumb] = TITLES[page] || ['', ''];
  document.getElementById('topbarTitle').textContent     = title;
  document.getElementById('topbarBreadcrumb').textContent = breadcrumb;

  // Trigger page-specific data loading
  // Guards prevent ReferenceError if a module script hasn't loaded yet
  if (page === 'files'     && typeof loadFiles      === 'function') loadFiles();
  if (page === 'share'     && typeof loadShareData  === 'function') loadShareData();
  if (page === 'monitoring' && typeof loadMonitoring === 'function') { loadMonitoring(); startMetricsPolling(); }
  else if (page !== 'monitoring' && typeof stopMetricsPolling === 'function') stopMetricsPolling();
  if (page === 'profile'   && typeof loadProfile    === 'function') { loadProfile(); loadActivity(); }
}

/* ════════════════════════════════════════
   GLOBAL EVENT LISTENERS
════════════════════════════════════════ */

// Close modal when clicking its overlay backdrop
document.addEventListener('click', (e) => {
  if (e.target.id === 'fileViewerModal' && typeof closeFileViewerModal === 'function') {
    closeFileViewerModal();
  } else if (e.target.id === 'downloadModal' && typeof closeDownloadModal === 'function') {
    closeDownloadModal();
  } else if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// Escape key closes all open modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!document.getElementById('fileViewerModal')?.classList.contains('hidden') &&
        typeof closeFileViewerModal === 'function') {
      closeFileViewerModal();
      return;
    }
    if (!document.getElementById('downloadModal')?.classList.contains('hidden') &&
        typeof closeDownloadModal === 'function') {
      closeDownloadModal();
      return;
    }
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }
});
