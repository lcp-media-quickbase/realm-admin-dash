/* ═══════════════════════════════════════════════════════════
   LCP QuickBase Dashboard — Boilerplate Shared Module

   SETUP CHECKLIST:
   1. Set QB_REALM and QB_APP to your QuickBase app
   2. Populate TABLES with your table DBIDs
   3. Populate FIELD with your field ID maps
   4. Update ROLE IDs and ROLE_NAMES to match your app's roles
   5. Set APP_NAME (and optionally LOGO_DARK / LOGO_LIGHT)
   ═══════════════════════════════════════════════════════════ */

// ─── APP CONFIG ──────────────────────────────────────────────
var APP_NAME    = 'Realm Admin';   // Shown in the app header
var APP_VERSION = 'v1.0.0';
// Logo image URLs — leave as empty strings for text-only header
var LOGO_DARK  = '';  // White/light lockup shown in dark mode
var LOGO_LIGHT = '';  // Color lockup shown in light mode

// ─── QUICKBASE CONFIG ────────────────────────────────────────
var QB_REALM = 'lcpmedia.quickbase.com';
// Auto-detect realm when running on a QB Code Page
if (typeof window !== 'undefined' && window.location.hostname.endsWith('.quickbase.com')) {
  QB_REALM = window.location.hostname;
}
var QB_APP = 'btnit6q26';   // App DBID from the QB URL

// ─── TABLES ──────────────────────────────────────────────────
// Add your QuickBase table DBIDs here.
// Example:
//   var TABLES = {
//     users:    'abc12345',
//     projects: 'def67890',
//   };
var TABLES = {
  projects:  'btnit6q27',
  releases:  'bt8p9fz7x',
  tasks:     'btnit6q3m',
  realmLogs: 'bt8sr94e9',
  apps:      'bu83a2h8x',
  notes:          'bvx6b5a7u',
  calendarEvents: 'bvx6cvnp9',
};

// ─── FIELDS ──────────────────────────────────────────────────
// Map field IDs per table. Group by table name in ALLCAPS.
// Example:
//   var FIELD = {
//     USERS:    { id: 3, name: 6, email: 7, active: 8 },
//     PROJECTS: { id: 3, name: 6, stage: 7 },
//   };
var FIELD = {
  PROJECTS: {
    name:          16,
    status:        28,
    priority:      27,
    description:   63,
    estStartDate:  23,
    estEndDate:    24,
  },
  RELEASES: {
    releaseName:        30,
    relatedProject:     45,
    userStories:         9,
    inProduction:       31,
    futureReleaseNotes: 44,
    relatedApp:         54,
    acceptanceCriteria:  8,
    internalDocs:       33,
    startDate:          59,
    estEndDate:         60,
  },
  TASKS: {
    id:              3,
    name:            6,
    assignedTo:    125,
    status:         12,
    priority:       13,
    dateComplete:   99,
    description:     7,
    historyNotes:   55,
    relatedProject: 48,
    releasedRelease: 149,
    system:         142,
    startDate:      153,
    estEndDate:     154,
    relatedCalEvent: 157,
  },
  REALM_LOGS: {
    dateCreated:     1,
    dateModified:    2,
    lastModifiedBy:  5,
    details:        10,
    action:         11,
    relatedApp:     50,
    appName:        51,
    relatedUser:    48,
    userFirstName:  52,
    userLastName:   53,
    accessUserName: 56,
    accessPermission: 57,
  },
  APPS: {
    id:             6,
    name:           7,
    openToInternet:  8,
  },
  NOTES: {
    name:              6,
    description:       7,
    relatedTask:       9,
    relatedProject:    11,
    relatedCalEvent:   13,
  },
  CALENDAR_EVENTS: {
    title:     6,
    date:      7,
    startTime: 8,
    endTime:   9,
  },
};

// ─── ROLES ───────────────────────────────────────────────────
// Match role IDs to your QB app's role configuration.
// Found in QuickBase: App Settings → Roles & Access
var ROLE = {
  ADMINISTRATOR:     16,
  TEAM_MEMBER:       24,
  TICKET_SUBMISSION: 28,
  EXECUTIVE:         29,
  LEADERSHIP_TEAM:   30,
};

// Human-readable names used in the ViewAs dropdown and test banner
var ROLE_NAMES = {
  16: 'Administrator',
  24: 'TeamMember - Diana',
  28: 'Ticket Submission',
  29: 'Executive',
  30: 'Leadership Team',
};

console.log('%c[LCP Dashboard] ' + APP_NAME + ' ' + APP_VERSION, 'color:#68B6E5;font-weight:bold');

// ─── UTILITY CONSTANTS ───────────────────────────────────────
var DOW         = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── SVG LINE ICONS ──────────────────────────────────────────
var ICONS = {
  scheduler:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>',
  vacations:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  preproduction: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="8.5" y1="2" x2="8.5" y2="22"/><line x1="15.5" y1="2" x2="15.5" y2="22"/><rect x="3.5" y="5" width="3.5" height="6" rx="1"/><rect x="10" y="5" width="3.5" height="4" rx="1"/><rect x="17" y="5" width="3.5" height="8" rx="1"/></svg>',
  quotes:        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  reports:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  timesheets:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  admin:         '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  sun:           '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  moon:          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
  ticket:        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
};

// ─── THEME ───────────────────────────────────────────────────
function toggleTheme() {
  var html = document.documentElement;
  var next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  if (next === 'dark') html.removeAttribute('data-theme');
  else html.setAttribute('data-theme', 'light');
  try { localStorage.setItem('qb-app-theme', next); } catch(e) {}
  var icon = document.getElementById('themeIcon');
  if (icon) icon.innerHTML = next === 'light' ? ICONS.moon : ICONS.sun;
  var label = document.getElementById('themeLabel');
  if (label) label.textContent = next === 'light' ? 'Dark Mode' : 'Light Mode';
  // Update logo src if logo URLs are configured
  var logo = document.getElementById('appLogo');
  if (logo) {
    var src = next === 'light' ? (LOGO_LIGHT || LOGO_DARK) : (LOGO_DARK || LOGO_LIGHT);
    if (src) logo.src = src;
  }
}

// Restore saved theme on load
(function() {
  try {
    var saved = localStorage.getItem('qb-app-theme');
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  } catch(e) {}
})();

// ─── AUTH ─────────────────────────────────────────────────────
var _authMode  = null;   // 'session' | 'token'
var _userToken = '';

// Temp token cache: { tableId: { token, expiresAt } }
var _tempTokens = {};
var TEMP_TOKEN_LIFETIME = 4 * 60 * 1000; // Refresh at 4 min (QB expires at 5 min)

