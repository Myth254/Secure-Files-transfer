/**
 * loader.js
 * Fetches every HTML partial and injects it into the DOM before
 * the application boots.  Must be the FIRST script loaded.
 *
 * Each entry defines:
 *   file    — path relative to the project root
 *   mount   — id of the element that receives the partial's innerHTML
 *   method  — 'append' (default) | 'prepend' | 'replace'
 *             'append'  → innerHTML appended to the mount element
 *             'replace' → mount element itself is replaced by the partial
 *
 * Load order matters — partials that depend on a parent being present
 * must come after it in the list.
 */

const PARTIALS = [
  // ── Auth views (injected into #authViews) ──────────────────────────
  { file: 'html/login.html',          mount: 'authViews' },
  { file: 'html/register.html',       mount: 'authViews' },
  { file: 'html/otp.html',            mount: 'authViews' },
  { file: 'html/key-backup.html',     mount: 'authViews' },

  // ── Dashboard shell pieces ─────────────────────────────────────────
  { file: 'html/sidebar.html',        mount: 'sidebarMount',  method: 'replace' },

  // ── Dashboard pages (injected into #pagesMount) ───────────────────
  { file: 'html/page-files.html',     mount: 'pagesMount' },
  { file: 'html/page-sharing.html',   mount: 'pagesMount' },
  { file: 'html/page-monitoring.html',mount: 'pagesMount' },
  { file: 'html/page-profile.html',   mount: 'pagesMount' },

  // ── Modals (appended to #modalsMount, outside any view) ──────────
  { file: 'html/modals.html',         mount: 'modalsMount' },
];

/**
 * Fetch a single partial and inject it into its mount element.
 * @param {{ file: string, mount: string, method?: string }} partial
 */
async function loadPartial({ file, mount, method = 'append' }) {
  const res  = await fetch(file);
  if (!res.ok) throw new Error(`Failed to load partial: ${file} (${res.status})`);
  const html = await res.text();
  const el   = document.getElementById(mount);
  if (!el) throw new Error(`Mount element not found: #${mount}`);

  if (method === 'replace') {
    el.outerHTML = html;   // swap the placeholder element itself
  } else if (method === 'prepend') {
    el.insertAdjacentHTML('afterbegin', html);
  } else {
    el.insertAdjacentHTML('beforeend', html);
  }
}

/**
 * Load all partials in order, then fire the 'partialsReady' event
 * so app.js knows it is safe to call init().
 */
async function loadAllPartials() {
  // Show a brief loading state in case partials are slow to fetch
  const splash = document.getElementById('loadingSplash');

  try {
    for (const partial of PARTIALS) {
      await loadPartial(partial);
    }
  } catch (err) {
    console.error('[loader] Partial load failed:', err);
    if (splash) {
      splash.innerHTML = `
        <div style="color:var(--red-400); font-family:var(--font-mono); font-size:.875rem">
          ⚠ Failed to load UI: ${err.message}<br>
          <small>Make sure you're serving from a web server (not file://)</small>
        </div>`;
    }
    return;
  }

  if (splash) splash.remove();

  // Signal app.js that DOM is fully assembled
  document.dispatchEvent(new Event('partialsReady'));
}

// Start loading as soon as this script runs
loadAllPartials();