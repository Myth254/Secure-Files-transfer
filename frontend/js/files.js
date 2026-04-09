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
      document.getElementById('statStorageUsed').textContent   = (data.stats.total_original_mb ?? data.stats.total_storage_mb ?? '—') + ' MB';
      document.getElementById('statRecentUploads').textContent = data.stats.file_types
        ? Object.values(data.stats.file_types).reduce((a, b) => a + b, 0)
        : '—';  // backend has no recent_uploads_7d — show total by type or '—'
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
              <span>${formatDate(f.upload_date)}</span>
            </div>
          </div>
          <div class="file-actions">
            <button class="btn btn-secondary btn-sm"
              onclick='openViewModal(${f.id}, ${JSON.stringify(f.filename)})'
              title="Preview in browser">View</button>
            <button class="btn btn-success btn-sm"
              onclick='openDownloadModal(${f.id}, ${JSON.stringify(f.filename)})'
              title="Decrypt and download">Download</button>
            <button class="btn btn-secondary btn-sm"
              onclick='openShareFromFile(${f.id}, ${JSON.stringify(f.filename)})'
              title="Share secure access">Share</button>
            <button class="btn btn-danger btn-sm"
              onclick='openDeleteModal(${f.id}, ${JSON.stringify(f.filename)})'
              title="Delete">Delete</button>
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
 * Open the secure file action modal for preview/download.
 * @param {number} fileId
 * @param {string} filename
 * @param {'owned'|'shared'} source
 * @param {'view'|'download'} action
 */
function openFileActionModal(fileId, filename, source = 'owned', action = 'download') {
  state.downloadTarget = fileId;
  state.downloadTargetSource = source;
  state.downloadOTP = null;
  state.fileActionMode = action;
  const actionVerb = action === 'view' ? 'Preview' : 'Download';
  const actionResult = action === 'view' ? 'Open preview' : 'Save file';
  document.getElementById('downloadModalTitle').textContent =
    source === 'shared' ? `${actionVerb} Shared File` : `${actionVerb} File`;
  document.getElementById('downloadModalSubtitle').textContent =
    `Step 1: Enter password -> Step 2: Request OTP -> Step 3: Enter code -> ${actionResult}`;
  document.getElementById('downloadFileName').textContent = filename;
  document.getElementById('downloadPassword').value       = '';
  document.getElementById('downloadOtpCode').value        = '';
  document.getElementById('downloadOtpGroup').classList.add('hidden');
  document.getElementById('downloadOtpHint').textContent  =
    source === 'shared'
      ? `Shared file ${action === 'view' ? 'preview' : 'download'} requires a one-time code sent to your email.`
      : 'Enter the code we sent to your email to continue.';
  document.getElementById('downloadStepText').textContent =
    source === 'shared'
      ? `Shared file ${action === 'view' ? 'preview' : 'download'} requires email verification before decryption.`
      : `We will email a one-time code before the ${action === 'view' ? 'preview' : 'download'} starts.`;
  document.getElementById('downloadStepIndicator').classList.remove('hidden');
  document.getElementById('downloadAlert').classList.add('hidden');
  setDownloadButtonLabel(getActionButtonLabel(action, 'request'));
  openModal('downloadModal');
}

function openDownloadModal(fileId, filename, source = 'owned') {
  openFileActionModal(fileId, filename, source, 'download');
}

function openViewModal(fileId, filename, source = 'owned') {
  openFileActionModal(fileId, filename, source, 'view');
}

function closeDownloadModal() {
  state.downloadTarget = null;
  state.downloadTargetSource = 'owned';
  state.downloadOTP = null;
  state.fileActionMode = 'download';
  document.getElementById('downloadPassword').value = '';
  document.getElementById('downloadOtpCode').value = '';
  document.getElementById('downloadOtpGroup').classList.add('hidden');
  document.getElementById('downloadAlert').classList.add('hidden');
  document.getElementById('downloadStepIndicator').classList.add('hidden');
  setDownloadButtonLabel(getActionButtonLabel('download', 'request'));
  closeModal('downloadModal');
}

function setDownloadButtonLabel(label) {
  const btn = document.getElementById('downloadBtn');
  if (!btn) return;
  btn.innerHTML = label;
  btn.dataset.origText = label;
}

function getActionButtonLabel(action, phase) {
  if (phase === 'verify') {
    return action === 'view' ? 'Verify OTP & Preview' : 'Verify OTP & Download';
  }
  return 'Request OTP';
}

function getProtectedFilePath(fileId, source, action) {
  const intent = encodeURIComponent(action);
  if (source === 'shared') {
    return `/share/shared-files/${fileId}/content?intent=${intent}`;
  }
  return `/files/${fileId}/content?intent=${intent}`;
}

async function decryptProtectedFile(filePayload, password) {
  const privKeyResp = await api('GET', '/user/me/private-key');
  if (!privKeyResp.ok) {
    throw new Error('Failed to retrieve private key for decryption');
  }

  const privKeyPem = await window.crypto_module.decryptPrivateKeyPem(
    privKeyResp.data.encrypted_private_key,
    password
  );

  return window.crypto_module.decryptFile(
    filePayload.encrypted_file,
    filePayload.encrypted_aes_key,
    privKeyPem
  );
}

/**
 * Handle secure preview/download via OTP + client-side decryption.
 */