/**
 * Detect environment and initialise auth.
 *
 * QB Code Page (*.quickbase.com):
 *   → Acquires per-table temporary tokens via QB session cookie
 *   → QB enforces role permissions on every API call
 *
 * Local dev:
 *   → Prompts for a QB-USER-TOKEN (stored in sessionStorage for the tab's lifetime)
 */
function initAuth() {
  const hostname = window.location.hostname;
  const isQBOrigin = hostname === QB_REALM || hostname.endsWith('.quickbase.com');

  if (isQBOrigin) {
    _authMode = 'session';
    console.log('[Auth] QB Code Page detected — using temporary tokens.');
    console.log('[Auth] Data access governed by the logged-in user\'s role permissions.');
    return true;
  }

  _authMode = 'token';
  const params = new URLSearchParams(window.location.search);
  _userToken = params.get('token') || '';
  if (!_userToken) _userToken = sessionStorage.getItem('lcp_qb_token') || '';
  if (!_userToken) _userToken = prompt('Enter QuickBase User Token (local dev):') || '';
  if (_userToken) {
    sessionStorage.setItem('lcp_qb_token', _userToken);
    console.log('[Auth] Token mode — using explicit user token.');
    return true;
  }
  console.error('[Auth] No authentication method available.');
  return false;
}

async function _getTempToken(tableId) {
  const cached = _tempTokens[tableId];
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const resp = await fetch(
    `https://api.quickbase.com/v1/auth/temporary/${tableId}`,
    { method: 'GET', headers: { 'QB-Realm-Hostname': QB_REALM, 'Content-Type': 'application/json' }, credentials: 'include' }
  );
  if (!resp.ok) {
    if (resp.status === 401) showToast('Session expired — please refresh the page.', 'error');
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `Auth error ${resp.status}`);
  }
  const data = await resp.json();
  const token = data.temporaryAuthorization;
  _tempTokens[tableId] = { token, expiresAt: Date.now() + TEMP_TOKEN_LIFETIME };
  console.log(`[Auth] Temp token acquired for table ${tableId}`);
  return token;
}

async function _qbHeaders(tableId) {
  const headers = { 'QB-Realm-Hostname': QB_REALM, 'Content-Type': 'application/json' };
  if (_authMode === 'session') {
    headers['Authorization'] = 'QB-TEMP-TOKEN ' + await _getTempToken(tableId);
  } else if (_authMode === 'token' && _userToken) {
    headers['Authorization'] = 'QB-USER-TOKEN ' + _userToken;
  }
  return headers;
}

async function _fetchOpts(method, body, tableId) {
  const headers = await _qbHeaders(tableId);
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  return opts;
}

async function _handleError(resp, tableId) {
  const err = await resp.json().catch(() => ({}));
  const msg = err.description || err.message || `API error ${resp.status}`;
  if (resp.status === 401) {
    if (tableId) delete _tempTokens[tableId];
    showToast('Session expired — please refresh the page.', 'error');
  } else if (resp.status === 403) {
    showToast('Permission denied — your role doesn\'t allow this action.', 'error');
  }
  throw new Error(msg);
}

// ─── QB API CLIENT ────────────────────────────────────────────
async function qbQuery(tableId, select, where, sortBy, top=500, skip=0) {
  const body = { from: tableId, select, options: { skip, top } };
  if (where) body.where = where;
  if (sortBy) body.sortBy = sortBy;
  const resp = await fetch('https://api.quickbase.com/v1/records/query', await _fetchOpts('POST', body, tableId));
  if (!resp.ok) await _handleError(resp, tableId);
  const data = await resp.json();
  return { records: data.data || [], metadata: data.metadata || {} };
}

async function qbQueryAll(tableId, select, where, sortBy) {
  let all = [], skip = 0;
  while (true) {
    const { records, metadata } = await qbQuery(tableId, select, where, sortBy, 500, skip);
    all = all.concat(records);
    if (all.length >= (metadata.totalRecords || 0)) break;
    skip += 500;
  }
  return all;
}

async function qbUpsert(tableId, records, fieldsToReturn) {
  const body = { to: tableId, data: records };
  if (fieldsToReturn) body.fieldsToReturn = fieldsToReturn;
  const resp = await fetch('https://api.quickbase.com/v1/records', await _fetchOpts('POST', body, tableId));
  if (!resp.ok) await _handleError(resp, tableId);
  return resp.json();
}

async function qbDelete(tableId, where) {
  const resp = await fetch('https://api.quickbase.com/v1/records', await _fetchOpts('DELETE', { from: tableId, where }, tableId));
  if (!resp.ok) await _handleError(resp, tableId);
  return resp.json();
}

// ─── UTILITIES ────────────────────────────────────────────────
/** Extract a field value from a QB record row */
function val(record, fieldId) {
  const v = record[fieldId]?.value;
  if (v == null) return '';
  if (typeof v === 'object') return v.name || v.email || JSON.stringify(v);
  return v;
}

