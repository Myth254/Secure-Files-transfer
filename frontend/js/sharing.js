/**
 * sharing.js
 * File sharing: create share requests, view received/sent requests,
 * accept / reject / revoke, accessible files, and share stats.
 */

/* ════════════════════════════════════════
   PAGE DATA LOAD
════════════════════════════════════════ */

/**
 * Reload all sharing data for the current user.
 * Called whenever the Share page is opened.
 */
async function loadShareData() {
  return Promise.all([
    loadShareRequests('recipient'), // Requests addressed to me
    loadShareRequests('owner'),     // Requests I sent
    loadAccessibleFiles(),          // Files I can access after accepting
    loadShareStats(),
  ]);
}

/* ════════════════════════════════════════
   CREATE SHARE REQUEST MODAL
════════════════════════════════════════ */

/**
 * Open the share-request modal, pre-populating the file dropdown
 * from the files already loaded in state.
 */
function openShareModal() {
  const select = document.getElementById('shareFileSelect');
  select.innerHTML = '<option value="">Choose a file...</option>';

  state.files.forEach(f => {
    const opt       = document.createElement('option');
    opt.value       = f.id;
    opt.textContent = f.filename;
    select.appendChild(opt);
  });

  document.getElementById('shareRecipient').value       = '';
  document.getElementById('permDownload').checked       = false;
  document.getElementById('permReshare').checked        = false;
  document.getElementById('shareExpiry').value          = '';
  document.getElementById('shareModalAlert').classList.add('hidden');

  openModal('shareModal');
}

/**
 * Open the share modal from the files page, pre-selecting a specific file.
 * Navigates to the Share page first so context is correct.
 * @param {number} fileId
 * @param {string} filename  (unused but kept for future tooltip)
 */
function openShareFromFile(fileId, filename) {
  switchPage('share');
  setTimeout(() => {
    openShareModal();
    document.getElementById('shareFileSelect').value = fileId;
  }, 100);
}

/**
 * Submit a new share request to the API.
 */
async function handleShareRequest() {
  const fileId    = document.getElementById('shareFileSelect').value;
  const recipient = document.getElementById('shareRecipient').value.trim();
  const alertEl   = document.getElementById('shareModalAlert');

  if (!fileId || !recipient) {
    alertEl.className   = 'alert alert-error';
    alertEl.textContent = 'Please select a file and enter a recipient username.';
    alertEl.classList.remove('hidden');
    return;
  }

  document.getElementById('passwordPromptRecipient').textContent = recipient;
  document.getElementById('passwordPromptInput').value = '';
  document.getElementById('passwordPromptAlert').classList.add('hidden');
  
  window._shareContext = {
    fileId: parseInt(fileId, 10),
    recipient: recipient,
    canView: true,
    canDownload: document.getElementById('permDownload').checked,
    canReshare: document.getElementById('permReshare').checked,
    expiresDays: document.getElementById('shareExpiry').value
      ? parseInt(document.getElementById('shareExpiry').value, 10)
      : null,
  };

  openModal('passwordPromptModal');
}

