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
  connectMonitoringSocket();
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
  const ids = {
    ResponseTime: {
      value: 'metResponseTime',
      bar: 'metResponseBar',
      status: 'metResponseStatus',
    },
  };
  const resolved = ids[prefix] || {
    value: `met${prefix}`,
    bar: `met${prefix}Bar`,
    status: `met${prefix}Status`,
  };
  const valEl    = document.getElementById(resolved.value);
  const barEl    = document.getElementById(resolved.bar);
  const statusEl = document.getElementById(resolved.status);
  if (!valEl) return;

  const numVal = typeof value === 'number' ? value : parseFloat(value);
  const display = isNaN(numVal) ? '—' : numVal.toFixed(unit === 'ms' ? 0 : 1);

  valEl.innerHTML = `${display}<span class="unit">${unit}</span>`;

  // Normalise ms to a 0-100 percentage for the bar (capped at 1 000 ms = 100 %)
  const pct   = unit === 'ms' ? Math.min(100, (numVal / 1000) * 100) : numVal;
  const color = getMetricColor(pct, thresholds);

  if (barEl) {
    barEl.style.width      = Math.max(0, Math.min(100, pct)) + '%';
    barEl.style.background = color;
  }

  // Status dot colour mirrors bar
  if (statusEl) {
    statusEl.style.background = color;
    statusEl.style.boxShadow  = `0 0 6px ${color}`;
  }
}

/**
 * Fetch live metrics from the REST API and update all four cards.
 */
async function refreshMetrics() {
  const { ok, data } = await api('GET', '/monitoring/metrics/current');
  if (!ok || !data.success) {
    toast('error', 'Monitoring unavailable', data.error || 'Could not load live metrics');
    return;
  }

  const metrics = data.metrics || {};
  const cpu  = getMetricValue(metrics, 'cpu', 'cpu_usage');
  const mem  = getMetricValue(metrics, 'memory', 'usage');
  const disk = getMetricValue(metrics, 'disk', 'usage');
  const resp = getMetricValue(metrics, 'app', 'avg_response_time');

  updateMetricCard('CPU',          cpu,  '%',  { warn: 70, crit: 90 });
  updateMetricCard('Mem',          mem,  '%',  { warn: 80, crit: 95 });
  updateMetricCard('Disk',         disk, '%',  { warn: 80, crit: 90 });
  updateMetricCard('ResponseTime', resp, 'ms', { warn: 70, crit: 90 });
  updateUptime(metrics);

  refreshApiStats();
  refreshActiveAlerts();
}

function getMetricValue(metrics, type, name) {
  const item = (metrics[type] || []).find(metric => metric.name === name);
  return item ? Number(item.value) : NaN;
}

function updateUptime(metrics) {
  const uptimeHours = getMetricValue(metrics, 'system', 'uptime');
  const uptimeEl = document.getElementById('uptimeDisplay');
  if (!uptimeEl) return;
  uptimeEl.textContent = Number.isFinite(uptimeHours)
    ? `${Math.floor(uptimeHours)}h`
    : '—';
}

/* ════════════════════════════════════════
   API STATS PANEL
════════════════════════════════════════ */

/**
 * Populate the API Activity panel on the right side of the page.
 */
async function refreshApiStats() {
  const [apiStats, sessionStats] = await Promise.all([
    api('GET', '/monitoring/api-logs/summary?hours=24'),
    api('GET', '/monitoring/sessions/stats'),
  ]);

  if (apiStats.ok && apiStats.data.success) {
    const summary = apiStats.data.summary || {};
    document.getElementById('apiTotal').textContent =
      Number(summary.total_requests || 0).toLocaleString();
    document.getElementById('apiErrorRate').textContent =
      `${Number(summary.error_rate || 0).toFixed(2)}%`;
  }

  if (sessionStats.ok && sessionStats.data.success) {
    document.getElementById('activeSessions').textContent =
      Number(sessionStats.data.stats?.total_active || 0).toLocaleString();
  }

  document.getElementById('failedLogins').textContent = '—';
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
    await api('POST', `/monitoring/alerts/history/${alertId}/acknowledge`);
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
    const { ok, data } = await api('GET', '/monitoring/alerts/history/active');
    renderActiveAlerts(ok && data.alerts ? data.alerts : []);
  } catch {
    renderActiveAlerts([]);
  }
}