function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function parseDate(s) {
  if (!s) return null;
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function addDays(d, n)    { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function daysBetween(a,b) { return Math.round((b-a)/86400000); }
function getMonday(d) {
  const dt = new Date(d), day = dt.getDay();
  dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
  dt.setHours(0,0,0,0);
  return dt;
}
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ─── TOAST NOTIFICATIONS ──────────────────────────────────────
function showToast(message, type='info') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const colors = { info:'var(--accent)', success:'var(--success)', error:'var(--danger)', warning:'var(--warning)' };
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position:fixed; bottom:20px; right:20px; z-index:9999;
    padding:10px 18px; border-radius:8px; font-size:13px; font-weight:500;
    background:var(--surface); border:1px solid ${colors[type]||colors.info};
    color:${colors[type]||colors.info}; box-shadow:0 4px 20px rgba(0,0,0,0.4);
    animation: toastIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.3s'; setTimeout(()=>toast.remove(),300); }, 3000);
}
var _toastStyle = document.createElement('style');
_toastStyle.textContent = '@keyframes toastIn { from { transform:translateY(10px);opacity:0 } to { transform:translateY(0);opacity:1 } }';
document.head.appendChild(_toastStyle);

// ─── SHARED EDIT MODAL ───────────────────────────────────────
// Opens an edit form for a task, project, or release.
// item     — the local data object (will be mutated on save)
// onAfterSave — callback to re-render the calling tab
var _EDIT_PALETTE = ['#82c96a','#e8a860','#e86060','#60d4c8','#e860a8','#e8d060','#6a9be8'];
window._openEditModal = function(type, item, onAfterSave) {
  var isTask    = type === 'task';
  var isRelease = type === 'release';
  var title     = isTask ? 'Edit Task' : isRelease ? 'Edit Release' : 'Edit Project';
  var color     = isTask    ? '#68B6E5'
                : isRelease ? '#e8a860'
                : _EDIT_PALETTE[item.id % _EDIT_PALETTE.length];

  function row(lbl, fid, value, inputType) {
    inputType = inputType || 'text';
    return '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<label style="font-size:11px;color:var(--text-muted)">' + lbl + '</label>' +
      '<input id="iem-' + fid + '" type="' + inputType + '" value="' + escapeHtml(value || '') + '" ' +
        'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
          'padding:7px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
    '</div>';
  }

  function selectRow(lbl, fid, value, options) {
    return '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<label style="font-size:11px;color:var(--text-muted)">' + lbl + '</label>' +
      '<select id="iem-' + fid + '" ' +
        'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
          'padding:7px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
        options.map(function(o) {
          return '<option value="' + escapeHtml(o) + '"' + (o === value ? ' selected' : '') + '>' + escapeHtml(o) + '</option>';
        }).join('') +
      '</select>' +
    '</div>';
  }

  var statusOptions   = isTask ? ['Open','In Progress','Blocked','Complete','On Hold']
                               : ['Active','In Progress','On Hold','Complete','Cancelled'];
  var priorityOptions = ['01-Critical','02-High','03-Medium','04-Low'];

  var fields = isTask
    ? row('Name',           'name',         item.name) +
      selectRow('Status',   'status',       item.status,   statusOptions) +
      selectRow('Priority', 'priority',     item.priority, priorityOptions) +
      row('Assigned To',    'assignedTo',   item.assignedTo) +
      row('Start Date',     'startDate',   (item.startDate   || '').split('T')[0], 'date') +
      row('Est End Date',   'estEndDate',  (item.estEndDate  || '').split('T')[0], 'date')
    : isRelease
    ? row('Release Name',   'name',         item.name) +
      row('Start Date',     'startDate',   (item.startDate   || '').split('T')[0], 'date') +
      row('Est End Date',   'estEndDate',  (item.estEndDate  || '').split('T')[0], 'date')
    : row('Name',             'name',         item.name) +
      selectRow('Status',     'status',       item.status,   statusOptions) +
      selectRow('Priority',   'priority',     item.priority, priorityOptions) +
      row('Est Start Date',   'estStartDate', (item.estStartDate || '').split('T')[0], 'date') +
      row('Est End Date',     'estEndDate',   (item.estEndDate   || '').split('T')[0], 'date');

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-top:3px solid ' + color + ';' +
      'border-radius:10px;padding:24px;width:400px;display:flex;flex-direction:column;gap:14px;max-height:90vh;overflow-y:auto">' +
      '<div style="font-size:15px;font-weight:600;color:var(--text)">' + title + '</div>' +
      fields +
      '<div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px">' +
        '<button class="btn btn-sm" id="iem-cancel">Cancel</button>' +
        '<button class="btn btn-sm btn-primary" id="iem-save">Save</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  document.getElementById('iem-cancel').onclick = function() { document.body.removeChild(modal); };

  document.getElementById('iem-save').onclick = async function() {
    function fval(fid) { var el = document.getElementById('iem-' + fid); return el ? el.value.trim() : ''; }
    try {
      var updated = {};
      if (isTask) {
        var rec = {
          3:                        { value: item.id },
          [FIELD.TASKS.name]:       { value: fval('name') },
          [FIELD.TASKS.status]:     { value: fval('status') },
          [FIELD.TASKS.priority]:   { value: fval('priority') },
          [FIELD.TASKS.assignedTo]: { value: fval('assignedTo') },
        };
        if (fval('startDate'))  rec[FIELD.TASKS.startDate]  = { value: fval('startDate') };
        if (fval('estEndDate')) rec[FIELD.TASKS.estEndDate]  = { value: fval('estEndDate') };
        await qbUpsert(TABLES.tasks, [rec], [3]);
        updated = { name: fval('name'), status: fval('status'), priority: fval('priority'),
          assignedTo: fval('assignedTo'), startDate: fval('startDate'), estEndDate: fval('estEndDate') };
      } else if (isRelease) {
        var rec = {
          3:                            { value: item.id },
          [FIELD.RELEASES.releaseName]: { value: fval('name') },
        };
        if (fval('startDate'))  rec[FIELD.RELEASES.startDate]  = { value: fval('startDate') };
        if (fval('estEndDate')) rec[FIELD.RELEASES.estEndDate]  = { value: fval('estEndDate') };
        await qbUpsert(TABLES.releases, [rec], [3]);
        updated = { name: fval('name'), startDate: fval('startDate'), estEndDate: fval('estEndDate') };
      } else {
        var rec = {
          3:                             { value: item.id },
          [FIELD.PROJECTS.name]:         { value: fval('name') },
          [FIELD.PROJECTS.status]:       { value: fval('status') },
          [FIELD.PROJECTS.priority]:     { value: fval('priority') },
        };
        if (fval('estStartDate')) rec[FIELD.PROJECTS.estStartDate] = { value: fval('estStartDate') };
        if (fval('estEndDate'))   rec[FIELD.PROJECTS.estEndDate]   = { value: fval('estEndDate') };
        await qbUpsert(TABLES.projects, [rec], [3]);
        updated = { name: fval('name'), status: fval('status'), priority: fval('priority'),
          estStartDate: fval('estStartDate'), estEndDate: fval('estEndDate') };
      }
      Object.assign(item, updated);
      document.body.removeChild(modal);
      showToast('Saved', 'success');
      if (typeof onAfterSave === 'function') onAfterSave();
    } catch(e) {
      showToast('Save failed: ' + e.message, 'error');
    }
  };
};

// ─── TICKET SYSTEM ───────────────────────────────────────────
// Shared LCP cross-app infrastructure — table IDs should not change.
var TICKET_APP   = 'btnit6q26';
var TICKET_TABLE = 'btnit9gpf';
var TICKET_FIELD = {
  subject: 6, details: 10, ticketType: 7, priority: 9, system: 8,
  requestedBy: 19, contactEmail: 22, department: 20, additionalPeople: 23, webLink: 38
};
var TICKET_TYPES      = ['General Request','Bug Report','Feature Request','Security Issue','Major Development','Future Development','Idea for Improvment'];
var TICKET_PRIORITIES = ['04-Low','03-Medium','02-High','01-Critical'];
var TICKET_SYSTEMS    = ['QuickBase','HubSpot','ClickUp','Misc API.','Other'];
var TICKET_DEPARTMENTS= ['3D','Accounting','Business Process','Client Success','Development','Executive Team','Marketing','Operations','Production','Sales Team'];

// ─── ROLE DETECTION ───────────────────────────────────────────
var _currentUser = { email: '', name: '', role: null, userId: '', isAdmin: false };

function detectRole() {
  if (typeof gReqRole  !== 'undefined' && gReqRole)   _currentUser.role  = parseInt(gReqRole);
  if (typeof gReqEmail !== 'undefined' && gReqEmail)   _currentUser.email = gReqEmail;
  else if (typeof gUserEmail  !== 'undefined' && gUserEmail)  _currentUser.email = gUserEmail;
  else if (typeof gLoginEmail !== 'undefined' && gLoginEmail) _currentUser.email = gLoginEmail;
  // Fallback for local dev — default to admin
  if (!_currentUser.role) _currentUser.role = ROLE.ADMIN;
  _currentUser.isAdmin = (_currentUser.role === ROLE.ADMIN);
  console.log('[Role] Detected:', _currentUser.role, 'isAdmin:', _currentUser.isAdmin, 'email:', _currentUser.email || '(unknown)');
  return _currentUser;
}

async function resolveCurrentUser() {
  if (_currentUser.email) return;
  if (_authMode !== 'session') return;
  try {
    var ticket = (typeof gReqTkt !== 'undefined' && gReqTkt) ? gReqTkt : '';
    var resp = await fetch('/db/main?a=API_GetUserInfo' + (ticket ? '&ticket=' + encodeURIComponent(ticket) : ''), {
      method: 'GET', credentials: 'include'
    });
    if (resp.ok) {
      var text = await resp.text();
      var emailMatch = text.match(/<email>([^<]+)<\/email>/);
      if (emailMatch) _currentUser.email = emailMatch[1].toLowerCase();
      var nameMatch = text.match(/<name>([^<]+)<\/name>/);
      if (nameMatch) _currentUser.name = nameMatch[1];
    }
  } catch(e) { console.warn('[Auth] Could not resolve user email:', e); }
}

function currentUser() { return _currentUser; }

// ─── DATA CACHE ───────────────────────────────────────────────
// Tabs can store cached data here using cacheSet/cacheGet.
var _cache = {};
var CACHE_TTL = {
  reference:  5 * 60 * 1000,   // Reference/lookup data: 5 min
  timeseries: 2 * 60 * 1000,   // Date-range/time-series data: 2 min
};

function cacheGet(key)        { return _cache[key] || null; }
function cacheSet(key, data)  { _cache[key] = { data, ts: Date.now() }; }
function cacheIsStale(key, ttl) {
  var e = _cache[key];
  return !e || (Date.now() - e.ts > ttl);
}
function invalidateCache(key) { delete _cache[key]; }
function invalidateAll()      { _cache = {}; }

// ─── DASHBOARD FRAMEWORK ──────────────────────────────────────
var _tabs      = {};
var _activeTab = null;

/**
 * Register a tab module. Call this from each tab's JS file.
 *
 * @param {string} id      - Unique tab ID (used as URL hash and DOM ID)
 * @param {object} config  - { icon, label, roles, onInit, onActivate, onDeactivate, onSearch }
 *
 * roles:        array of ROLE IDs that can see this tab; empty array = visible to all
 * onInit:       async — called once the first time the tab is activated
 * onActivate:   called every time the tab becomes visible (after onInit on first visit)
 * onDeactivate: called when leaving this tab
 * onSearch:     called when the header search input changes; receives the query string
 */
function registerTab(id, config) {
  _tabs[id] = {
    id,
    icon:         config.icon         || '',
    label:        config.label        || id,
    roles:        config.roles        || [],
    onInit:       config.onInit       || null,
    onActivate:   config.onActivate   || null,
    onDeactivate: config.onDeactivate || null,
    onSearch:     config.onSearch     || null,
    initialized:  false
  };
}

function getVisibleTabs() {
  var role = _currentUser.role;
  return Object.keys(_tabs).filter(function(id) {
    var t = _tabs[id];
    return !t.roles.length || t.roles.indexOf(role) !== -1;
  }).map(function(id) { return _tabs[id]; });
}

async function switchTab(id) {
  if (!_tabs[id]) return;
  var tab = _tabs[id];

  if (tab.roles.length && tab.roles.indexOf(_currentUser.role) === -1) {
    showToast('You do not have access to this section', 'warning');
    return;
  }

  document.querySelectorAll('.tab-content').forEach(function(el) { el.style.display = 'none'; });
  if (_activeTab && _tabs[_activeTab] && _tabs[_activeTab].onDeactivate) _tabs[_activeTab].onDeactivate();

  var container = document.getElementById('tab-' + id);
  if (container) {
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.overflow = 'hidden';
    container.style.flex = '1';
  }

  if (!tab.initialized && tab.onInit) { await tab.onInit(); tab.initialized = true; }
  if (tab.onActivate) await tab.onActivate();

  _activeTab = id;

  document.querySelectorAll('.nav-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.tab === id);
  });

  var headerTitle = document.getElementById('appHeaderTitle');
  if (headerTitle) headerTitle.textContent = tab.label;

  var searchInput = document.getElementById('appSearchInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.placeholder = 'Search ' + tab.label.toLowerCase() + '...';
  }

  window.location.hash = id;
}

