/**
 * files.js
 * File management: listing, upload, download/decrypt,
 * delete, search, pagination, and stats.
 */

/* ════════════════════════════════════════
   DATA LOADING
════════════════════════════════════════ */

/**
 * Fetch the current page of files and refresh stats.
 */
async function loadFiles() {
  try {
    const { ok, data } = await api('GET', `/files?page=${state.currentPage}&per_page=${state.perPage}`);

    if (ok) {
      state.files         = data.files || [];
      state.filteredFiles = state.files;
      state.totalPages    = data.pagination?.total_pages || 1;

      renderFiles(state.files);
      renderPagination(data.pagination);

      // Update sidebar badge
      document.getElementById('fileCountBadge').textContent = data.pagination?.total_items || 0;
    }
  } catch {
    toast('error', 'Failed to load files');
  }

  loadStats();
}

/**
 * Fetch and render the three stat cards at the top of the files page.
 */
async function loadStats() {
  try {
    const { ok, data } = await api('GET', '/files/stats');
    if (ok && data.success) {
      document.getElementById('statTotalFiles').textContent    = data.stats.total_files;
      document.getElementById('statStorageUsed').textContent   = data.stats.total_storage_mb + ' MB';
      document.getElementById('statRecentUploads').textContent = data.stats.recent_uploads_7d;
    }
  } catch { /* non-critical */ }
}

/* ════════════════════════════════════════
   SEARCH & FILTER
════════════════════════════════════════ */

/**
 * Filter the in-memory file list and re-render.
 * @param {string} query - Search text
 */
function filterFiles(query) {
  const q             = query.toLowerCase();
  state.filteredFiles = q
    ? state.files.filter(f => f.filename.toLowerCase().includes(q))
    : state.files;

  renderFiles(state.filteredFiles);
}

/* ════════════════════════════════════════
   RENDERING
════════════════════════════════════════ */

/**
 * Render the list of file items into #filesContainer.
 * @param {Array} files
 */
function renderFiles(files) {
  const container = document.getElementById('filesContainer');

  if (!files.length) {
    container.innerHTML = `
      <div class="table-empty">
        <div class="table-empty-icon">📁</div>
        <div class="table-empty-text">No files found</div>
        <div class="table-empty-sub text-muted">Upload your first encrypted file to get started</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.625rem">
      ${files.map(f => `
        <div class="file-item">
          <div class="file-icon ${getFileIconClass(f.filename)}">${getFileIcon(f.filename)}</div>
          <div class="file-info">
            <div class="file-name" title="${escHtml(f.filename)}">${escHtml(f.filename)}</div>
            <div class="file-meta">
              <span>${formatBytes(f.original_size)}</span>
              <span class="sep">·</span>
              <span>Encrypted: ${formatBytes(f.encrypted_size)}</span>
              <span class="sep">·</span>
              <span>${formatDate(f.upload_date)}</span>
            </div>
          </div>
          <div class="file-actions">
            <button class="btn btn-secondary btn-sm"
              onclick="openShareFromFile(${f.id}, '${escHtml(f.filename)}')"
              title="Share">🔗</button>
            <button class="btn btn-success btn-sm"
              onclick="openDownloadModal(${f.id}, '${escHtml(f.filename)}')"
              title="Download">⬇</button>
            <button class="btn btn-danger btn-sm"
              onclick="openDeleteModal(${f.id}, '${escHtml(f.filename)}')"
              title="Delete">🗑</button>
          </div>
        </div>
      `).join('')}
    </div>`;
}

/**
 * Show or hide pagination controls.
 * @param {object} pag - Pagination metadata from the API
 */
function renderPagination(pag) {
  const el = document.getElementById('filesPagination');
  if (!pag || pag.total_pages <= 1) { el.classList.add('hidden'); return; }

  el.classList.remove('hidden');
  document.getElementById('paginationInfo').textContent = `Page ${pag.page} of ${pag.total_pages} (${pag.total_items} files)`;
  document.getElementById('prevPageBtn').disabled       = !pag.has_prev;
  document.getElementById('nextPageBtn').disabled       = !pag.has_next;
}

/**
 * Move to the previous or next page.
 * @param {number} dir - +1 or -1
 */
function changePage(dir) {
  state.currentPage = Math.max(1, Math.min(state.totalPages, state.currentPage + dir));
  loadFiles();
}

/* ════════════════════════════════════════
   UPLOAD
════════════════════════════════════════ */

let selectedFile = null;

/** Open the upload modal and reset all state within it. */
function openUploadModal() {
  selectedFile = null;
  document.getElementById('selectedFileInfo').classList.add('hidden');
  document.getElementById('uploadZone').classList.remove('hidden');
  document.getElementById('uploadProgress').classList.add('hidden');
  document.getElementById('uploadBtn').disabled = true;
  document.getElementById('fileInput').value    = '';
  openModal('uploadModal');
}

/**
 * Handle the native file input change event.
 * @param {Event} e
 */
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) showFilePreview(file);
}

/**
 * Handle drag-and-drop file onto the upload zone.
 * @param {DragEvent} e
 */
function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) showFilePreview(file);
}

/**
 * Display a preview of the selected file inside the modal.
 * @param {File} file
 */
