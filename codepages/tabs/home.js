(function() {

// ─── State ────────────────────────────────────────────────────
var _tasks     = [];
var _projects  = [];
var _releases  = [];
var _realmLogs = [];
var _icsEvs    = [];

// ─── Helpers ──────────────────────────────────────────────────
function _toDateStr(d) {
  if (!d) return '';
  return String(d).split('T')[0];
}

function _todayStr() {
  var t = new Date();
  return t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0');
}

function _weekDates() {
  // Returns array of 7 date strings starting from today
  var dates = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(); d.setDate(d.getDate() + i);
    dates.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'));
  }
  return dates;
}

function _fmtDateLabel(ds) {
  var parts = ds.split('-');
  var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  var dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return dow + ' ' + mon + ' ' + d.getDate();
}

function _priorityBadge(p) {
  if (!p) return '';
  var cls = /critical/i.test(p) ? 'badge-danger' : /high/i.test(p) ? 'badge-warning' : /medium/i.test(p) ? 'badge-info' : 'badge-neutral';
  return '<span class="badge ' + cls + '" style="font-size:10px">' + escapeHtml(p) + '</span>';
}

// Items active on a given date (tasks and projects spanning that date, ICS events)
function _itemsForDate(ds) {
  var items = [];

  _tasks.forEach(function(t) {
    var s = _toDateStr(t.startDate), e = _toDateStr(t.estEndDate);
    if (s && e && ds >= s && ds <= e) items.push({ type:'task', id:t.id, item:t, label: t.name, priority: t.priority, assignedTo: t.assignedTo, color:'#68B6E5' });
    else if (!s && e === ds)           items.push({ type:'task', id:t.id, item:t, label: t.name, priority: t.priority, assignedTo: t.assignedTo, color:'#68B6E5', badge:'due' });
  });

  _projects.forEach(function(p) {
    var s = _toDateStr(p.estStartDate), e = _toDateStr(p.estEndDate);
    if (s && e && ds >= s && ds <= e) items.push({ type:'project', id:p.id, item:p, label: p.name, color:'#82c96a' });
  });

  _releases.forEach(function(r) {
    var s = _toDateStr(r.startDate), e = _toDateStr(r.estEndDate);
    if (s && e && ds >= s && ds <= e) items.push({ type:'release', id:r.id, item:r, label: r.name, color:'#e8a860' });
  });

  _icsEvs.forEach(function(ev) {
    var s = ev.start, e = ev.end || ev.start;
    if (ds >= s && ds <= e) items.push({ type:'ics', label: ev.name, color:'#9b59b6' });
  });

  return items;
}

// ─── Tab Registration ─────────────────────────────────────────
registerTab('home', {
  icon:  ICONS.scheduler,
  label: 'Home',
  roles: [],

  onInit: async function() {
    var c = document.getElementById('tab-home');
    if (c) c.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';
    await _loadAll();
    _render();
  },

  onActivate: function() {},
  onDeactivate: function() {},
  onSearch: function() {}
});

// ─── Data Loading ─────────────────────────────────────────────
async function _loadAll() {
  var icsUrl = (window._icsUtils && window._icsUtils.getICSUrl) ? window._icsUtils.getICSUrl() : '';

  var RL = FIELD.REALM_LOGS;
  var results = await Promise.all([
    qbQueryAll(TABLES.tasks,    [3, 6, 12, 13, 125, FIELD.TASKS.startDate, FIELD.TASKS.estEndDate], null),
    qbQueryAll(TABLES.projects, [3, 16, 28, 27, 23, 24], null),
    qbQueryAll(TABLES.releases, [3, FIELD.RELEASES.releaseName, FIELD.RELEASES.startDate, FIELD.RELEASES.estEndDate], null),
    qbQuery(TABLES.realmLogs,   [3, RL.dateCreated, RL.action, RL.details, RL.lastModifiedBy, RL.appName, RL.userFirstName, RL.userLastName, RL.accessUserName, RL.accessPermission], null, [{fieldId: RL.dateCreated, order: 'DESC'}], 30).then(function(r){ return r.records; }),
    icsUrl && window._icsUtils ? window._icsUtils.fetchICS(icsUrl) : Promise.resolve([]),
  ]);

  _releases = results[2].map(function(r) {
    return {
      id:         val(r, 3),
      name:       val(r, FIELD.RELEASES.releaseName) || '',
      startDate:  val(r, FIELD.RELEASES.startDate)   || '',
      estEndDate: val(r, FIELD.RELEASES.estEndDate)  || '',
    };
  });

  var RL = FIELD.REALM_LOGS;
  _realmLogs = (results[3] || []).map(function(r) {
    return {
      id:             val(r, 3),
      dateCreated:    val(r, RL.dateCreated)     || '',
      action:         val(r, RL.action)          || '',
      details:        val(r, RL.details)         || '',
      lastModifiedBy: val(r, RL.lastModifiedBy)  || '',
      appName:        val(r, RL.appName)         || '',
      userFirstName:  val(r, RL.userFirstName)   || '',
      userLastName:   val(r, RL.userLastName)    || '',
      accessUserName: val(r, RL.accessUserName)  || '',
      accessPermission: val(r, RL.accessPermission) || '',
    };
  });

  _icsEvs = results[4];

  _tasks = results[0].map(function(r) {
    return {
      id:         val(r, 3),
      name:       val(r, FIELD.TASKS.name)       || '',
      status:     val(r, FIELD.TASKS.status)     || '',
      priority:   val(r, FIELD.TASKS.priority)   || '',
      assignedTo: val(r, FIELD.TASKS.assignedTo) || '',
      startDate:  val(r, FIELD.TASKS.startDate)  || '',
      estEndDate: val(r, FIELD.TASKS.estEndDate) || '',
    };
  });

  _projects = results[1].map(function(r) {
    return {
      id:           val(r, 3),
      name:         val(r, FIELD.PROJECTS.name)         || '',
      status:       val(r, FIELD.PROJECTS.status)       || '',
      priority:     val(r, FIELD.PROJECTS.priority)     || '',
      estStartDate: val(r, FIELD.PROJECTS.estStartDate) || '',
      estEndDate:   val(r, FIELD.PROJECTS.estEndDate)   || '',
    };
  });

}

// ─── Render ───────────────────────────────────────────────────
function _render() {
  var c = document.getElementById('tab-home');
  if (!c) return;

  var today     = _todayStr();
  var weekDates = _weekDates();

  // Stats
  var openTasks   = _tasks.filter(function(t)    { return !/complete|done|closed/i.test(t.status); });
  var activeProjs = _projects.filter(function(p) { return !/complete|done|closed/i.test(p.status); });
  var todayItems  = _itemsForDate(today);
  var overdue     = _tasks.filter(function(t) {
    var e = _toDateStr(t.estEndDate);
    return e && e < today && !/complete|done|closed/i.test(t.status);
  });

  function statCard(value, label, color) {
    return '<div style="flex:1;min-width:120px;background:var(--surface);border:1px solid var(--border);' +
      'border-radius:8px;padding:16px;border-top:3px solid ' + color + '">' +
      '<div style="font-size:28px;font-weight:700;color:var(--text)">' + value + '</div>' +
      '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">' + label + '</div>' +
    '</div>';
  }

  function sectionHeader(title) {
    return '<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;' +
      'letter-spacing:0.5px;margin:24px 0 10px">' + escapeHtml(title) + '</div>';
  }

  function itemRow(item) {
    var clickable = item.type !== 'ics' && item.id;
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;' +
      'background:var(--surface);border:1px solid var(--border);border-radius:6px;' +
      'border-left:3px solid ' + item.color + ';margin-bottom:4px;' +
      (clickable ? 'cursor:pointer;' : '') + '" ' +
      (clickable ? 'onclick="homeOpenEdit(\'' + item.type + '\',' + item.id + ')"' : '') + '>' +
      '<div style="flex:1;font-size:13px;color:var(--text)">' + escapeHtml(item.label) + '</div>' +
      (item.priority ? _priorityBadge(item.priority) : '') +
      (item.assignedTo ? '<div style="font-size:11px;color:var(--text-dim)">' + escapeHtml(item.assignedTo) + '</div>' : '') +
      (item.badge === 'due' ? '<span class="badge badge-warning" style="font-size:10px">Due Today</span>' : '') +
    '</div>';
  }

  // Build weekly view
  var weekHtml = weekDates.map(function(ds) {
    var items = _itemsForDate(ds);
    var isToday = ds === today;
    return '<div style="flex:1;min-width:0">' +
      '<div style="font-size:11px;font-weight:' + (isToday ? '700':'500') + ';' +
        'color:' + (isToday ? 'var(--accent)':'var(--text-muted)') + ';' +
        'text-align:center;padding:6px 0;border-bottom:1px solid var(--border);' +
        'background:' + (isToday ? 'var(--accent-dim)':'var(--surface)') + ';' +
        'border-radius:6px 6px 0 0">' +
        _fmtDateLabel(ds) +
      '</div>' +
      '<div style="background:var(--surface);border:1px solid var(--border);border-top:none;' +
        'border-radius:0 0 6px 6px;min-height:80px;padding:4px">' +
        (items.length === 0
          ? '<div style="font-size:11px;color:var(--text-dim);text-align:center;padding:12px 4px">—</div>'
          : items.map(function(it) {
              var clickable = it.type !== 'ics' && it.id;
              return '<div ' +
                (clickable ? 'onclick="homeOpenEdit(\'' + it.type + '\',' + it.id + ')" ' : '') +
                'style="font-size:10px;padding:3px 5px;border-radius:3px;margin-bottom:2px;' +
                'background:' + it.color + '22;border-left:2px solid ' + it.color + ';' +
                'color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
                (clickable ? 'cursor:pointer;' : '') + '" ' +
                'title="' + escapeHtml(it.label) + (clickable ? ' (click to edit)' : '') + '">' +
                escapeHtml(it.label) + '</div>';
            }).join('')
        ) +
      '</div>' +
    '</div>';
  }).join('');

  c.innerHTML =
    '<div class="topbar">' +
      '<div class="topbar-left"><span class="page-title">Home</span></div>' +
      '<div class="topbar-right"><button class="btn btn-sm" onclick="homeRefresh()">↺ Refresh</button></div>' +
    '</div>' +

    '<div class="page-body">' +

    // Stats row
    '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px">' +
      statCard(openTasks.length,   'Open Tasks',       '#68B6E5') +
      statCard(activeProjs.length, 'Active Projects',  '#82c96a') +
      statCard(todayItems.length,  'Today\'s Items',   '#9b59b6') +
      statCard(overdue.length,     'Overdue Tasks',    overdue.length > 0 ? '#e86060' : 'var(--border)') +
    '</div>' +

    // Today section
    sectionHeader('Today — ' + _fmtDateLabel(today)) +
    (todayItems.length === 0
      ? '<div class="empty-state" style="padding:16px 0"><div class="empty-state-text">Nothing scheduled for today</div></div>'
      : todayItems.map(itemRow).join('')
    ) +

    // This week
    sectionHeader('This Week') +
    '<div style="display:flex;gap:4px;overflow-x:auto">' + weekHtml + '</div>' +

    // Overdue
    (overdue.length > 0
      ? sectionHeader('Overdue (' + overdue.length + ')') +
        overdue.map(function(t) {
          return itemRow({ label: t.name, priority: t.priority, assignedTo: t.assignedTo, color: '#e86060' });
        }).join('')
      : '') +

    // Realm Activity
    sectionHeader('Recent Realm Activity') +
    (_realmLogs.length === 0
      ? '<div class="empty-state" style="padding:16px 0"><div class="empty-state-text">No realm log entries found</div></div>'
      : '<div style="display:flex;flex-direction:column;gap:3px">' +
        _realmLogs.map(function(log) {
          // Action badge color
          var action = log.action.toLowerCase();
          var badgeCls = /permission|access/i.test(action) ? 'badge-warning' :
                         /add|creat/i.test(action)         ? 'badge-success' :
                         /remov|delet/i.test(action)       ? 'badge-danger'  :
                         /app/i.test(action)               ? 'badge-info'    : 'badge-neutral';

          // Who/what was affected
          var user = [log.userFirstName, log.userLastName].filter(Boolean).join(' ')
                  || log.accessUserName || log.lastModifiedBy || '';
          var app  = log.appName || '';

          // Format date
          var dateStr = log.dateCreated ? String(log.dateCreated).split('T')[0] : '';
          var timeStr = log.dateCreated && String(log.dateCreated).indexOf('T') > -1
            ? String(log.dateCreated).split('T')[1].slice(0,5) : '';

          return '<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 12px;' +
            'background:var(--surface);border:1px solid var(--border);border-radius:6px;' +
            'border-left:3px solid var(--accent)">' +

            // Timestamp
            '<div style="flex-shrink:0;text-align:right;min-width:70px">' +
              '<div style="font-size:11px;color:var(--text-muted)">' + escapeHtml(dateStr) + '</div>' +
              (timeStr ? '<div style="font-size:10px;color:var(--text-dim)">' + escapeHtml(timeStr) + '</div>' : '') +
            '</div>' +

            // Action badge
            '<div style="flex-shrink:0;padding-top:1px">' +
              '<span class="badge ' + badgeCls + '" style="font-size:10px;white-space:nowrap">' +
                escapeHtml(log.action || '—') +
              '</span>' +
            '</div>' +

            // Main content
            '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">' +
              (log.details
                ? '<div style="font-size:12px;color:var(--text);line-height:1.4">' + escapeHtml(log.details) + '</div>'
                : '') +
              (app
                ? '<div style="font-size:11px;color:var(--accent)">App: ' + escapeHtml(app) + '</div>'
                : '') +
              (user
                ? '<div style="font-size:11px;color:var(--text-muted)">User: ' + escapeHtml(user) + '</div>'
                : '') +
              (log.accessPermission
                ? '<div style="font-size:11px;color:var(--text-dim)">Permission: ' + escapeHtml(log.accessPermission) + '</div>'
                : '') +
            '</div>' +

            // Modified by
            (log.lastModifiedBy
              ? '<div style="flex-shrink:0;font-size:10px;color:var(--text-dim);text-align:right">' +
                  escapeHtml(log.lastModifiedBy) +
                '</div>'
              : '') +

          '</div>';
        }).join('') +
        '</div>'
    ) +

    '</div>'; // end page-body
}

// ─── Actions ──────────────────────────────────────────────────
async function homeRefresh() {
  var c = document.getElementById('tab-home');
  if (c) c.innerHTML = '<div class="loading"><div class="spinner"></div> Refreshing...</div>';
  await _loadAll();
  _render();
}

function homeOpenEdit(type, id) {
  var item = type === 'task'    ? _tasks.find(function(x)    { return x.id === id; })
           : type === 'project' ? _projects.find(function(x) { return x.id === id; })
           : type === 'release' ? _releases.find(function(x) { return x.id === id; })
           : null;
  if (!item) return;
  window._openEditModal(type, item, _render);
}

window.homeRefresh   = homeRefresh;
window.homeOpenEdit  = homeOpenEdit;

})();