function renderTabContainers() {
  return getVisibleTabs().map(function(t) {
    return '<div id="tab-' + t.id + '" class="tab-content"></div>';
  }).join('');
}

function renderDashboardNav() {
  var isLight    = document.documentElement.getAttribute('data-theme') === 'light';
  var themeIcon  = isLight ? ICONS.moon : ICONS.sun;
  var themeLabel = isLight ? 'Dark Mode' : 'Light Mode';

  return '<div class="sidebar">' +
    '<div class="nav-items">' +
    getVisibleTabs().map(function(t) {
      var icon = ICONS[t.id] || t.icon;
      return '<a class="nav-item" data-tab="' + t.id + '" onclick="switchTab(\x27' + t.id + '\x27)" href="javascript:void(0)">' +
        '<span class="nav-icon">' + icon + '</span>' +
        '<span class="nav-label">' + t.label + '</span>' +
      '</a>';
    }).join('') +
    '</div>' +
    '<div class="sidebar-bottom">' +
      '<a class="nav-item" onclick="toggleTheme()" href="javascript:void(0)">' +
        '<span class="nav-icon" id="themeIcon">' + themeIcon + '</span>' +
        '<span class="nav-label" id="themeLabel">' + themeLabel + '</span>' +
      '</a>' +
    '</div>' +
  '</div>';
}