async function confirmPasswordPrompt() {
  const password = document.getElementById('passwordPromptInput').value;
  const alertEl = document.getElementById('passwordPromptAlert');
  const shareContext = window._shareContext;

  if (!password) {
    alertEl.textContent = 'Please enter your password.';
    alertEl.classList.remove('hidden');
    return;
  }

  try {
    closeModal('passwordPromptModal');
    openModal('shareProgressModal');

    const steps = ['progressStep1', 'progressStep2', 'progressStep3', 'progressStep4'];
    steps.forEach(id => {
      const el = document.getElementById(id);
      el.className = 'progress-step pending';
      el.querySelector('.step-icon').textContent = '○';
    });

    updateProgressStep(0, 'loading', 'Fetching file metadata…');
    const fileResponse = await api('GET', `/files/${shareContext.fileId}/key`);
    if (!fileResponse.ok || !fileResponse.data.success) {
      throw new Error('Could not fetch file key');
    }
    const ownerEncAesKeyHex = fileResponse.data.encrypted_aes_key;
    updateProgressStep(0, 'complete', 'File metadata fetched');

    updateProgressStep(0, 'loading', '');
    updateProgressStep(1, 'loading', "Fetching recipient's public key…");
    const recipientKeyResponse = await api(
      'GET',
      `/user/public-key/${encodeURIComponent(shareContext.recipient)}`
    );
    if (!recipientKeyResponse.ok) {
      const errMsg = recipientKeyResponse.data?.error;
      throw new Error(errMsg || 'Recipient not found or has no public key');
    }
    const recipientPublicKeyPem = recipientKeyResponse.data.public_key;
    updateProgressStep(1, 'complete', 'Recipient key fetched');

    updateProgressStep(1, 'loading', '');
    updateProgressStep(2, 'loading', 'Decrypting your private key…');
    const myKeyResponse = await api('GET', '/user/me/private-key');
    if (!myKeyResponse.ok) {
      throw new Error('Could not fetch your private key');
    }
    const encPrivKeyData = myKeyResponse.data.encrypted_private_key;

    let myPrivKeyPem;
    try {
      myPrivKeyPem = await window.crypto_module.decryptPrivateKeyPem(
        encPrivKeyData,
        password
      );
    } catch (error) {
      if (error.message.includes('password')) {
        throw new Error('Incorrect password');
      }
      throw error;
    }
    updateProgressStep(2, 'complete', 'Private key decrypted');

    updateProgressStep(2, 'loading', '');
    updateProgressStep(3, 'loading', 'Re-wrapping AES key for recipient…');
    const myPrivKey = await window.crypto_module.importPrivateKey(myPrivKeyPem);
    const recipientPubKey = await window.crypto_module.importPublicKey(recipientPublicKeyPem);

    const recipientEncAesKeyHex = await window.crypto_module.rewrapAesKey(
      ownerEncAesKeyHex,
      myPrivKey,
      recipientPubKey
    );
    updateProgressStep(3, 'complete', 'Key re-wrapped');

    updateProgressStep(3, 'loading', 'Sending share request…');
    const sharePayload = {
      file_id: shareContext.fileId,
      recipient_username: shareContext.recipient,
      recipient_encrypted_aes_key: recipientEncAesKeyHex,
      can_view: shareContext.canView,
      can_download: shareContext.canDownload,
      can_reshare: shareContext.canReshare,
      expires_days: shareContext.expiresDays,
    };

    const shareResponse = await api('POST', '/share/request', sharePayload);
    updateProgressStep(3, 'complete', 'Request sent');

    if (shareResponse.ok && shareResponse.data.success) {
      closeModal('shareProgressModal');
      closeModal('shareModal');
      document.getElementById('passwordPromptInput').value = '';
      window.crypto_module.clearSensitiveMemory();
      toast('success', 'Share request sent!', `File shared with ${shareContext.recipient}`);
      loadShareData();
    } else {
      const errorMsg = shareResponse.data?.error || 'Share request failed';
      if (shareResponse.status === 401) {
        throw new Error('Your session has expired. Please log in again.');
      } else if (shareResponse.status === 404) {
        throw new Error('Recipient user not found. Check the username and try again.');
      } else if (shareResponse.status === 500) {
        const errorId = shareResponse.data?.error_id;
        const detail = errorId ? ` (Error ID: ${errorId})` : '';
        throw new Error(`Server error occurred${detail}. Please try again or contact support.`);
      }
      throw new Error(errorMsg);
    }

  } catch (error) {
    console.error('Share flow error:', error);
    closeModal('shareProgressModal');

    const alertEl = document.getElementById('passwordPromptAlert');
    alertEl.textContent = error.message || 'An error occurred during key re-wrapping';
    alertEl.classList.remove('hidden');
    openModal('passwordPromptModal');

    document.getElementById('passwordPromptInput').value = '';
    window.crypto_module.clearSensitiveMemory();
  }
}

function cancelShareFlow() {
  document.getElementById('passwordPromptInput').value = '';
  window.crypto_module.clearSensitiveMemory();
  window._shareContext = null;
}

function updateProgressStep(stepIndex, status, message) {
  const stepIds = ['progressStep1', 'progressStep2', 'progressStep3', 'progressStep4'];
  if (stepIndex >= 0 && stepIndex < stepIds.length) {
    const stepEl = document.getElementById(stepIds[stepIndex]);
    stepEl.className = `progress-step ${status}`;
    
    const icons = {
      pending: '○',
      loading: '⟳',
      complete: '✓'
    };
    stepEl.querySelector('.step-icon').textContent = icons[status] || '○';

    if (message) {
      stepEl.querySelector('.step-text').textContent = message;
    }
  }
}


/* ════════════════════════════════════════
   FETCHING & RENDERING REQUESTS
════════════════════════════════════════ */

/**
 * Fetch share requests filtered by the user's role.
 * @param {'recipient'|'owner'} role
 */
async function loadShareRequests(role) {
  try {
    const { ok, data } = await api('GET', `/share/requests?role=${role}`);
    if (!ok || !data.success) return;

    const requests = data.requests || [];

    if (role === 'recipient') {
      renderShareRequests(requests, 'receivedSharesContainer', 'received');

      // Update sidebar badge for pending requests
      const pending = requests.filter(r => r.status === 'pending').length;
      const badge   = document.getElementById('pendingSharesBadge');
      if (pending > 0) { badge.textContent = pending; badge.style.display = ''; }
      else             { badge.style.display = 'none'; }
    } else {
      renderShareRequests(requests, 'sentSharesContainer', 'sent');
    }
  } catch { /* non-critical */ }
}