async function handleDownload() {
  const password = document.getElementById('downloadPassword').value;
  const otpCode  = document.getElementById('downloadOtpCode').value.trim();
  const alertEl  = document.getElementById('downloadAlert');
  const fileId   = state.downloadTarget;
  const source   = state.downloadTargetSource || 'owned';
  const action   = state.fileActionMode || 'download';

  if (!password) {
    alertEl.className   = 'alert alert-error';
    alertEl.textContent = 'Password is required for decryption';
    alertEl.classList.remove('hidden');
    return;
  }

  setLoading('downloadBtn', true, 'Requesting OTP...');
  alertEl.classList.add('hidden');

  try {
    if (!state.downloadOTP) {
      // Step 1: Request a file_download OTP
      const otpReq = await api('POST', '/otp/send', {
        purpose: 'file_download',
        file_id: fileId,
      });

      if (!otpReq.ok || !otpReq.data.success) {
        throw new Error(otpReq.data.error || 'Failed to send OTP');
      }

      state.downloadOTP = {
        otp_id: otpReq.data.otp_id,
        expires_in: otpReq.data.expires_in,
        message: otpReq.data.message,
      };

      document.getElementById('downloadOtpGroup').classList.remove('hidden');
      document.getElementById('downloadStepText').textContent =
        otpReq.data.message || 'A one-time code has been sent to your email.';
      document.getElementById('downloadOtpHint').textContent =
        otpReq.data.expires_in
          ? `Enter the 6-digit code from your email. It expires in ${Math.ceil(otpReq.data.expires_in / 60)} minute(s).`
          : 'Enter the 6-digit code we sent to your email.';
      setDownloadButtonLabel(getActionButtonLabel(action, 'verify'));
      document.getElementById('downloadOtpCode').focus();
      setLoading('downloadBtn', false);
      setDownloadButtonLabel(getActionButtonLabel(action, 'verify'));
      return;
    }

    if (!otpCode) {
      throw new Error('Enter the 6-digit OTP code to continue');
    }

    setLoading('downloadBtn', true, 'Verifying OTP...');

    // Step 3: Verify OTP — receive download_token
    const verifyReq = await api('POST', '/otp/verify', {
      otp_id:   state.downloadOTP.otp_id,
      otp_code: otpCode,
    });

    if (!verifyReq.ok || !verifyReq.data.success) {
      throw new Error(verifyReq.data.error || 'OTP verification failed');
    }

    state.downloadOTP = null;

    const downloadToken = verifyReq.data.download_token;
    if (!downloadToken) throw new Error('No download token received from server');

    setLoading('downloadBtn', true, action === 'view' ? 'Preparing preview...' : 'Downloading...');

    const { ok, data } = await api(
      'GET',
      getProtectedFilePath(fileId, source, action),
      null,
      false,
      { 'X-Download-Token': downloadToken }
    );

    if (!ok || !data.success) throw new Error(data.error || 'Failed to retrieve file');

    setLoading('downloadBtn', true, 'Decrypting...');
    
    try {
      const plaintext = await decryptProtectedFile(data.file, password);

      if (action === 'view') {
        closeDownloadModal();
        await window.fileViewer.openFileViewerModal({
          filename: data.file.filename,
          bytes: plaintext,
          mimeType: data.file.mime_type,
          extension: data.file.extension,
          source,
          ownerUsername: data.file.owner_username,
        });
        toast('success', 'Preview ready', 'File decrypted locally in your browser.');
      } else {
        triggerDownload(plaintext, data.file.filename, data.file.mime_type);
        toast('success', 'File decrypted', 'Download starting...');
        closeDownloadModal();
      }
    } catch (decryptError) {
      throw new Error(`Decryption failed: ${decryptError.message}`);
    }

  } catch (e) {
    alertEl.className   = 'alert alert-error';
    alertEl.textContent = e.message;
    alertEl.classList.remove('hidden');
  }

  setLoading('downloadBtn', false);
  setDownloadButtonLabel(getActionButtonLabel(action, state.downloadOTP ? 'verify' : 'request'));
}

/**
 * Helper: Trigger browser download of decrypted file.
 * @param {Uint8Array} uint8array - Decrypted file bytes
 * @param {string} filename - Filename to save as
 * @param {string} mimeType - file MIME type
 */
function triggerDownload(uint8array, filename, mimeType = 'application/octet-stream') {
  const blob = new Blob([uint8array], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href       = url;
  a.download   = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  const fileId = state.deleteTarget;

  try {
    // Step 1: Request delete OTP
    const otpReq = await api('POST', '/otp/send', {
      purpose: 'delete_file',
      file_id: fileId,
    });

    if (!otpReq.ok || !otpReq.data.success) {
      toast('error', 'Delete failed', otpReq.data.error || 'Could not send OTP');
      return;
    }

    const otpCode = window.prompt(
      `${otpReq.data.message || 'An OTP has been sent to your email.'}\nEnter the 6-digit code to confirm deletion:`
    );
    if (!otpCode) return;

    // Step 3: Verify OTP — receive download_token (used as delete authorisation)
    const verifyReq = await api('POST', '/otp/verify', {
      otp_id:   otpReq.data.otp_id,
      otp_code: otpCode.trim(),
    });

    if (!verifyReq.ok || !verifyReq.data.success) {
      toast('error', 'Delete failed', verifyReq.data.error || 'OTP invalid');
      return;
    }

    const deleteToken = verifyReq.data.download_token;

    // Step 4: Delete with token
    const { ok, data } = await api(
      'DELETE',
      `/files/${fileId}`,
      null,
      false,
      { 'X-Download-Token': deleteToken }
    );

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