function renderAppHeader() {
  var isLight = document.documentElement.getAttribute('data-theme') === 'light';
  var logoSrc  = isLight ? (LOGO_LIGHT || LOGO_DARK) : (LOGO_DARK || LOGO_LIGHT);
  var logoHtml = logoSrc
    ? '<img src="' + logoSrc + '" id="appLogo" alt="' + escapeHtml(APP_NAME) + '" style="height:22px;width:auto">' +
      '<span class="app-header-sep">›</span>'
    : '<span style="font-size:13px;font-weight:700;color:var(--accent)">' + escapeHtml(APP_NAME) + '</span>' +
      '<span class="app-header-sep">›</span>';

  var searchIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

  // ViewAs dropdown — built dynamically from ROLE_NAMES
  var viewAsHtml = '';
  if (_currentUser.isAdmin) {
    viewAsHtml =
      '<select id="viewAsSelect" class="form-select" style="font-size:11px;padding:4px 8px;width:auto;min-width:140px;border-color:var(--border);background:var(--surface2);color:var(--text-muted)" onchange="viewAsChanged(this.value)">' +
        '<option value="me">Myself</option>' +
        '<optgroup label="Test as Role">' +
          Object.keys(ROLE_NAMES).map(function(id) {
            return '<option value="role:' + id + '">' + escapeHtml(ROLE_NAMES[id]) + '</option>';
          }).join('') +
        '</optgroup>' +
        '<optgroup label="Test as User" id="viewAsUsers"></optgroup>' +
      '</select>';
  }

  return '<div class="app-header">' +
    '<div class="app-header-logo">' + logoHtml +
      '<span class="app-header-title" id="appHeaderTitle">Loading...</span>' +
    '</div>' +
    '<div class="app-header-search">' +
      '<span class="app-header-search-icon">' + searchIcon + '</span>' +
      '<input type="text" id="appSearchInput" placeholder="Search..." autocomplete="off">' +
    '</div>' +
    '<div class="app-header-right">' +
      viewAsHtml +
      '<button class="btn-ticket" onclick="openTicketDrawer()">' + ICONS.ticket + ' Tickets</button>' +
    '</div>' +
  '</div>';
}

// ─── VIEWAS / TEST MODE ───────────────────────────────────────
var _realUser = null;
var _qbUsers  = [];

function viewAsChanged(val) {
  if (!val || val === 'me') {
    if (_realUser) {
      Object.assign(_currentUser, _realUser);
      _currentUser.isAdmin = (_currentUser.role === ROLE.ADMIN);
      _realUser = null;
    }
    window.buildDashboard();
    renderTestBanner();
    return;
  }

  if (!_realUser) {
    _realUser = { role: _currentUser.role, email: _currentUser.email, userId: _currentUser.userId, isAdmin: _currentUser.isAdmin };
  }

  if (val.indexOf('role:') === 0) {
    var r = parseInt(val.split(':')[1]);
    _currentUser.role = r;
    _currentUser.isAdmin = (r === ROLE.ADMIN);
  } else if (val.indexOf('user:') === 0) {
    var email = val.split(':')[1];
    var u = _qbUsers.find(function(x) { return x.email === email; });
    if (u) { _currentUser.email = u.email; _currentUser.userId = u.id; }
  }
  window.buildDashboard();
  renderTestBanner();
}

function renderTestBanner() {
  var existing = document.getElementById('testBanner');
  if (!_realUser) {
    if (existing) existing.remove();
    var sel = document.getElementById('viewAsSelect');
    if (sel) sel.style.display = '';
    return;
  }

  var sel = document.getElementById('viewAsSelect');
  if (sel) sel.style.display = 'none';

  var label = ROLE_NAMES[_currentUser.role] || ('Role ' + _currentUser.role);
  if (_currentUser.email && _currentUser.email !== _realUser.email) {
    var u = _qbUsers.find(function(x) { return x.email === _currentUser.email; });
    label = u ? (u.name || u.email) : _currentUser.email;
  }

  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'testBanner';
    var header = document.querySelector('.app-header');
    if (header) header.parentNode.insertBefore(existing, header.nextSibling);
  }
  existing.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;padding:6px 20px;background:#d4380d;color:#fff;font-size:12px;font-weight:600;flex-shrink:0;z-index:60';
  existing.innerHTML =
    '<span style="opacity:0.8">⚠ TESTING AS:</span> ' +
    '<span>' + escapeHtml(label) + '</span>' +
    '<button onclick="exitTestMode()" style="margin-left:12px;padding:3px 12px;border:1px solid rgba(255,255,255,0.4);border-radius:4px;background:rgba(255,255,255,0.15);color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Exit Test Mode</button>';
}

function exitTestMode() {
  var sel = document.getElementById('viewAsSelect');
  if (sel) sel.value = 'me';
  viewAsChanged('me');
}

function populateViewAsUsers() {
  var optgroup = document.getElementById('viewAsUsers');
  if (optgroup && _qbUsers.length) {
    optgroup.innerHTML = _qbUsers.map(function(u) {
      return '<option value="user:' + escapeHtml(u.email) + '">' + escapeHtml(u.name || u.email) + '</option>';
    }).join('');
  }
}

async function loadQBUsers() {
  if (_qbUsers.length > 0) { populateViewAsUsers(); return; }
  try {
    var resp = await fetch('https://api.quickbase.com/v1/records/query', {
      method: 'POST',
      headers: {
        'QB-Realm-Hostname': 'lcpmedia.quickbase.com',
        'Authorization': 'QB-USER-TOKEN b9ytiq_f9q7_0_chzcq48b95rhwnbqt4b6jfiuyp',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'bu83am495', select: [3, 7, 8, 9, 23],
        where: "{23.EX.'Paid seat'}", sortBy: [{ fieldId: 7, order: 'ASC' }], options: { top: 200 }
      })
    });
    if (!resp.ok) return;
    var data = await resp.json();
    _qbUsers = (data.data || []).map(function(r) {
      return {
        id:    r[3] ? String(r[3].value) : '',
        email: r[9] ? r[9].value : '',
        name:  ((r[7] ? r[7].value : '') + ' ' + (r[8] ? r[8].value : '')).trim()
      };
    }).filter(function(u) { return u.email; });
    populateViewAsUsers();
  } catch(e) { console.warn('[ViewAs] Could not load users:', e.message); }
}

// ─── TICKET DRAWER ────────────────────────────────────────────
var _ticketDrawerOpen = false;
var _myTickets        = [];