/**
 * Fetch files that are already accessible to the current user.
 */
async function loadAccessibleFiles() {
  try {
    const { ok, data } = await api('GET', '/share/shared-files');
    if (!ok || !data.success) return;

    state.sharedFiles = data.shared_files || [];
    renderAccessibleFiles(state.sharedFiles);
  } catch { /* non-critical */ }
}

/**
 * Render a list of share request cards into a container element.
 * @param {Array}  requests    - Share request objects from the API
 * @param {string} containerId - Target element id
 * @param {'received'|'sent'} type
 */
function renderShareRequests(requests, containerId, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!requests.length) {
    const icons = { received: '📨', sent: '📤' };
    const emptyLabel = type === 'received' ? 'pending share requests' : `${type} share requests`;
    container.innerHTML = `
      <div class="table-empty">
        <div class="table-empty-icon">${icons[type] || '📋'}</div>
        <div class="table-empty-text">No ${emptyLabel}</div>
      </div>`;
    return;
  }

  const statusBadge = {
    accepted: 'badge-green',
    rejected: 'badge-red',
    revoked:  'badge-gray',
    pending:  'badge-amber',
  };

  container.innerHTML = requests.map(r => {
    const requestId = r.request_id ?? r.id;
    const fileLabel = r.filename || `File #${r.file_id}`;
    const counterparty = type === 'received'
      ? (r.owner_username || `Owner #${r.owner_id}`)
      : (r.recipient_username || `User #${r.recipient_id}`);

    return `
    <div class="share-request-card" style="margin-bottom:0.625rem">
      <div class="file-icon file-icon-default">📄</div>
      <div class="share-from">
        <div class="share-from-name">${fileLabel}</div>
        <div class="share-from-file">
          ${type === 'received' ? `From: ${escHtml(counterparty)}` : `To: ${escHtml(counterparty)}`}
        </div>
        <div class="share-from-perms">
          ${r.permissions.can_view     ? '<span class="perm-chip">View</span>'     : ''}
          ${r.permissions.can_download ? '<span class="perm-chip">Download</span>' : ''}
          ${r.permissions.can_reshare  ? '<span class="perm-chip">Reshare</span>'  : ''}
        </div>
      </div>

      <div class="flex gap-2 items-center">
        <span class="badge ${statusBadge[r.status] || 'badge-gray'}">${r.status}</span>

        ${type === 'received' && r.status === 'pending' ? `
          <button class="btn btn-success btn-sm" onclick="respondToShare(${requestId}, 'accept')">✓ Accept</button>
          <button class="btn btn-danger btn-sm"  onclick="respondToShare(${requestId}, 'reject')">✗ Reject</button>
        ` : ''}

        ${type === 'sent' && r.status === 'accepted' ? `
          <button class="btn btn-danger btn-sm" onclick="revokeShare(${requestId})">Revoke</button>
        ` : ''}
      </div>
    </div>
  `;
  }).join('');
}

/**
 * Render files the current user can access after accepting a share.
 * @param {Array} sharedFiles
 */