/* ════════════════════════════════════════
   ALERT RULES TABLE
════════════════════════════════════════ */

/**
 * Load alert rules from the monitoring API and render them in the table.
 */
async function loadAlertRules() {
  const tbody = document.getElementById('alertRulesBody');
  const { ok, data } = await api('GET', '/monitoring/alerts/rules');
  const rules = ok && data.success ? data.rules : [];

  if (!rules.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          <div class="table-empty-text">No alert rules configured</div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = rules.map(rule => {
    const condition = formatAlertCondition(rule);
    return `
    <tr>
      <td class="primary">${escHtml(rule.name)}</td>
      <td>
        <span class="font-mono text-xs" style="color:var(--navy-200)">${escHtml(rule.metric_name)}</span>
      </td>
      <td>
        <span class="font-mono text-xs">${escHtml(condition)}</span>
      </td>
      <td>
        <span class="font-mono text-xs">${escHtml(String(rule.threshold_value ?? '—'))}</span>
      </td>
      <td>
        <span class="badge ${rule.severity === 'critical' ? 'badge-red' : 'badge-amber'}">
          ${escHtml(rule.severity)}
        </span>
      </td>
      <td>
        <span class="badge ${rule.enabled ? 'badge-green' : 'badge-gray'}">
          ${rule.enabled ? '✓ Enabled' : '○ Disabled'}
        </span>
      </td>
    </tr>
  `;
  }).join('');
}

function formatAlertCondition(rule) {
  const op = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    eq: '=',
    ne: '!=',
    between: 'between',
  }[rule.alert_condition] || rule.alert_condition || '—';

  if (op === 'between') {
    return `${op} ${rule.threshold_value ?? '—'} and ${rule.threshold_max ?? '—'}`;
  }
  return `${op} ${rule.threshold_value ?? '—'}`;
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
  if (state.monitoringSocket) {
    state.monitoringSocket.disconnect();
    state.monitoringSocket = null;
  }
}

/* ════════════════════════════════════════
   WEBSOCKET (Socket.IO) — STUB
   Wire up when the backend /monitoring namespace is reachable.
════════════════════════════════════════ */

function connectMonitoringSocket() {
  if (state.monitoringSocket || typeof io !== 'function' || !state.token) return state.monitoringSocket;

  const socket = io('/monitoring', {
    query: { token: state.token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    socket.emit('subscribe', { metrics: ['cpu', 'memory', 'disk', 'response_time'] });
  });

  socket.on('metrics_update', (metrics) => {
    updateMetricCard('CPU',          getMetricValue(metrics, 'cpu', 'cpu_usage'),          '%',  { warn:70, crit:90 });
    updateMetricCard('Mem',          getMetricValue(metrics, 'memory', 'usage'),           '%',  { warn:80, crit:95 });
    updateMetricCard('Disk',         getMetricValue(metrics, 'disk', 'usage'),             '%',  { warn:80, crit:90 });
    updateMetricCard('ResponseTime', getMetricValue(metrics, 'app', 'avg_response_time'),  'ms', { warn:70, crit:90 });
    updateUptime(metrics);
  });

  socket.on('alert_triggered', () => refreshActiveAlerts());
  socket.on('alert_resolved',  () => refreshActiveAlerts());

  socket.on('disconnect', () => {
    console.warn('Monitoring socket disconnected');
    state.monitoringSocket = null;
  });

  state.monitoringSocket = socket;
  return socket;
}
