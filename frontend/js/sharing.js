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
  loadShareRequests('recipient');  // Requests addressed to me
  loadShareRequests('owner');      // Requests I sent
  loadShareStats();
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

  const payload = {
    file_id:            parseInt(fileId, 10),
    recipient_username: recipient,
    can_view:           true,  // always enabled
    can_download:       document.getElementById('permDownload').checked,
    can_reshare:        document.getElementById('permReshare').checked,
    expires_days:       document.getElementById('shareExpiry').value
      ? parseInt(document.getElementById('shareExpiry').value, 10)
      : null,
  };

  try {
    const { ok, data } = await api('POST', '/share/request', payload);

    if (ok && data.success) {
      closeModal('shareModal');
      toast('success', 'Share request sent!', `Request sent to ${recipient}.`);
      loadShareData();
    } else {
      alertEl.className   = 'alert alert-error';
      alertEl.textContent = data.error || 'Failed to create share request.';
      alertEl.classList.remove('hidden');
    }
  } catch {
    alertEl.className   = 'alert alert-error';
    alertEl.textContent = 'Network error. Please try again.';
    alertEl.classList.remove('hidden');
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

    const requests = data.share_requests || [];

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
    container.innerHTML = `
      <div class="table-empty">
        <div class="table-empty-icon">${icons[type] || '📋'}</div>
        <div class="table-empty-text">No ${type} share requests</div>
      </div>`;
    return;
  }

  const statusBadge = {
    accepted: 'badge-green',
    rejected: 'badge-red',
    revoked:  'badge-gray',
    pending:  'badge-amber',
  };

  container.innerHTML = requests.map(r => `
    <div class="share-request-card" style="margin-bottom:0.625rem">
      <div class="file-icon file-icon-default">📄</div>
      <div class="share-from">
        <div class="share-from-name">File #${r.file_id}</div>
        <div class="share-from-file">
          ${type === 'received' ? `From: Owner #${r.owner_id}` : `To: User #${r.recipient_id}`}
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
          <button class="btn btn-success btn-sm" onclick="respondToShare(${r.id}, 'accept')">✓ Accept</button>
          <button class="btn btn-danger btn-sm"  onclick="respondToShare(${r.id}, 'reject')">✗ Reject</button>
        ` : ''}

        ${type === 'sent' && r.status === 'accepted' ? `
          <button class="btn btn-danger btn-sm" onclick="revokeShare(${r.id})">Revoke</button>
        ` : ''}
      </div>
    </div>
  `).join('');
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
  try {
    const { ok, data } = await api('POST', `/share/requests/${requestId}/${action}`);
    if (ok && data.success) {
      toast('success', `Request ${action}ed!`);
      loadShareData();
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
      document.getElementById('statSharesSent').textContent      = data.stats.shares_sent;
      document.getElementById('statSharesAccepted').textContent  = data.stats.shares_accepted;
      document.getElementById('statSharesReceived').textContent  = data.stats.shares_received;
      document.getElementById('statFilesAccessible').textContent = data.stats.files_accessible;
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
  const TABS = ['received', 'sent', 'accessible'];

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
}