function renderAccessibleFiles(sharedFiles) {
  const container = document.getElementById('accessibleFilesContainer');
  if (!container) return;

  if (!sharedFiles.length) {
    container.innerHTML = `
      <div class="table-empty">
        <div class="table-empty-icon">🔓</div>
        <div class="table-empty-text">No accessible files</div>
        <div class="table-empty-sub text-muted">
          Files shared with you will appear here after you accept them
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.625rem">
      ${sharedFiles.map(file => `
        <div class="file-item">
          <div class="file-icon ${getFileIconClass(file.filename)}">${getFileIcon(file.filename)}</div>
          <div class="file-info">
            <div class="file-name" title="${escHtml(file.filename)}">${escHtml(file.filename)}</div>
            <div class="file-meta">
              <span>${formatBytes(file.original_size)}</span>
              <span class="sep">·</span>
              <span>${escHtml(file.owner_username || `Owner #${file.owner_id}`)}</span>
              <span class="sep">·</span>
              <span>${formatDate(file.access_granted)}</span>
            </div>
            <div class="file-meta">
              <span>Stored as a secure shared reference</span>
              <span class="sep">·</span>
              <span>${file.view_count || 0} views</span>
              <span class="sep">·</span>
              <span>${file.download_count || 0} downloads</span>
            </div>
            <div class="share-from-perms" style="margin-top:0.375rem">
              ${file.permissions.can_view ? '<span class="perm-chip">View</span>' : ''}
              ${file.permissions.can_download ? '<span class="perm-chip">Download</span>' : ''}
              ${file.permissions.can_reshare ? '<span class="perm-chip">Reshare</span>' : ''}
            </div>
          </div>
          <div class="file-actions">
            ${file.permissions.can_view ? `
              <button class="btn btn-secondary btn-sm"
                onclick='openViewModal(${file.file_id}, ${JSON.stringify(file.filename)}, "shared")'
                title="Preview in browser">View</button>
            ` : ''}
            ${file.permissions.can_download ? `
              <button class="btn btn-success btn-sm"
                onclick='openDownloadModal(${file.file_id}, ${JSON.stringify(file.filename)}, "shared")'
                title="Decrypt and download shared file">Download</button>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>`;
}

/* ════════════════════════════════════════
   ACCEPT / REJECT / REVOKE
════════════════════════════════════════ */

/**
 * Accept or reject a pending incoming share request.
 * @param {number} requestId
 * @param {'accept'|'reject'} action
 */
async function respondToShare(requestId, action) {
  if (!Number.isInteger(requestId) || requestId <= 0) {
    toast('error', 'Invalid share request', 'The request ID is missing. Refresh and try again.');
    return;
  }

  try {
    const { ok, data } = await api('POST', `/share/requests/${requestId}/${action}`);
    if (ok && data.success) {
      toast('success', `Request ${action}ed!`);
      await loadShareData();
      if (action === 'accept') switchShareTab('accessible');
    } else {
      toast('error', 'Action failed', data.error);
    }
  } catch {
    toast('error', 'Network error');
  }
}

/**
 * Revoke an accepted outgoing share (owner only).
 * @param {number} requestId
 */
async function revokeShare(requestId) {
  if (!Number.isInteger(requestId) || requestId <= 0) {
    toast('error', 'Invalid share request', 'The request ID is missing. Refresh and try again.');
    return;
  }

  try {
    const { ok, data } = await api('POST', `/share/requests/${requestId}/revoke`);
    if (ok && data.success) {
      toast('success', 'Share revoked');
      loadShareData();
    } else {
      toast('error', 'Failed to revoke', data.error);
    }
  } catch {
    toast('error', 'Network error');
  }
}

/* ════════════════════════════════════════
   STATS
════════════════════════════════════════ */

/**
 * Fetch and display sharing statistics in the stat cards.
 */
async function loadShareStats() {
  try {
    const { ok, data } = await api('GET', '/share/stats');
    if (ok && data.success) {
      const summary = data.stats.summary || {};
      const inbound = data.stats.inbound || {};
      const outbound = data.stats.outbound || {};

      document.getElementById('statSharesSent').textContent = summary.shares_sent ?? 0;
      document.getElementById('statPendingRequests').textContent = summary.pending_requests ?? 0;
      document.getElementById('statSharesAccepted').textContent = summary.accepted_shares ?? 0;
      document.getElementById('statFilesAccessible').textContent = summary.accessible_files ?? 0;
      document.getElementById('statClosedShares').textContent = summary.closed_shares ?? 0;

      document.getElementById('statSharesSentDetail').textContent =
        `${outbound.accepted ?? 0} accepted · ${outbound.pending ?? 0} pending`;
      document.getElementById('statPendingRequestsDetail').textContent =
        `${inbound.total ?? 0} total inbound requests`;
      document.getElementById('statSharesAcceptedDetail').textContent =
        `${inbound.rejected ?? 0} rejected · ${inbound.revoked ?? 0} revoked`;
      document.getElementById('statFilesAccessibleDetail').textContent =
        'Active shared references in your vault';
      document.getElementById('statClosedSharesDetail').textContent =
        `${outbound.rejected ?? 0} outgoing · ${(inbound.rejected ?? 0) + (inbound.revoked ?? 0)} incoming`;
    }
  } catch { /* non-critical */ }
}

/* ════════════════════════════════════════
   TAB SWITCHING
════════════════════════════════════════ */

/**
 * Switch between the Received / Sent / Accessible tabs.
 * @param {'received'|'sent'|'accessible'} tab
 */
function switchShareTab(tab) {
  const TABS = ['accessible', 'received', 'sent'];

  TABS.forEach(t => {
    const panelId = `shareTab${t.charAt(0).toUpperCase() + t.slice(1)}`;
    const tabId   = `tab${t.charAt(0).toUpperCase() + t.slice(1)}`;
    document.getElementById(panelId)?.classList.add('hidden');
    document.getElementById(tabId)?.classList.remove('active');
  });

  const panelId = `shareTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
  const tabId   = `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
  document.getElementById(panelId)?.classList.remove('hidden');
  document.getElementById(tabId)?.classList.add('active');

  if (tab === 'accessible' && typeof loadAccessibleFiles === 'function') {
    loadAccessibleFiles();
  }
}