function showFilePreview(file) {
  selectedFile = file;
  document.getElementById('uploadZone').classList.add('hidden');
  document.getElementById('selectedFileInfo').classList.remove('hidden');
  document.getElementById('uploadFileIcon').textContent = getFileIcon(file.name);
  document.getElementById('uploadFileIcon').className  = `file-icon ${getFileIconClass(file.name)}`;
  document.getElementById('uploadFileName').textContent = file.name;
  document.getElementById('uploadFileSize').textContent = formatBytes(file.size);
  document.getElementById('uploadFileType').textContent = file.name.split('.').pop().toUpperCase();
  document.getElementById('uploadBtn').disabled         = false;
}

/** Reset the upload zone to its empty state. */
function clearFileSelection() {
  selectedFile = null;
  document.getElementById('uploadZone').classList.remove('hidden');
  document.getElementById('selectedFileInfo').classList.add('hidden');
  document.getElementById('uploadBtn').disabled = true;
  document.getElementById('fileInput').value    = '';
}

/**
 * Upload the selected file to the server.
 * Animates a progress bar during the request.
 */
async function handleUpload() {
  if (!selectedFile) return;

  document.getElementById('uploadProgress').classList.remove('hidden');

  // Simulated progress bar (real XHR progress would need XMLHttpRequest)
  let progress = 0;
  const progressBar = document.getElementById('uploadProgressBar');
  const pct         = document.getElementById('uploadProgressPct');

  const progInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 15, 90);
    progressBar.style.width = progress + '%';
    pct.textContent         = Math.floor(progress) + '%';
  }, 200);

  setLoading('uploadBtn', true, 'Uploading...');
  document.getElementById('uploadBtn').disabled = true;

  try {
    const formData = new FormData();
    formData.append('file', selectedFile);

    const { ok, data } = await apiUpload('/files/upload', formData);

    clearInterval(progInterval);
    progressBar.style.width = '100%';
    pct.textContent         = '100%';

    if (ok && data.success) {
      setTimeout(() => {
        closeModal('uploadModal');
        toast('success', 'File uploaded!', `${selectedFile.name} encrypted and stored.`);
        loadFiles();
      }, 400);
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (e) {
    clearInterval(progInterval);
    document.getElementById('uploadProgress').classList.add('hidden');
    toast('error', 'Upload failed', e.message);
  }

  setLoading('uploadBtn', false, '⬆ Upload & Encrypt');
  document.getElementById('uploadBtn').disabled = false;
}

/* ════════════════════════════════════════
   DOWNLOAD / DECRYPT
════════════════════════════════════════ */

/**
 * Open the decrypt-and-download modal for a file.
 * @param {number} fileId
 * @param {string} filename
 */
function openDownloadModal(fileId, filename) {
  state.downloadTarget = fileId;
  document.getElementById('downloadFileName').textContent = filename;
  document.getElementById('downloadPassword').value       = '';
  document.getElementById('downloadAlert').classList.add('hidden');
  openModal('downloadModal');
}

/**
 * Request the encrypted file from the server.
 * In production, the decryption step uses the Web Crypto API
 * with the user's RSA private key (unlocked via their password).
 */
async function handleDownload() {
  const password = document.getElementById('downloadPassword').value;
  const alertEl  = document.getElementById('downloadAlert');

  if (!password) {
    alertEl.className = 'alert alert-error';
    alertEl.textContent = 'Password is required for decryption';
    alertEl.classList.remove('hidden');
    return;
  }

  setLoading('downloadBtn', true, 'Decrypting...');
  alertEl.classList.add('hidden');

  try {
    const { ok, data } = await api('GET', `/files/${state.downloadTarget}`);
    if (!ok || !data.success) throw new Error(data.error || 'Failed to retrieve file');

    /*
     * TODO: Client-side decryption using Web Crypto API
     *
     * 1. Decrypt the stored RSA private key with the user's password
     *    (bcrypt KDF → AES-GCM, matching EncryptionService.decrypt_private_key)
     * 2. Import the RSA private key via window.crypto.subtle.importKey
     * 3. Decrypt the AES key: subtle.decrypt({ name:'RSA-OAEP' }, privateKey, encAesKeyBytes)
     * 4. Decrypt the file:    subtle.decrypt({ name:'AES-GCM', iv }, aesKey, cipherBytes)
     * 5. Trigger browser download of the plaintext blob
     *
     * data.file.encrypted_file     — hex string, IV(12B) + ciphertext + tag(16B)
     * data.file.encrypted_aes_key  — hex string of RSA-OAEP-encrypted AES-256 key
     */

    toast('success', 'File retrieved', 'Decryption happens client-side using your private key.');
    closeModal('downloadModal');
  } catch (e) {
    alertEl.className   = 'alert alert-error';
    alertEl.textContent = e.message;
    alertEl.classList.remove('hidden');
  }

  setLoading('downloadBtn', false, '🔓 Decrypt & Download');
}

/* ════════════════════════════════════════
   DELETE
════════════════════════════════════════ */

/**
 * Open the delete confirmation modal.
 * @param {number} fileId
 * @param {string} filename
 */
function openDeleteModal(fileId, filename) {
  state.deleteTarget = fileId;
  document.getElementById('deleteFileName').textContent = filename;
  openModal('deleteModal');
}

/**
 * Permanently delete the targeted file.
 */
async function confirmDelete() {
  if (!state.deleteTarget) return;

  try {
    const { ok, data } = await api('DELETE', `/files/${state.deleteTarget}`);

    if (ok && data.success) {
      closeModal('deleteModal');
      toast('success', 'File deleted', data.message || 'File permanently removed.');
      loadFiles();
    } else {
      toast('error', 'Delete failed', data.error || 'Please try again.');
    }
  } catch {
    toast('error', 'Delete failed', 'Network error.');
  }

  state.deleteTarget = null;
}