/**
 * app.js
 * Application entry point.
 *
 * Script load order (defined in index.html):
 *   1. api.js         — state object + HTTP helpers
 *   2. ui.js          — toast, modal, formatting utilities
 *   3. auth.js        — login, OTP, register, logout
 *   4. files.js       — file list, upload, download, delete
 *   5. sharing.js     — share requests, accept/reject/revoke
 *   6. monitoring.js  — metrics cards, alert rules, polling
 *   7. profile.js     — profile update, activity log, public key
 *   8. app.js         — this file — boots the app
 *
 * All modules are plain scripts sharing the global scope.
 * In a build-tool setup (Vite/Webpack) these would be ES modules
 * with explicit imports; the logic remains identical.
 */

/**
 * Wait for loader.js to finish injecting all HTML partials,
 * then boot the application.  loader.js dispatches 'partialsReady'
 * once every partial has been fetched and inserted into the DOM.
 */
document.addEventListener('partialsReady', () => {
  /**
   * Boot sequence:
   *   - init() is defined in auth.js
   *   - It checks localStorage for a saved JWT, verifies it,
   *     and routes to either the dashboard or the login view.
   */
  init();
});