function openTicketDrawer() {
  if (_ticketDrawerOpen) { closeTicketDrawer(); return; }
  _ticketDrawerOpen = true;

  var overlay = document.getElementById('ticketDrawerOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ticketDrawerOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:900;opacity:0;transition:opacity 0.2s';
    overlay.onclick = function(e) { if (e.target === overlay) closeTicketDrawer(); };
    document.body.appendChild(overlay);
  }
  overlay.style.display = '';
  requestAnimationFrame(function() { overlay.style.opacity = '1'; });

  var drawer = document.getElementById('ticketDrawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'ticketDrawer';
    drawer.style.cssText = 'position:fixed;top:0;right:-420px;width:420px;height:100vh;background:var(--surface);border-left:1px solid var(--border);z-index:901;display:flex;flex-direction:column;transition:right 0.25s ease;box-shadow:-4px 0 24px rgba(0,0,0,0.2)';
    document.body.appendChild(drawer);
  }
  drawer.innerHTML = _buildDrawerHTML();
  requestAnimationFrame(function() { drawer.style.right = '0'; });
  _loadMyTickets();
}

function closeTicketDrawer() {
  _ticketDrawerOpen = false;
  var drawer = document.getElementById('ticketDrawer');
  if (drawer) drawer.style.right = '-420px';
  var overlay = document.getElementById('ticketDrawerOverlay');
  if (overlay) { overlay.style.opacity = '0'; setTimeout(function() { overlay.style.display = 'none'; }, 200); }
}

function _buildDrawerHTML() {
  return '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0">' +
    '<div style="display:flex;align-items:center;gap:10px">' +
      '<span style="color:var(--accent)">' + ICONS.ticket + '</span>' +
      '<span style="font-size:15px;font-weight:600;color:var(--text)">My Tickets</span>' +
    '</div>' +
    '<button onclick="closeTicketDrawer()" style="border:none;background:none;cursor:pointer;color:var(--text-muted);font-size:18px;padding:4px">&times;</button>' +
  '</div>' +
  '<div style="display:flex;gap:8px;padding:12px 20px;border-bottom:1px solid var(--border);flex-shrink:0">' +
    '<button class="btn btn-sm btn-active" id="tktFilterOpen"   onclick="filterDrawerTickets(\x27open\x27)">Open</button>' +
    '<button class="btn btn-sm"            id="tktFilterClosed" onclick="filterDrawerTickets(\x27closed\x27)">Closed</button>' +
    '<button class="btn btn-sm"            id="tktFilterAll"    onclick="filterDrawerTickets(\x27all\x27)">All</button>' +
  '</div>' +
  '<div id="ticketDrawerList" style="flex:1;overflow-y:auto;padding:12px 20px">' +
    '<div style="text-align:center;color:var(--text-dim);padding:40px 0">Loading tickets...</div>' +
  '</div>' +
  '<div style="padding:12px 20px;border-top:1px solid var(--border);flex-shrink:0">' +
    '<button class="btn btn-primary" onclick="openTicket()" style="width:100%">' + ICONS.ticket + ' New Ticket</button>' +
  '</div>';
}

var _drawerFilter = 'open';

function filterDrawerTickets(filter) {
  _drawerFilter = filter;
  document.querySelectorAll('#ticketDrawer .btn-sm').forEach(function(b) { b.classList.remove('btn-active'); });
  var btnId = { open:'tktFilterOpen', closed:'tktFilterClosed', all:'tktFilterAll' }[filter];
  var btn = document.getElementById(btnId);
  if (btn) btn.classList.add('btn-active');
  _renderDrawerTickets();
}

async function _loadMyTickets() {
  await resolveCurrentUser();
  try {
    var resp = await fetch('https://api.quickbase.com/v1/records/query', {
      method: 'POST',
      headers: {
        'QB-Realm-Hostname': 'lcpmedia.quickbase.com',
        'Authorization': 'QB-USER-TOKEN b9ytiq_f9q7_0_chzcq48b95rhwnbqt4b6jfiuyp',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: TICKET_TABLE,
        select: [3, 6, 7, 8, 9, 10, 12, 16, 17, 19, 20, 22, 24, 29, 31],
        sortBy: [{ fieldId: 29, order: 'DESC' }],
        options: { top: 100 }
      })
    });
    if (!resp.ok) throw new Error('Failed to load tickets');
    var data = await resp.json();
    var allTickets = (data.data || []).map(function(r) {
      var cb = r[31] ? r[31].value : null;
      return {
        id: r[3]?.value || '', subject: r[6]?.value || '', type: r[7]?.value || '',
        priority: r[9]?.value || '', status: r[12]?.value || '', ticketId: r[24]?.value || '',
        dateOpened: r[29]?.value || '', details: r[10]?.value || '', notes: r[16]?.value || '',
        statusLog: r[17]?.value || '', requestedFor: r[19]?.value || '',
        contactEmail: r[22]?.value || '', system: r[8]?.value || '', department: r[20]?.value || '',
        createdById: cb ? String(cb.id || cb.userId || cb) : '',
        createdByEmail: cb ? (cb.email || '').toLowerCase() : ''
      };
    });
    var userId = _currentUser.userId || '';
    var userEmail = (_currentUser.email || '').toLowerCase();
    if (userId)       _myTickets = allTickets.filter(function(t) { return t.createdById === userId; });
    else if (userEmail) _myTickets = allTickets.filter(function(t) { return t.createdByEmail === userEmail; });
    else              _myTickets = allTickets;
    _renderDrawerTickets();
  } catch(e) {
    var list = document.getElementById('ticketDrawerList');
    if (list) list.innerHTML = '<div style="text-align:center;color:var(--danger);padding:40px 0">Error: ' + escapeHtml(e.message) + '</div>';
  }
}

