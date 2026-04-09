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

    // Realm Activity — Kanban columns by action type
    sectionHeader('Recent Realm Activity') +
    (_realmLogs.length === 0
      ? '<div class="empty-state" style="padding:16px 0"><div class="empty-state-text">No realm log entries found</div></div>'
      : (function() {
          // Group logs by action type, preserving DESC order within each group
          var groups  = {};
          var colOrder = [];
          _realmLogs.forEach(function(log) {
            var key = log.action || 'Other';
            if (!groups[key]) { groups[key] = []; colOrder.push(key); }
            groups[key].push(log);
          });

          function _colColor(action) {
            var a = action.toLowerCase();
            return /permission|access/i.test(a) ? '#e8a860' :
                   /add|creat/i.test(a)         ? '#82c96a' :
                   /remov|delet/i.test(a)       ? '#e86060' :
                   /app|setting/i.test(a)       ? '#68B6E5' : '#9b59b6';
          }

          var cols = colOrder.map(function(action) {
            var logs  = groups[action];
            var color = _colColor(action);

            var cards = logs.map(function(log) {
              var user = [log.userFirstName, log.userLastName].filter(Boolean).join(' ')
                      || log.accessUserName || '';
              var app  = log.appName || '';
              var dateStr = log.dateCreated ? String(log.dateCreated).split('T')[0] : '';
              var timeStr = log.dateCreated && String(log.dateCreated).indexOf('T') > -1
                ? String(log.dateCreated).split('T')[1].slice(0,5) : '';
              var modBy = log.lastModifiedBy && log.lastModifiedBy !== user ? log.lastModifiedBy : '';

              return '<div onclick="homeOpenRealmLog(' + log.id + ')" ' +
                'style="background:var(--bg);border:1px solid var(--border);border-radius:6px;' +
                'padding:8px 10px;margin-bottom:6px;border-left:3px solid ' + color + ';cursor:pointer" ' +
                'onmouseenter="this.style.borderColor=\'' + color + '\';this.style.background=\'var(--surface)\'" ' +
                'onmouseleave="this.style.borderColor=\'var(--border)\';this.style.background=\'var(--bg)\'">' +
                '<div style="font-size:10px;color:var(--text-dim);margin-bottom:5px">' +
                  escapeHtml(dateStr) + (timeStr ? ' · ' + escapeHtml(timeStr) : '') +
                '</div>' +
                (log.details
                  ? '<div style="font-size:12px;color:var(--text);line-height:1.4;margin-bottom:4px">' + escapeHtml(log.details) + '</div>'
                  : '') +
                (app
                  ? '<div style="font-size:11px;color:var(--text-muted)"><span style="color:var(--text-dim)">App:</span> ' + escapeHtml(app) + '</div>'
                  : '') +
                (user
                  ? '<div style="font-size:11px;color:var(--text-muted)"><span style="color:var(--text-dim)">User:</span> ' + escapeHtml(user) + '</div>'
                  : '') +
                (log.accessPermission
                  ? '<div style="font-size:11px;color:var(--text-muted)"><span style="color:var(--text-dim)">Perm:</span> ' + escapeHtml(log.accessPermission) + '</div>'
                  : '') +
                (modBy
                  ? '<div style="font-size:10px;color:var(--text-dim);margin-top:3px">by ' + escapeHtml(modBy) + '</div>'
                  : '') +
              '</div>';
            }).join('');

            return '<div style="min-width:220px;flex:1;background:var(--surface);border:1px solid var(--border);' +
              'border-radius:8px;overflow:hidden;display:flex;flex-direction:column">' +
              '<div style="padding:8px 12px;background:' + color + '1a;border-bottom:2px solid ' + color + ';' +
                'display:flex;align-items:center;gap:8px;flex-shrink:0">' +
                '<div style="width:8px;height:8px;border-radius:50%;background:' + color + ';flex-shrink:0"></div>' +
                '<span style="font-size:12px;font-weight:600;color:var(--text)">' + escapeHtml(action) + '</span>' +
                '<span style="font-size:10px;color:var(--text-dim);margin-left:auto;background:var(--border);' +
                  'padding:1px 6px;border-radius:10px">' + logs.length + '</span>' +
              '</div>' +
              '<div style="padding:8px;overflow-y:auto;max-height:380px">' + cards + '</div>' +
            '</div>';
          }).join('');

          return '<div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;align-items:flex-start">' + cols + '</div>';
        })()
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

function homeOpenRealmLog(id) {
  var log = _realmLogs.find(function(l) { return l.id === id; });
  if (!log) return;

  function _colColor(action) {
    var a = (action || '').toLowerCase();
    return /permission|access/i.test(a) ? '#e8a860' :
           /add|creat/i.test(a)         ? '#82c96a' :
           /remov|delet/i.test(a)       ? '#e86060' :
           /app|setting/i.test(a)       ? '#68B6E5' : '#9b59b6';
  }

  var color   = _colColor(log.action);
  var user    = [log.userFirstName, log.userLastName].filter(Boolean).join(' ') || log.accessUserName || '';
  var dateStr = log.dateCreated ? String(log.dateCreated).split('T')[0] : '';
  var timeStr = log.dateCreated && String(log.dateCreated).indexOf('T') > -1
    ? String(log.dateCreated).split('T')[1].slice(0,5) : '';

  function field(label, value) {
    if (!value) return '';
    return '<div style="display:flex;flex-direction:column;gap:2px;padding:10px 0;border-bottom:1px solid var(--border)">' +
      '<div style="font-size:10px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.4px">' + label + '</div>' +
      '<div style="font-size:13px;color:var(--text);line-height:1.5;white-space:pre-wrap">' + escapeHtml(value) + '</div>' +
    '</div>';
  }

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-top:3px solid ' + color + ';' +
      'border-radius:10px;padding:24px;width:440px;max-width:92vw;display:flex;flex-direction:column;gap:0;max-height:85vh;overflow-y:auto">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<div style="width:10px;height:10px;border-radius:50%;background:' + color + ';flex-shrink:0"></div>' +
          '<span style="font-size:15px;font-weight:600;color:var(--text)">' + escapeHtml(log.action || 'Realm Log') + '</span>' +
        '</div>' +
        '<span style="font-size:11px;color:var(--text-dim)">' + escapeHtml(dateStr) + (timeStr ? ' · ' + escapeHtml(timeStr) : '') + '</span>' +
      '</div>' +
      field('Details',         log.details) +
      field('App',             log.appName) +
      field('User',            user) +
      field('Access Permission', log.accessPermission) +
      field('Modified By',    log.lastModifiedBy) +
      '<div style="padding-top:14px;display:flex;justify-content:flex-end">' +
        '<button class="btn btn-sm" id="rlm-close">Close</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  document.getElementById('rlm-close').onclick = function() { document.body.removeChild(modal); };
  modal.addEventListener('click', function(e) { if (e.target === modal) document.body.removeChild(modal); });
}

window.homeRefresh      = homeRefresh;
window.homeOpenEdit     = homeOpenEdit;
window.homeOpenRealmLog = homeOpenRealmLog;

})();
