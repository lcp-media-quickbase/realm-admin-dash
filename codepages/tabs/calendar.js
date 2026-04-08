(function() {

// ─── Azure Config (Microsoft Teams Calendar) ──────────────────
// To enable Teams integration:
//   1. Register an app at https://portal.azure.com → Azure Active Directory → App registrations
//   2. Add a Single-page application redirect URI matching your QB Code Page URL
//   3. Grant API permission: Microsoft Graph → Calendars.Read (delegated)
//   4. Paste the Application (client) ID and Directory (tenant) ID below
var AZURE_CLIENT_ID = 'YOUR-CLIENT-ID-HERE';
var AZURE_TENANT_ID = 'YOUR-TENANT-ID-HERE';

// ─── State ────────────────────────────────────────────────────
var _projects    = [];
var _teamsEvents = [];
var _msalApp     = null;
var _msalAccount = null;
var _year        = new Date().getFullYear();
var _month       = new Date().getMonth();   // 0-based
var _dragId      = null;

// ─── Project color palette ────────────────────────────────────
var PALETTE = ['#68B6E5','#e86060','#82c96a','#e8a860','#a06be8','#60d4c8','#e860a8','#e8d060'];
function _color(id) { return PALETTE[id % PALETTE.length]; }

// ─── Month/day labels ─────────────────────────────────────────
var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DOW         = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Tab Registration ─────────────────────────────────────────
registerTab('calendar', {
  icon:  ICONS.scheduler,
  label: 'Calendar',
  roles: [],

  onInit: async function() {
    var c = document.getElementById('tab-calendar');
    if (c) c.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';
    try {
      await _loadData();
      await _loadMSAL();
      if (_msalApp) {
        var accounts = _msalApp.getAllAccounts();
        if (accounts.length > 0) {
          _msalAccount = accounts[0];
          await _fetchTeamsEvents().catch(function() {});
        }
      }
    } catch(e) { /* render with whatever data loaded */ }
    _render();
  },

  onActivate: function() {},
  onDeactivate: function() {},
  onSearch: function() {}
});

// ─── Data Loading ─────────────────────────────────────────────
async function _loadData() {
  var rows = await qbQueryAll(TABLES.projects, [3, 16, 28, 27, 23, 24], null);
  _projects = rows.map(function(r) {
    return {
      id:           val(r, 3),
      name:         val(r, FIELD.PROJECTS.name)         || '',
      status:       val(r, FIELD.PROJECTS.status)       || '',
      estStartDate: val(r, FIELD.PROJECTS.estStartDate) || '',
      estEndDate:   val(r, FIELD.PROJECTS.estEndDate)   || '',
    };
  });
}

// ─── MSAL (Teams) ─────────────────────────────────────────────
function _loadMSAL() {
  return new Promise(function(resolve) {
    if (window.msal) { _initMSALApp(); resolve(); return; }
    var s = document.createElement('script');
    s.src     = 'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js';
    s.onload  = function() { _initMSALApp(); resolve(); };
    s.onerror = function() { resolve(); };   // Teams is optional — don't block render
    document.head.appendChild(s);
  });
}

function _initMSALApp() {
  if (!window.msal || AZURE_CLIENT_ID === 'YOUR-CLIENT-ID-HERE') return;
  try {
    _msalApp = new msal.PublicClientApplication({
      auth: {
        clientId:    AZURE_CLIENT_ID,
        authority:   'https://login.microsoftonline.com/' + AZURE_TENANT_ID,
        redirectUri: window.location.origin + window.location.pathname,
      },
      cache: { cacheLocation: 'sessionStorage' },
    });
  } catch(e) {}
}

async function _fetchTeamsEvents() {
  if (!_msalApp || !_msalAccount) return;
  var tokenResp = await _msalApp.acquireTokenSilent({
    scopes: ['Calendars.Read'], account: _msalAccount,
  }).catch(function() {
    return _msalApp.acquireTokenPopup({ scopes: ['Calendars.Read'], account: _msalAccount });
  });
  var start = new Date(_year, _month, 1).toISOString();
  var end   = new Date(_year, _month + 1, 0, 23, 59, 59).toISOString();
  var resp  = await fetch(
    'https://graph.microsoft.com/v1.0/me/events' +
    '?$select=subject,start,end&$top=100' +
    '&$filter=start/dateTime ge \'' + start + '\' and start/dateTime le \'' + end + '\'',
    { headers: { Authorization: 'Bearer ' + tokenResp.accessToken } }
  );
  if (!resp.ok) return;
  var data = await resp.json();
  _teamsEvents = (data.value || []).map(function(ev) {
    return {
      name:  ev.subject || '(No title)',
      start: ev.start.dateTime.split('T')[0],
      end:   ev.end.dateTime.split('T')[0],
    };
  });
}

// ─── Events for a given date string ───────────────────────────
function _eventsForDate(dateStr) {
  var evs = [];
  _projects.forEach(function(p) {
    if (!p.estStartDate || !p.estEndDate) return;
    var s = p.estStartDate.split('T')[0];
    var e = p.estEndDate.split('T')[0];
    if (dateStr >= s && dateStr <= e) {
      evs.push({ name: p.name, color: _color(p.id), isStart: dateStr === s, isEnd: dateStr === e });
    }
  });
  _teamsEvents.forEach(function(ev) {
    if (dateStr >= ev.start && dateStr <= ev.end) {
      evs.push({ name: ev.name, color: '#6264a7' });
    }
  });
  return evs;
}

// ─── Render ───────────────────────────────────────────────────
function _render() {
  var c = document.getElementById('tab-calendar');
  if (!c) return;

  var today    = new Date();
  var todayStr = today.getFullYear() + '-' +
                 String(today.getMonth() + 1).padStart(2, '0') + '-' +
                 String(today.getDate()).padStart(2, '0');

  // Build calendar cells
  var firstDay = new Date(_year, _month, 1);
  var lastDay  = new Date(_year, _month + 1, 0);
  var cells    = [];
  for (var pad = 0; pad < firstDay.getDay(); pad++) cells.push(null);
  for (var d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(_year, _month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  var unscheduled = _projects.filter(function(p) { return !p.estStartDate; });
  var scheduled   = _projects.filter(function(p) { return !!p.estStartDate; });

  // Teams button
  var teamsBtn = _msalAccount
    ? '<button class="btn btn-sm btn-primary" onclick="calTeamsRefresh()" style="background:#6264a7;border-color:#6264a7">⟳ Teams</button>'
    : (_msalApp
        ? '<button class="btn btn-sm" onclick="calTeamsSignIn()" style="border-color:#6264a7;color:#6264a7">⊞ Connect Teams</button>'
        : '');

  c.innerHTML =
    // ── Topbar ──
    '<div class="topbar">' +
      '<div class="topbar-left" style="gap:6px">' +
        '<button class="btn btn-sm" onclick="calPrevMonth()">‹</button>' +
        '<span style="font-size:14px;font-weight:600;min-width:150px;text-align:center">' +
          MONTH_NAMES[_month] + ' ' + _year +
        '</span>' +
        '<button class="btn btn-sm" onclick="calNextMonth()">›</button>' +
      '</div>' +
      '<div class="topbar-right">' +
        teamsBtn +
        '<button class="btn btn-sm" onclick="calRefresh()">↺ Refresh</button>' +
      '</div>' +
    '</div>' +

    // ── Body: left panel + calendar ──
    '<div style="display:flex;flex:1;overflow:hidden">' +

    // Left panel — unscheduled projects (drag to calendar to set dates)
    '<div style="width:220px;flex-shrink:0;border-right:1px solid var(--border);' +
      'overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:6px">' +
      '<div style="font-size:11px;font-weight:600;color:var(--text-muted);' +
        'text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">' +
        'Unscheduled (' + unscheduled.length + ')' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">' +
        'Drag a project onto a day, or drag across days to set a range.' +
      '</div>' +
      (unscheduled.length === 0
        ? '<div style="font-size:12px;color:var(--text-dim)">All projects have dates set.</div>'
        : unscheduled.map(function(p) {
            var col = _color(p.id);
            return '<div draggable="true" data-id="' + p.id + '" ' +
              'ondragstart="calDragStart(event,' + p.id + ')" ' +
              'style="padding:8px 10px;border-radius:6px;border:1px solid var(--border);' +
                'border-left:3px solid ' + col + ';background:var(--surface);' +
                'font-size:12px;color:var(--text);cursor:grab;user-select:none">' +
              escapeHtml(p.name) +
            '</div>';
          }).join('')
      ) +

      // Also show scheduled projects for re-scheduling via calendar drag
      (scheduled.length > 0
        ? '<div style="font-size:11px;font-weight:600;color:var(--text-muted);' +
            'text-transform:uppercase;letter-spacing:0.5px;margin:12px 0 4px">' +
            'Scheduled (' + scheduled.length + ')' +
          '</div>' +
          scheduled.map(function(p) {
            var col = _color(p.id);
            return '<div draggable="true" data-id="' + p.id + '" ' +
              'ondragstart="calDragStart(event,' + p.id + ')" ' +
              'style="padding:8px 10px;border-radius:6px;border:1px solid var(--border);' +
                'border-left:3px solid ' + col + ';background:var(--surface);' +
                'font-size:12px;color:var(--text);cursor:grab;user-select:none;opacity:0.7">' +
              escapeHtml(p.name) + '<br>' +
              '<span style="font-size:10px;color:var(--text-dim)">' +
                (p.estStartDate || '').split('T')[0] + ' → ' + (p.estEndDate || '').split('T')[0] +
              '</span>' +
            '</div>';
          }).join('')
        : '') +
    '</div>' +

    // Calendar area
    '<div style="flex:1;overflow:auto;padding:16px">' +

    // Day-of-week headers
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">' +
    DOW.map(function(label) {
      return '<div style="text-align:center;font-size:11px;font-weight:600;' +
        'color:var(--text-muted);padding:4px 0">' + label + '</div>';
    }).join('') +
    '</div>' +

    // Calendar grid
    '<div id="cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">' +
    cells.map(function(date) {
      if (!date) {
        return '<div style="min-height:96px;background:var(--bg);border-radius:6px;' +
          'border:1px solid transparent;opacity:0.3"></div>';
      }
      var ds  = date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0');
      var evs = _eventsForDate(ds);
      var isToday = ds === todayStr;

      return '<div class="cal-day" data-date="' + ds + '" ' +
        'ondragover="event.preventDefault()" ' +
        'ondrop="calDrop(event,\'' + ds + '\')" ' +
        'style="min-height:96px;background:var(--surface);border-radius:6px;padding:5px;' +
          'border:1px solid ' + (isToday ? 'var(--accent)' : 'var(--border)') + ';' +
          'cursor:crosshair;user-select:none;box-sizing:border-box;overflow:hidden">' +

        '<div style="font-size:12px;font-weight:' + (isToday ? '700' : '500') + ';' +
          'color:' + (isToday ? 'var(--accent)' : 'var(--text)') + ';margin-bottom:3px">' +
          date.getDate() +
        '</div>' +

        evs.map(function(ev) {
          return '<div style="font-size:10px;padding:2px 5px;border-radius:3px;margin-bottom:2px;' +
            'background:' + ev.color + '28;border-left:2px solid ' + ev.color + ';' +
            'color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
            'line-height:1.4" title="' + escapeHtml(ev.name) + '">' +
            escapeHtml(ev.name) +
          '</div>';
        }).join('') +

      '</div>';
    }).join('') +
    '</div>' +   // end cal-grid

    // Legend
    (scheduled.length > 0 || _teamsEvents.length > 0
      ? '<div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;align-items:center">' +
          '<span style="font-size:11px;color:var(--text-dim)">Legend:</span>' +
          scheduled.map(function(p) {
            return '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">' +
              '<div style="width:10px;height:10px;border-radius:2px;background:' + _color(p.id) + '"></div>' +
              escapeHtml(p.name) +
            '</div>';
          }).join('') +
          (_teamsEvents.length > 0
            ? '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">' +
                '<div style="width:10px;height:10px;border-radius:2px;background:#6264a7"></div>Teams' +
              '</div>'
            : '') +
        '</div>'
      : '') +

    '</div>' +   // end calendar area
    '</div>';    // end body flex row

  _initDragListeners();
}

// ─── Multi-day drag (mousedown → mousemove → mouseup) ─────────
function _initDragListeners() {
  var grid = document.getElementById('cal-grid');
  if (!grid) return;

  grid.addEventListener('mousedown', function(e) {
    var cell = e.target.closest('.cal-day[data-date]');
    if (!cell || e.button !== 0) return;
    if (e.target.closest('[draggable="true"]')) return;  // let HTML5 drag handle it
    e.preventDefault();

    var startDate = cell.dataset.date;
    var endDate   = startDate;
    _highlightRange(startDate, endDate);

    function onMove(e2) {
      var el = document.elementFromPoint(e2.clientX, e2.clientY);
      var c2 = el && el.closest('.cal-day[data-date]');
      if (c2) { endDate = c2.dataset.date; _highlightRange(startDate, endDate); }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      _clearHighlight();
      var s = startDate <= endDate ? startDate : endDate;
      var e = startDate <= endDate ? endDate   : startDate;
      _promptProjectForRange(s, e);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}

function _highlightRange(startStr, endStr) {
  var s = startStr <= endStr ? startStr : endStr;
  var e = startStr <= endStr ? endStr   : startStr;
  document.querySelectorAll('.cal-day[data-date]').forEach(function(cell) {
    var inRange = cell.dataset.date >= s && cell.dataset.date <= e;
    cell.style.background   = inRange ? 'var(--accent-dim)'  : '';
    cell.style.borderColor  = inRange ? 'var(--accent)'      : '';
  });
}

function _clearHighlight() {
  document.querySelectorAll('.cal-day[data-date]').forEach(function(cell) {
    cell.style.background  = '';
    cell.style.borderColor = '';
  });
}

function _promptProjectForRange(startStr, endStr) {
  if (_projects.length === 0) { showToast('No projects available', 'info'); return; }

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;' +
    'display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;' +
      'padding:24px;width:340px;display:flex;flex-direction:column;gap:14px">' +
      '<div style="font-size:14px;font-weight:600;color:var(--text)">Set Project Dates</div>' +
      '<div style="font-size:12px;color:var(--text-muted)">' +
        (startStr === endStr ? startStr : startStr + '  →  ' + endStr) +
      '</div>' +
      '<select id="cal-proj-select" style="background:var(--bg);color:var(--text);' +
        'border:1px solid var(--border);border-radius:6px;padding:8px;' +
        'font-family:inherit;font-size:13px">' +
        '<option value="">— Select a project —</option>' +
        _projects.map(function(p) {
          return '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>';
        }).join('') +
      '</select>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn btn-sm" id="cal-modal-cancel">Cancel</button>' +
        '<button class="btn btn-sm btn-primary" id="cal-modal-confirm">Set Dates</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  document.getElementById('cal-modal-cancel').onclick  = function() { document.body.removeChild(modal); };
  document.getElementById('cal-modal-confirm').onclick = function() {
    var id = parseInt(document.getElementById('cal-proj-select').value);
    if (!id) { showToast('Please select a project', 'info'); return; }
    document.body.removeChild(modal);
    _saveProjectDates(id, startStr, endStr);
  };
}

// ─── HTML5 drag from left panel ───────────────────────────────
function calDragStart(e, projectId) {
  _dragId = projectId;
  e.dataTransfer.setData('text/plain', String(projectId));
  e.dataTransfer.effectAllowed = 'move';
}

function calDrop(e, dateStr) {
  e.preventDefault();
  var id = _dragId || parseInt(e.dataTransfer.getData('text/plain'));
  if (!id) return;
  _dragId = null;
  _saveProjectDates(id, dateStr, dateStr);
}

// ─── Save project dates to QB ─────────────────────────────────
async function _saveProjectDates(projectId, startStr, endStr) {
  try {
    await qbUpsert(TABLES.projects, [{
      3:                             { value: projectId },
      [FIELD.PROJECTS.estStartDate]: { value: startStr },
      [FIELD.PROJECTS.estEndDate]:   { value: endStr },
    }], [3]);

    var proj = _projects.find(function(p) { return p.id === projectId; });
    if (proj) { proj.estStartDate = startStr; proj.estEndDate = endStr; }

    showToast('Dates updated', 'success');
    _render();
  } catch(e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
}

// ─── Month navigation ─────────────────────────────────────────
function calPrevMonth() {
  _month--;
  if (_month < 0) { _month = 11; _year--; }
  if (_msalAccount) _fetchTeamsEvents().catch(function(){}).then(function(){ _render(); });
  else _render();
}

function calNextMonth() {
  _month++;
  if (_month > 11) { _month = 0; _year++; }
  if (_msalAccount) _fetchTeamsEvents().catch(function(){}).then(function(){ _render(); });
  else _render();
}

async function calRefresh() {
  var c = document.getElementById('tab-calendar');
  if (c) c.innerHTML = '<div class="loading"><div class="spinner"></div> Refreshing...</div>';
  await _loadData();
  if (_msalAccount) await _fetchTeamsEvents().catch(function(){});
  _render();
}

async function calTeamsSignIn() {
  if (!_msalApp) { showToast('Azure credentials not configured — see calendar.js', 'error'); return; }
  try {
    var result = await _msalApp.loginPopup({ scopes: ['Calendars.Read', 'User.Read'] });
    _msalAccount = result.account;
    await _fetchTeamsEvents();
    _render();
    showToast('Teams calendar connected', 'success');
  } catch(e) {
    showToast('Teams sign-in failed: ' + e.message, 'error');
  }
}

async function calTeamsRefresh() {
  await _fetchTeamsEvents().catch(function(){});
  _render();
  showToast('Teams events refreshed', 'success');
}

// ─── Window exports ───────────────────────────────────────────
window.calPrevMonth    = calPrevMonth;
window.calNextMonth    = calNextMonth;
window.calRefresh      = calRefresh;
window.calTeamsSignIn  = calTeamsSignIn;
window.calTeamsRefresh = calTeamsRefresh;
window.calDragStart    = calDragStart;
window.calDrop         = calDrop;

})();
