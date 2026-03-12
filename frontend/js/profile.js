/**
 * profile.js
 * Account settings: display profile info, update email/password,
 * view activity log, and inspect the user's RSA public key.
 */

/* ════════════════════════════════════════
   LOAD PROFILE DATA
════════════════════════════════════════ */

/**
 * Fetch the current user's profile and populate the settings page.
 */
async function loadProfile() {
  try {
    const { ok, data } = await api('GET', '/user');
    if (!ok || !data.success) return;

    const u        = data.user;
    const initials = u.username.substring(0, 2).toUpperCase();

    document.getElementById('profileName').textContent    = u.username;
    document.getElementById('profileEmail').textContent   = u.email;
    document.getElementById('profileCreated').textContent = `Member since ${formatDate(u.created_at)}`;

    // Keep avatar initials in sync across sidebar and profile page
    document.getElementById('profileAvatar').textContent  = initials;
    document.getElementById('sidebarAvatar').textContent  = initials;
    document.getElementById('sidebarUsername').textContent = u.username;
  } catch { /* non-critical — page still usable without this data */ }
}

/* ════════════════════════════════════════
   UPDATE PROFILE
════════════════════════════════════════ */

/**
 * Submit profile changes (new email and/or new password).
 * Current password is always required when making changes.
 */
async function handleProfileUpdate() {
  const newEmail   = document.getElementById('profileNewEmail').value.trim();
  const currentPass = document.getElementById('profileCurrentPass').value;
  const newPass    = document.getElementById('profileNewPass').value;
  const alertEl    = document.getElementById('profileUpdateAlert');

  // Nothing to save
  if (!newEmail && !newPass) {
    alertEl.className   = 'alert alert-warning';
    alertEl.textContent = 'No changes to save.';
    alertEl.classList.remove('hidden');
    return;
  }

  // Current password required for any change
  if (!currentPass) {
    alertEl.className   = 'alert alert-error';
    alertEl.textContent = 'Current password is required to save changes.';
    alertEl.classList.remove('hidden');
    return;
  }

  // Build request payload — only include fields that are changing
  const payload = { current_password: currentPass };
  if (newEmail) payload.email        = newEmail;
  if (newPass)  payload.new_password = newPass;

  try {
    const { ok, data } = await api('PUT', '/user/update', payload);

    if (ok && data.success) {
      alertEl.className   = 'alert alert-success';
      alertEl.textContent = 'Profile updated successfully.';
      alertEl.classList.remove('hidden');

      // Clear sensitive fields
      document.getElementById('profileCurrentPass').value = '';
      document.getElementById('profileNewPass').value     = '';

      // Reflect email change immediately
      if (newEmail) {
        document.getElementById('profileEmail').textContent = newEmail;
        document.getElementById('profileNewEmail').value   = '';
      }

      toast('success', 'Profile updated');
    } else {
      alertEl.className   = 'alert alert-error';
      alertEl.textContent = data.error || 'Update failed.';
      alertEl.classList.remove('hidden');
    }
  } catch {
    alertEl.className   = 'alert alert-error';
    alertEl.textContent = 'Network error. Please try again.';
    alertEl.classList.remove('hidden');
  }
}

/* ════════════════════════════════════════
   ACTIVITY LOG
════════════════════════════════════════ */

/** Maps action strings to badge colour classes. */
const ACTION_BADGE_MAP = {
  login:          'badge-green',
  logout:         'badge-gray',
  upload:         'badge-blue',
  download:       'badge-blue',
  delete:         'badge-red',
  register:       'badge-green',
  update_profile: 'badge-amber',
  share_request:  'badge-blue',
  share_accept:   'badge-green',
  share_reject:   'badge-red',
  share_revoke:   'badge-red',
};

/**
 * Fetch and render the last 20 activity log entries.
 */
async function loadActivity() {
  const tbody = document.getElementById('activityBody');

  try {
    const { ok, data } = await api('GET', '/user/activity?limit=20');

    if (ok && data.success && data.activity.length) {
      tbody.innerHTML = data.activity.map(a => `
        <tr>
          <td>
            <span class="badge ${ACTION_BADGE_MAP[a.action] || 'badge-gray'}">
              ${escHtml(a.action)}
            </span>
          </td>
          <td class="text-secondary">${escHtml(a.details || '—')}</td>
          <td class="font-mono text-xs text-muted">${escHtml(a.ip_address || '—')}</td>
          <td class="font-mono text-xs text-muted">${formatDate(a.timestamp)}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="table-empty">
            <div class="table-empty-text">No activity recorded</div>
          </td>
        </tr>`;
    }
  } catch {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="table-empty">
          <div class="table-empty-text">Failed to load activity</div>
        </td>
      </tr>`;
  }
}

/* ════════════════════════════════════════
   PUBLIC KEY VIEWER
════════════════════════════════════════ */

/**
 * Fetch the current user's RSA public key and display it in a modal.
 */
async function showPublicKey() {
  try {
    const { ok, data } = await api('GET', '/user/public_key');

    if (ok && data.success) {
      document.getElementById('publicKeyDisplay').textContent = data.public_key;
      openModal('pubKeyModal');
    } else {
      toast('error', 'Failed to load public key', data.error || '');
    }
  } catch {
    toast('error', 'Failed to load public key');
  }
}