function _renderDrawerTickets() {
  var list = document.getElementById('ticketDrawerList');
  if (!list) return;
  var filtered = _myTickets;
  if (_drawerFilter === 'open')   filtered = _myTickets.filter(function(t) { return t.status && t.status.charAt(0) === 'O'; });
  if (_drawerFilter === 'closed') filtered = _myTickets.filter(function(t) { return t.status && t.status.charAt(0) === 'C'; });
  if (!filtered.length) { list.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:40px 0">No tickets found</div>'; return; }

  list.innerHTML = filtered.map(function(t) {
    var priColor = t.priority === '01-Critical' ? 'var(--danger)' : t.priority === '02-High' ? 'var(--warning)' : t.priority === '03-Medium' ? 'var(--accent)' : 'var(--text-dim)';
    var statusClass = !t.status ? 'badge-neutral' : t.status.charAt(0) === 'C' ? 'badge-success' : (t.status.indexOf('Progress') !== -1 || t.status.indexOf('Assigned') !== -1) ? 'badge-info' : t.status.indexOf('Stalled') !== -1 ? 'badge-danger' : 'badge-warning';
    var dateStr = t.dateOpened ? (function(d){ return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); })(new Date(t.dateOpened)) : '';
    return '<div onclick="viewTicket(' + t.id + ')" style="display:block;padding:12px;margin-bottom:8px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;cursor:pointer" onmouseenter="this.style.borderColor=\x27var(--accent)\x27" onmouseleave="this.style.borderColor=\x27var(--border)\x27">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
        '<span style="font-size:11px;font-family:JetBrains Mono,monospace;color:var(--text-dim)">' + escapeHtml(t.ticketId || '#' + t.id) + '</span>' +
        '<span class="badge ' + statusClass + '">' + escapeHtml(t.status || 'New') + '</span>' +
      '</div>' +
      '<div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:6px;line-height:1.3">' + escapeHtml(t.subject || 'No subject') + '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-dim)">' +
        '<span style="color:' + priColor + '">' + escapeHtml(t.priority || '') + '</span>' +
        (t.type ? '<span>·</span><span>' + escapeHtml(t.type) + '</span>' : '') +
        (dateStr ? '<span style="margin-left:auto">' + dateStr + '</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function viewTicket(recordId) {
  var t = _myTickets.find(function(x) { return x.id === recordId; });
  if (!t) { showToast('Ticket not found', 'error'); return; }
  var drawer = document.getElementById('ticketDrawer');
  if (!drawer) return;

  var priColor = t.priority === '01-Critical' ? 'var(--danger)' : t.priority === '02-High' ? 'var(--warning)' : t.priority === '03-Medium' ? 'var(--accent)' : 'var(--text-dim)';
  var statusClass = !t.status ? 'badge-neutral' : t.status.charAt(0) === 'C' ? 'badge-success' : (t.status.indexOf('Progress') !== -1 || t.status.indexOf('Assigned') !== -1) ? 'badge-info' : t.status.indexOf('Stalled') !== -1 ? 'badge-danger' : 'badge-warning';
  var dateStr = t.dateOpened ? (function(d){ return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); })(new Date(t.dateOpened)) : '';
  var cleanDetails = (t.details || '').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').trim();
  var logEntries = (t.statusLog || '').split('\n').filter(function(l) { return l.trim(); });

  drawer.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<span style="color:var(--accent)">' + ICONS.ticket + '</span>' +
        '<span style="font-size:15px;font-weight:600;color:var(--text)">' + escapeHtml(t.ticketId || '#' + t.id) + '</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<button onclick="closeTicketDrawer();openTicketDrawer()" style="border:none;background:none;cursor:pointer;color:var(--text-muted);font-size:12px;text-decoration:underline">Back</button>' +
        '<button onclick="closeTicketDrawer()" style="border:none;background:none;cursor:pointer;color:var(--text-muted);font-size:18px;padding:4px">&times;</button>' +
      '</div>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;padding:16px 20px">' +
      '<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:12px;line-height:1.4">' + escapeHtml(t.subject || 'No subject') + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">' +
        '<span class="badge ' + statusClass + '">' + escapeHtml(t.status || 'New') + '</span>' +
        '<span class="badge" style="background:transparent;border:1px solid ' + priColor + ';color:' + priColor + '">' + escapeHtml(t.priority || '') + '</span>' +
        (t.type ? '<span class="badge badge-neutral">' + escapeHtml(t.type) + '</span>' : '') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:16px;font-size:12px">' +
        (dateStr ? '<div><span style="color:var(--text-dim)">Opened</span><div style="color:var(--text);margin-top:2px">' + dateStr + '</div></div>' : '') +
        (t.system ? '<div><span style="color:var(--text-dim)">System</span><div style="color:var(--text);margin-top:2px">' + escapeHtml(t.system) + '</div></div>' : '') +
        (t.department ? '<div><span style="color:var(--text-dim)">Department</span><div style="color:var(--text);margin-top:2px">' + escapeHtml(t.department) + '</div></div>' : '') +
        (t.requestedFor ? '<div><span style="color:var(--text-dim)">Requested By</span><div style="color:var(--text);margin-top:2px">' + escapeHtml(t.requestedFor) + '</div></div>' : '') +
      '</div>' +
      (cleanDetails ? '<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Details</div><div style="font-size:13px;color:var(--text-muted);line-height:1.5;padding:10px;background:var(--surface2);border-radius:6px;white-space:pre-wrap">' + escapeHtml(cleanDetails) + '</div></div>' : '') +
      '<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Status History</div>' +
        (logEntries.length
          ? '<div style="font-size:12px;color:var(--text-muted);padding:10px;background:var(--surface2);border-radius:6px">' + logEntries.map(function(l){return '<div style="padding:4px 0;border-bottom:1px solid var(--border)">' + escapeHtml(l) + '</div>';}).join('') + '</div>'
          : '<div style="font-size:12px;color:var(--text-dim);padding:10px;background:var(--surface2);border-radius:6px">No status changes recorded</div>') +
      '</div>' +
      '<div style="margin-bottom:16px"><div style="font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Notes / Comments</div>' +
        (t.notes ? '<div style="font-size:13px;color:var(--text-muted);line-height:1.5;padding:10px;background:var(--surface2);border-radius:6px;margin-bottom:8px;white-space:pre-wrap">' + escapeHtml(t.notes) + '</div>' : '') +
        '<textarea id="tktNewNote" class="form-textarea" rows="3" placeholder="Add a note..."></textarea>' +
      '</div>' +
    '</div>' +
    '<div style="padding:12px 20px;border-top:1px solid var(--border);flex-shrink:0">' +
      '<button class="btn btn-primary" onclick="saveTicketNote(' + t.id + ')" id="tktNoteSaveBtn" style="width:100%">Save Note</button>' +
    '</div>';
}

async function saveTicketNote(recordId) {
  var noteInput = document.getElementById('tktNewNote');
  var newNote = noteInput ? noteInput.value.trim() : '';
  if (!newNote) { showToast('Enter a note first', 'warning'); return; }
  var t = _myTickets.find(function(x) { return x.id === recordId; });
  var combined = ((t && t.notes) ? t.notes + '\n\n' : '') + '[' + new Date().toLocaleString() + ' — ' + (_currentUser.email || 'Unknown') + ']\n' + newNote;
  var btn = document.getElementById('tktNoteSaveBtn');
  btn.textContent = 'Saving...'; btn.disabled = true;
  try {
    var record = {}; record[3] = {value: recordId}; record[16] = {value: combined};
    await fetch('https://api.quickbase.com/v1/records', {
      method: 'POST',
      headers: { 'QB-Realm-Hostname': 'lcpmedia.quickbase.com', 'Authorization': 'QB-USER-TOKEN b9ytiq_f9q7_0_chzcq48b95rhwnbqt4b6jfiuyp', 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: TICKET_TABLE, data: [record] })
    });
    if (t) t.notes = combined;
    showToast('Note added', 'success');
    viewTicket(recordId);
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
    btn.textContent = 'Save Note'; btn.disabled = false;
  }
}

function openTicket() {
  _ticketDrawerOpen = true;
  var overlay = document.getElementById('ticketDrawerOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ticketDrawerOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:900;opacity:0;transition:opacity 0.2s';
    overlay.onclick = function(e) { if (e.target === overlay) closeTicketDrawer(); };
    document.body.appendChild(overlay);
  }
  overlay.style.display = '';
  requestAnimationFrame(function() { overlay.style.opacity = '1'; });
  var drawer = document.getElementById('ticketDrawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'ticketDrawer';
    drawer.style.cssText = 'position:fixed;top:0;right:-420px;width:420px;height:100vh;background:var(--surface);border-left:1px solid var(--border);z-index:901;display:flex;flex-direction:column;transition:right 0.25s ease;box-shadow:-4px 0 24px rgba(0,0,0,0.2)';
    document.body.appendChild(drawer);
  }
  var user = currentUser();
  drawer.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0">' +
      '<div style="display:flex;align-items:center;gap:10px"><span style="color:var(--accent)">' + ICONS.ticket + '</span><span style="font-size:15px;font-weight:600;color:var(--text)">New Ticket</span></div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<button onclick="closeTicketDrawer();openTicketDrawer()" style="border:none;background:none;cursor:pointer;color:var(--text-muted);font-size:12px;text-decoration:underline">Back to list</button>' +
        '<button onclick="closeTicketDrawer()" style="border:none;background:none;cursor:pointer;color:var(--text-muted);font-size:18px;padding:4px">&times;</button>' +
      '</div>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;padding:16px 20px">' +
      '<div class="form-group"><label class="form-label">Subject</label><input class="form-input" id="tktSubject" placeholder="Brief description of the issue or request"></div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label class="form-label">Ticket Type</label><select class="form-select" id="tktType">' + TICKET_TYPES.map(function(t){return '<option>'+t+'</option>';}).join('') + '</select></div>' +
        '<div class="form-group"><label class="form-label">Priority</label><select class="form-select" id="tktPriority">' + TICKET_PRIORITIES.map(function(p){return '<option'+(p==='04-Low'?' selected':'')+'>'+p+'</option>';}).join('') + '</select></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label class="form-label">System</label><select class="form-select" id="tktSystem"><option value="">Select...</option>' + TICKET_SYSTEMS.map(function(s){return '<option>'+s+'</option>';}).join('') + '</select></div>' +
        '<div class="form-group"><label class="form-label">Department</label><select class="form-select" id="tktDept"><option value="">Select...</option>' + TICKET_DEPARTMENTS.map(function(d){return '<option>'+d+'</option>';}).join('') + '</select></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Details</label><textarea class="form-textarea" id="tktDetails" rows="4" placeholder="Describe the issue, steps to reproduce, or what you need..."></textarea></div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label class="form-label">Requested By</label><input class="form-input" id="tktRequestedBy" value="' + escapeHtml(user.email) + '"></div>' +
        '<div class="form-group"><label class="form-label">Contact Email</label><input class="form-input" type="email" id="tktEmail" value="' + escapeHtml(user.email) + '"></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Additional People Affected</label><input class="form-input" id="tktAdditional" placeholder="Names or emails of others affected"></div>' +
      '<div class="form-group"><label class="form-label">Web Link</label><input class="form-input" type="url" id="tktWebLink" placeholder="https://..."></div>' +
    '</div>' +
    '<div style="padding:12px 20px;border-top:1px solid var(--border);flex-shrink:0">' +
      '<button class="btn btn-primary" onclick="submitTicket()" id="tktSubmitBtn" style="width:100%"><span id="tktSubmitText">Submit Ticket</span></button>' +
    '</div>';
  requestAnimationFrame(function() { drawer.style.right = '0'; });
  setTimeout(function() { var el = document.getElementById('tktSubject'); if (el) el.focus(); }, 300);
}

async function submitTicket() {
  var subject = document.getElementById('tktSubject').value.trim();
  if (!subject) { showToast('Subject is required', 'warning'); return; }
  var btn = document.getElementById('tktSubmitBtn');
  var btnText = document.getElementById('tktSubmitText');
  btn.disabled = true; btnText.textContent = 'Submitting...';
  var record = {};
  record[TICKET_FIELD.subject]      = {value: subject};
  record[TICKET_FIELD.details]      = {value: document.getElementById('tktDetails').value};
  record[TICKET_FIELD.ticketType]   = {value: document.getElementById('tktType').value};
  record[TICKET_FIELD.priority]     = {value: document.getElementById('tktPriority').value};
  record[TICKET_FIELD.requestedBy]  = {value: document.getElementById('tktRequestedBy').value};
  record[TICKET_FIELD.contactEmail] = {value: document.getElementById('tktEmail').value};
  var sys = document.getElementById('tktSystem').value; if (sys) record[TICKET_FIELD.system] = {value: sys};
  var dept = document.getElementById('tktDept').value; if (dept) record[TICKET_FIELD.department] = {value: dept};
  var addl = document.getElementById('tktAdditional').value; if (addl) record[TICKET_FIELD.additionalPeople] = {value: addl};
  var link = document.getElementById('tktWebLink').value; if (link) record[TICKET_FIELD.webLink] = {value: link};
  try {
    var resp = await fetch('https://api.quickbase.com/v1/records', {
      method: 'POST',
      headers: { 'QB-Realm-Hostname': 'lcpmedia.quickbase.com', 'Authorization': 'QB-USER-TOKEN b9ytiq_f9q7_0_chzcq48b95rhwnbqt4b6jfiuyp', 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: TICKET_TABLE, data: [record] })
    });
    if (!resp.ok) { var err = await resp.json().catch(function(){return {};}); throw new Error(err.description || err.message || 'API error ' + resp.status); }
    closeTicketDrawer();
    showToast('Ticket submitted successfully', 'success');
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
    btn.disabled = false; btnText.textContent = 'Submit Ticket';
  }
}
