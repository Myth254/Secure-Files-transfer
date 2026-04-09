/**
 * api.js
 * Central API configuration, state management, and HTTP helpers.
 * All other modules import from here.
 */

/* ════════════════════════════════════════
   CONFIGURATION
════════════════════════════════════════ */
const API_BASE = 'http://localhost:5000/api';

/* ════════════════════════════════════════
   APPLICATION STATE
   Single source of truth for runtime data
════════════════════════════════════════ */
const state = {
  // Auth
  token:               localStorage.getItem('vaultsync_token'),
  user:                null,
  encryptedPrivateKey: localStorage.getItem('vaultsync_enc_key') || null,

  // Files
  files:         [],
  filteredFiles: [],
  sharedFiles:   [],
  currentPage:   1,
  perPage:       10,
  totalPages:    1,

  // Pending flows
  pendingOTP:      null,  // { otp_id, email, expires_in }
  pendingRegister: null,  // encrypted private key string after registration
  downloadOTP:     null,  // { otp_id, expires_in, message }
  fileActionMode:  'download', // 'view' | 'download'

  // Modal targets
  deleteTarget:         null,      // file id
  downloadTarget:       null,      // file id
  downloadTargetSource: 'owned',   // 'owned' | 'shared'

  // Polling
  metricsInterval: null,
};

/* ════════════════════════════════════════
   HTTP HELPERS
════════════════════════════════════════ */

/**
 * Make a JSON API request.
 * @param {string} method  - HTTP verb
 * @param {string} path    - API path (prefixed with API_BASE)
 * @param {object} body    - Optional JSON body
 * @param {boolean} noAuth - Skip Authorization header
 * @returns {{ ok: boolean, status: number, data: object }}
 */
async function api(method, path, body = null, noAuth = false, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (!noAuth && state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/**
 * Upload a file via multipart/form-data.
 * @param {string}   path     - API path
 * @param {FormData} formData - Form data with file field
 * @returns {{ ok: boolean, status: number, data: object }}
 */
async function apiUpload(path, formData) {
  const headers = {};
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const res  = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}
