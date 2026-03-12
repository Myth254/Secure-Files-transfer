/**
 * monitoring.js
 * Real-time system monitoring: metric cards, alert rules table,
 * active alerts panel, API stats, and polling lifecycle.
 *
 * WebSocket integration point:
 *   Connect to Socket.IO namespace /monitoring (see socket_events.py).
 *   Events: subscribe → metric_update, alert_triggered, alert_resolved
 *   Current implementation polls via REST every 30 s as a fallback.
 */

/* ════════════════════════════════════════
   PAGE ENTRY
════════════════════════════════════════ */

/**
 * Called by the router when the Monitoring page is activated.
 * Performs an initial data load and starts the polling loop.
 */
function loadMonitoring() {
  refreshMetrics();
  loadAlertRules();
}

/* ════════════════════════════════════════
   METRIC CARDS
════════════════════════════════════════ */

/**
 * Determine bar/status colour based on a normalised 0-100 value.
 * @param {number} value
 * @param {{ warn: number, crit: number }} thresholds
 * @returns {string} CSS colour value
 */
function getMetricColor(value, thresholds = { warn: 70, crit: 90 }) {
  if (value >= thresholds.crit) return 'var(--red-500)';
  if (value >= thresholds.warn) return 'var(--amber-500)';
  return 'var(--navy-400)';
}

/**
 * Update a single metric card (value label, progress bar, status dot).
 *
 * @param {string} prefix       - Card id prefix, e.g. 'CPU' → #metCPU, #metCPUBar, #metCPUStatus
 * @param {number} value        - Raw metric value
 * @param {string} unit         - Display unit, e.g. '%' or 'ms'
 * @param {{ warn, crit }} thresholds
 */
function updateMetricCard(prefix, value, unit, thresholds) {
  const valEl    = document.getElementById(`met${prefix}`);
  const barEl    = document.getElementById(`met${prefix}Bar`);
  const statusEl = document.getElementById(`met${prefix}Status`);
  if (!valEl) return;

  const numVal = typeof value === 'number' ? value : parseFloat(value);
  const display = isNaN(numVal) ? '—' : numVal.toFixed(unit === 'ms' ? 0 : 1);

  valEl.innerHTML = `${display}<span class="unit">${unit}</span>`;

  // Normalise ms to a 0-100 percentage for the bar (capped at 1 000 ms = 100 %)
  const pct   = unit === 'ms' ? Math.min(100, (numVal / 1000) * 100) : numVal;
  const color = getMetricColor(pct, thresholds);

  barEl.style.width      = Math.max(0, Math.min(100, pct)) + '%';
  barEl.style.background = color;

  // Status dot colour mirrors bar
  statusEl.style.background = color;
  statusEl.style.boxShadow  = `0 0 6px ${color}`;
}

/**
 * Fetch live metrics from the REST API and update all four cards.
 * Replace the simulated values below with real API calls once the
 * /monitoring/metrics endpoint is available.
 */
async function refreshMetrics() {
  /*
   * TODO: Replace simulation with:
   *   const { ok, data } = await api('GET', '/monitoring/metrics/current');
   *   if (ok) { updateMetricCard('CPU', data.cpu_usage, '%', ...); ... }
   */

  // ── Simulated live data (remove when wiring real API) ──
  const cpu  = 15 + Math.random() * 35;
  const mem  = 45 + Math.random() * 25;
  const disk = 62 + Math.random() * 10;
  const resp = 80 + Math.random() * 200;

  updateMetricCard('CPU',          cpu,  '%',  { warn: 70, crit: 90 });
  updateMetricCard('Mem',          mem,  '%',  { warn: 80, crit: 95 });
  updateMetricCard('Disk',         disk, '%',  { warn: 80, crit: 90 });
  updateMetricCard('ResponseTime', resp, 'ms', { warn: 70, crit: 90 });

  refreshApiStats();
  refreshActiveAlerts();
}

/* ════════════════════════════════════════
   API STATS PANEL
════════════════════════════════════════ */

/**
 * Populate the API Activity panel on the right side of the page.
 * TODO: Replace simulation with a real /monitoring/stats endpoint.
 */
function refreshApiStats() {
  document.getElementById('apiTotal').textContent       = (Math.floor(Math.random() * 500) + 100).toLocaleString();
  document.getElementById('apiErrorRate').textContent   = (Math.random() * 2).toFixed(2) + '%';
  document.getElementById('activeSessions').textContent = Math.floor(Math.random() * 15) + 1;
  document.getElementById('uptimeDisplay').textContent  = '99.98%';
  document.getElementById('failedLogins').textContent   = Math.floor(Math.random() * 5);
}

/* ════════════════════════════════════════
   ACTIVE ALERTS PANEL
════════════════════════════════════════ */

/**
 * Render the active alerts panel.
 * @param {Array} alerts - Array of alert objects (empty = all clear)
 */
function renderActiveAlerts(alerts = []) {
  const container  = document.getElementById('activeAlertsContainer');
  const countEl    = document.getElementById('activeAlertsCount');
  const critBadge  = document.getElementById('criticalBadge');

  if (!alerts.length) {
    countEl.textContent        = 'All systems nominal';
    critBadge.style.display    = 'none';
    container.innerHTML        = `
      <div class="table-empty" style="padding:1.5rem">
        <div class="table-empty-icon" style="font-size:1.75rem">✅</div>
        <div class="table-empty-text">No active alerts</div>
      </div>`;
    return;
  }

  const critCount = alerts.filter(a => a.severity === 'critical').length;
  countEl.textContent = `${alerts.length} active alert${alerts.length > 1 ? 's' : ''}`;

  if (critCount > 0) {
    critBadge.style.display = '';
    critBadge.textContent   = `${critCount} critical`;
  } else {
    critBadge.style.display = 'none';
  }

  const ICONS = { critical: '🔴', warning: '🟡', info: 'ℹ️' };

  container.innerHTML = alerts.map(a => `
    <div class="alert-item ${a.severity}">
      <span class="alert-item-icon">${ICONS[a.severity] || 'ℹ️'}</span>
      <div style="flex:1">
        <div class="alert-item-title">${escHtml(a.name)}</div>
        <div class="alert-item-msg">${escHtml(a.message || '')}</div>
        <div class="alert-item-time">${a.triggered_at ? formatDate(a.triggered_at) : ''}</div>
      </div>
      <div class="alert-item-actions">
        <button class="btn btn-ghost btn-sm"
          onclick="acknowledgeAlert(${a.id})"
          title="Acknowledge">✓</button>
      </div>
    </div>
  `).join('');
}

/**
 * Acknowledge an alert (sends event via WebSocket when connected).
 * @param {number} alertId
 */
async function acknowledgeAlert(alertId) {
  try {
    await api('POST', `/monitoring/alerts/${alertId}/acknowledge`);
    toast('info', 'Alert acknowledged');
    refreshMetrics();
  } catch {
    toast('error', 'Failed to acknowledge alert');
  }
}

/**
 * Refresh active alerts from the API.
 * Falls back to "all clear" display on any error.
 */
async function refreshActiveAlerts() {
  try {
    const { ok, data } = await api('GET', '/monitoring/alerts/active');
    renderActiveAlerts(ok && data.alerts ? data.alerts : []);
  } catch {
    renderActiveAlerts([]);
  }
}

/* ════════════════════════════════════════
   ALERT RULES TABLE
════════════════════════════════════════ */

/**
 * Load alert rules from config and render them in the table.
 * TODO: Replace hardcoded rules with GET /monitoring/alert-rules.
 */
function loadAlertRules() {
  // Default rules matching init_monitoring.py / config.py thresholds
  const rules = [
    { name: 'High CPU Usage',     metric: 'cpu_usage',         condition: '> 80%',  threshold: '80%',   severity: 'warning',  enabled: true  },
    { name: 'Critical CPU',       metric: 'cpu_usage',         condition: '> 95%',  threshold: '95%',   severity: 'critical', enabled: true  },
    { name: 'High Memory',        metric: 'memory_usage',      condition: '> 85%',  threshold: '85%',   severity: 'warning',  enabled: true  },
    { name: 'Low Disk Space',     metric: 'disk_usage',        condition: '> 90%',  threshold: '90%',   severity: 'critical', enabled: true  },
    { name: 'Slow API Response',  metric: 'avg_response_time', condition: '> 500ms',threshold: '500ms', severity: 'warning',  enabled: true  },
    { name: 'High Error Rate',    metric: 'error_rate',        condition: '> 5%',   threshold: '5%',    severity: 'critical', enabled: true  },
    { name: 'Failed Logins',      metric: 'failed_logins',     condition: '> 10',   threshold: '10',    severity: 'warning',  enabled: true  },
    { name: 'No Active Users',    metric: 'active_sessions',   condition: '= 0',    threshold: '0',     severity: 'warning',  enabled: false },
  ];

  const tbody = document.getElementById('alertRulesBody');

  tbody.innerHTML = rules.map(r => `
    <tr>
      <td class="primary">${escHtml(r.name)}</td>
      <td>
        <span class="font-mono text-xs" style="color:var(--navy-200)">${escHtml(r.metric)}</span>
      </td>
      <td>
        <span class="font-mono text-xs">${escHtml(r.condition)}</span>
      </td>
      <td>
        <span class="font-mono text-xs">${escHtml(r.threshold)}</span>
      </td>
      <td>
        <span class="badge ${r.severity === 'critical' ? 'badge-red' : 'badge-amber'}">
          ${r.severity}
        </span>
      </td>
      <td>
        <span class="badge ${r.enabled ? 'badge-green' : 'badge-gray'}">
          ${r.enabled ? '✓ Enabled' : '○ Disabled'}
        </span>
      </td>
    </tr>
  `).join('');
}

/* ════════════════════════════════════════
   POLLING LIFECYCLE
════════════════════════════════════════ */

/** Start polling metrics every 30 seconds. */
function startMetricsPolling() {
  stopMetricsPolling();
  state.metricsInterval = setInterval(refreshMetrics, 30_000);
}

/** Stop the metrics polling loop. */
function stopMetricsPolling() {
  if (state.metricsInterval) {
    clearInterval(state.metricsInterval);
    state.metricsInterval = null;
  }
}

/* ════════════════════════════════════════
   WEBSOCKET (Socket.IO) — STUB
   Wire up when the backend /monitoring namespace is reachable.
════════════════════════════════════════ */

/*
function connectMonitoringSocket() {
  const socket = io('/monitoring', {
    auth: { token: state.token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    socket.emit('subscribe', { metrics: ['cpu', 'memory', 'disk', 'response_time'] });
  });

  socket.on('metric_update', (data) => {
    updateMetricCard('CPU',          data.cpu_usage,        '%',  { warn:70, crit:90 });
    updateMetricCard('Mem',          data.memory_usage,     '%',  { warn:80, crit:95 });
    updateMetricCard('Disk',         data.disk_usage,       '%',  { warn:80, crit:90 });
    updateMetricCard('ResponseTime', data.avg_response_ms,  'ms', { warn:70, crit:90 });
  });

  socket.on('alert_triggered', () => refreshActiveAlerts());
  socket.on('alert_resolved',  () => refreshActiveAlerts());

  socket.on('disconnect', () => console.warn('Monitoring socket disconnected'));

  return socket;
}
*/