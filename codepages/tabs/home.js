(function() {

// ─── State ────────────────────────────────────────────────────
var _tasks     = [];
var _projects  = [];
var _releases  = [];
var _realmLogs = [];
var _icsEvs    = [];
var _notes     = [];
var _calEvs    = [];

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
    if (ds >= s && ds <= e) {
      var qbRec = ev.uid
        ? _calEvs.find(function(c) { return c.uid === ev.uid; })
        : _calEvs.find(function(c) { return c.title === ev.name && c.date === ev.start; });
      items.push({ type:'ics', id: qbRec ? qbRec.id : null, label: ev.name, color:'#9b59b6' });
    }
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
  var NF = FIELD.NOTES;
  var CE = FIELD.CALENDAR_EVENTS;
  var results = await Promise.all([
    qbQueryAll(TABLES.tasks,          [3, 6, 12, 13, 125, FIELD.TASKS.startDate, FIELD.TASKS.estEndDate, FIELD.TASKS.relatedCalEvent], null),
    qbQueryAll(TABLES.projects,       [3, 16, 28, 27, 23, 24], null),
    qbQueryAll(TABLES.releases,       [3, FIELD.RELEASES.releaseName, FIELD.RELEASES.startDate, FIELD.RELEASES.estEndDate], null),
    qbQuery(TABLES.realmLogs,         [3, RL.dateCreated, RL.action, RL.details, RL.lastModifiedBy, RL.appName, RL.userFirstName, RL.userLastName, RL.accessUserName, RL.accessPermission], null, [{fieldId: RL.dateCreated, order: 'DESC'}], 30).then(function(r){ return r.records; }),
    icsUrl && window._icsUtils ? window._icsUtils.fetchICS(icsUrl) : Promise.resolve([]),
    qbQueryAll(TABLES.notes,          [3, NF.name, NF.description, NF.relatedTask, NF.relatedProject, NF.relatedCalEvent], null, [{fieldId: 3, order: 'DESC'}]),
    qbQueryAll(TABLES.calendarEvents, [3, CE.title, CE.date, CE.uid], null),
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

  _notes = results[5].map(function(r) {
    return {
      id:              val(r, 3),
      name:            val(r, NF.name)            || '',
      description:     val(r, NF.description)     || '',
      relatedTask:     val(r, NF.relatedTask)      || '',
      relatedProject:  val(r, NF.relatedProject)  || '',
      relatedCalEvent: val(r, NF.relatedCalEvent) || '',
    };
  });

  _calEvs = results[6].map(function(r) {
    return {
      id:    val(r, 3),
      title: val(r, CE.title) || '',
      date:  String(val(r, CE.date) || '').split('T')[0],
      uid:   val(r, CE.uid)   || '',
    };
  });
  window._calEvs = _calEvs;

  _tasks = results[0].map(function(r) {
    return {
      id:              val(r, 3),
      name:            val(r, FIELD.TASKS.name)            || '',
      status:          val(r, FIELD.TASKS.status)          || '',
      priority:        val(r, FIELD.TASKS.priority)        || '',
      assignedTo:      val(r, FIELD.TASKS.assignedTo)      || '',
      startDate:       val(r, FIELD.TASKS.startDate)       || '',
      estEndDate:      val(r, FIELD.TASKS.estEndDate)      || '',
      relatedCalEvent: val(r, FIELD.TASKS.relatedCalEvent) || '',
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

  _computeLogDiffs();
}

// ─── Diff Computation ─────────────────────────────────────────
// Annotates each realm log with ._prev when a prior entry for the
// same subject (user + app) had a different value for a tracked field.
function _computeLogDiffs() {
  // Logs arrive DESC; reverse to walk chronologically
  var asc = _realmLogs.slice().reverse();
  var lastSeen = {}; // subjectKey → { permission }

  asc.forEach(function(log) {
    var user = log.accessUserName
            || [log.userFirstName, log.userLastName].filter(Boolean).join(' ')
            || '';
    var parts = [];
    if (user)        parts.push(user.toLowerCase());
    if (log.appName) parts.push(log.appName.toLowerCase());
    var key = parts.join('|||');
    if (!key) return; // nothing to key on

    var prev = lastSeen[key];
    if (prev) {
      log._prev = {};
      if (prev.permission && log.accessPermission && prev.permission !== log.accessPermission) {
        log._prev.permission = prev.permission;
      }
    } else {
      log._prev = null;
    }

    // Always update lastSeen — carry forward if current entry doesn't have a value
    lastSeen[key] = {
      permission: log.accessPermission || (prev && prev.permission) || '',
    };
  });
}

// ─── Notes helpers ────────────────────────────────────────────
function _projectName(id) {
  var p = _projects.find(function(p) { return p.id == id; });
  return p ? p.name : '';
}
function _taskName(id) {
  var t = _tasks.find(function(t) { return t.id == id; });
  return t ? t.name : '';
}

// ─── Three-Column Panel ───────────────────────────────────────
function _renderThreeCol(today) {
  var openTasks = _tasks
    .filter(function(t) { return !/complete|done|closed/i.test(t.status); })
    .sort(function(a, b) {
      var order = {'01-critical':0,'02-high':1,'03-medium':2,'04-low':3};
      var ap = order[(a.priority||'').toLowerCase()]; if (ap == null) ap = 4;
      var bp = order[(b.priority||'').toLowerCase()]; if (bp == null) bp = 4;
      return ap - bp;
    });
  var todayItems = _itemsForDate(today);

  function colWrap(id, extra, header, body) {
    return '<div id="' + id + '" style="flex:1;min-width:200px;background:var(--surface);' +
      'border:1px solid var(--border);border-radius:8px;display:flex;flex-direction:column;' +
      'max-height:480px;' + (extra||'') + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;' +
        'border-bottom:2px solid var(--border);flex-shrink:0">' + header + '</div>' +
      '<div style="overflow-y:auto;flex:1;padding:8px;display:flex;flex-direction:column;gap:5px">' +
        body +
      '</div>' +
    '</div>';
  }

  function colTitle(label) {
    return '<span style="font-size:12px;font-weight:600;color:var(--text)">' + label + '</span>';
  }
  function colBtn(label, onclick) {
    return '<button class="btn btn-sm" onclick="' + onclick + '">' + label + '</button>';
  }
  function empty(msg) {
    return '<div style="font-size:12px;color:var(--text-dim);text-align:center;padding:20px 8px">' + msg + '</div>';
  }

  // ── Notes ──
  var notesBody = _notes.length === 0 ? empty('No notes yet') :
    _notes.map(function(n) {
      var linkedTask    = n.relatedTask    ? _taskName(n.relatedTask)       : '';
      var linkedProject = n.relatedProject ? _projectName(n.relatedProject) : '';
      return '<div onclick="homeEditNote(' + n.id + ')" ' +
        'style="background:var(--bg);border:1px solid var(--border);border-radius:6px;' +
        'padding:8px 10px;position:relative;cursor:pointer">' +
        '<div style="font-size:12px;font-weight:600;color:var(--text);padding-right:18px;margin-bottom:3px">' + escapeHtml(n.name || '(Untitled)') + '</div>' +
        (n.description ? '<div style="font-size:12px;color:var(--text-muted);white-space:pre-wrap;line-height:1.5;margin-bottom:4px">' + escapeHtml(n.description) + '</div>' : '') +
        ((linkedTask || linkedProject)
          ? '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
            (linkedTask    ? '<span style="font-size:10px;color:var(--text-dim);background:var(--border);padding:1px 6px;border-radius:10px">Task: ' + escapeHtml(linkedTask) + '</span>' : '') +
            (linkedProject ? '<span style="font-size:10px;color:var(--text-dim);background:var(--border);padding:1px 6px;border-radius:10px">Project: ' + escapeHtml(linkedProject) + '</span>' : '') +
          '</div>'
          : '') +
        '<button onclick="event.stopPropagation();homeDeleteNote(' + n.id + ')" title="Delete" ' +
          'style="position:absolute;top:5px;right:7px;background:none;border:none;' +
            'color:var(--text-dim);cursor:pointer;font-size:15px;line-height:1;padding:0">×</button>' +
      '</div>';
    }).join('');

  var notesCol = colWrap('home-notes-col', '',
    colTitle('Notes') + colBtn('+ Note', 'homeAddNote()'),
    notesBody);

  // ── Tasks ──
  var tasksBody = openTasks.length === 0 ? empty('No open tasks') :
    openTasks.map(function(t) {
      var priColor = /critical/i.test(t.priority) ? '#e86060' :
                     /high/i.test(t.priority)     ? '#e8a860' :
                     /medium/i.test(t.priority)   ? '#68B6E5' : 'var(--text-dim)';
      var due = t.estEndDate ? String(t.estEndDate).split('T')[0] : '';
      var overdue = due && due < today;
      return '<div draggable="true" ondragstart="homeTaskDragStart(event,' + t.id + ')" ' +
        'onclick="homeOpenEdit(\'task\',' + t.id + ')" ' +
        'style="background:var(--bg);border:1px solid var(--border);border-left:3px solid #68B6E5;' +
          'border-radius:6px;padding:7px 10px;cursor:pointer;display:flex;flex-direction:column;gap:3px" ' +
        'title="Drag to Today to schedule · Click to edit">' +
        '<div style="font-size:12px;color:var(--text);line-height:1.3">' + escapeHtml(t.name) + '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
          (t.priority ? '<span style="font-size:10px;color:' + priColor + '">' + escapeHtml(t.priority) + '</span>' : '') +
          (t.assignedTo ? '<span style="font-size:10px;color:var(--text-dim)">' + escapeHtml(t.assignedTo) + '</span>' : '') +
          (due ? '<span style="font-size:10px;color:' + (overdue ? '#e86060' : 'var(--text-dim)') + ';margin-left:auto">' +
            (overdue ? '⚠ ' : '') + 'Due ' + due + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');

  var tasksCol = colWrap('home-tasks-col', '',
    colTitle('My Tasks (' + openTasks.length + ')') + colBtn('+ Task', 'homeNewTask()'),
    tasksBody);

  // ── Today ──
  var todayBody = todayItems.length === 0 ? empty('Nothing scheduled today') :
    todayItems.map(function(it) {
      var clickable = it.id != null;
      var handler   = it.type === 'ics'
        ? 'homeOpenCalEvent(' + it.id + ')'
        : 'homeOpenEdit(\'' + it.type + '\',' + it.id + ')';
      return '<div ' +
        (clickable ? 'onclick="' + handler + '" ' : '') +
        'style="background:var(--bg);border:1px solid var(--border);border-left:3px solid ' + it.color + ';' +
          'border-radius:6px;padding:7px 10px;' + (clickable ? 'cursor:pointer;' : '') + '">' +
        '<div style="font-size:12px;color:var(--text);line-height:1.3">' + escapeHtml(it.label) + '</div>' +
        '<div style="font-size:10px;color:var(--text-dim);margin-top:2px;text-transform:capitalize">' + escapeHtml(it.type) + '</div>' +
      '</div>';
    }).join('');

  var todayCol = colWrap('home-today-col', '',
    colTitle(_fmtDateLabel(today)),
    '<div id="home-today-drop" ' +
      'ondragover="event.preventDefault();document.getElementById(\'home-today-drop\').style.outline=\'2px dashed var(--accent)\'" ' +
      'ondragleave="document.getElementById(\'home-today-drop\').style.outline=\'none\'" ' +
      'ondrop="homeTodayDrop(event)" ' +
      'style="display:flex;flex-direction:column;gap:5px;min-height:60px;border-radius:6px;padding:2px;transition:outline 0.1s">' +
      todayBody +
      '<div style="font-size:10px;color:var(--text-dim);text-align:center;padding:6px;border:1px dashed var(--border);border-radius:6px;margin-top:4px">Drop task here to schedule for today</div>' +
    '</div>');

  return '<div style="display:flex;gap:12px;align-items:flex-start">' +
    notesCol + tasksCol + todayCol +
  '</div>';
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
    var clickable = item.id != null;
    var handler   = item.type === 'ics'
      ? 'homeOpenCalEvent(' + item.id + ')'
      : 'homeOpenEdit(\'' + item.type + '\',' + item.id + ')';
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;' +
      'background:var(--surface);border:1px solid var(--border);border-radius:6px;' +
      'border-left:3px solid ' + item.color + ';margin-bottom:4px;' +
      (clickable ? 'cursor:pointer;' : '') + '" ' +
      (clickable ? 'onclick="' + handler + '"' : '') + '>' +
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
              var clickable = it.id != null;
              var handler   = it.type === 'ics'
                ? 'homeOpenCalEvent(' + it.id + ')'
                : 'homeOpenEdit(\'' + it.type + '\',' + it.id + ')';
              return '<div ' +
                (clickable ? 'onclick="' + handler + '" ' : '') +
                'style="font-size:10px;padding:3px 5px;border-radius:3px;margin-bottom:2px;' +
                'background:' + it.color + '22;border-left:2px solid ' + it.color + ';' +
                'color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
                (clickable ? 'cursor:pointer;' : '') + '" ' +
                'title="' + escapeHtml(it.label) + (clickable ? ' (click to open)' : '') + '">' +
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

    // Three-column panel
    sectionHeader('') +
    _renderThreeCol(today) +

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
                  ? '<div style="font-size:11px;color:var(--text-muted)"><span style="color:var(--text-dim)">Perm:</span> ' +
                    (log._prev && log._prev.permission
                      ? '<span style="color:var(--text-dim);text-decoration:line-through">' + escapeHtml(log._prev.permission) + '</span>' +
                        ' → <span style="color:' + color + '">' + escapeHtml(log.accessPermission) + '</span>'
                      : escapeHtml(log.accessPermission)) +
                    '</div>'
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
      (log.accessPermission
        ? '<div style="display:flex;flex-direction:column;gap:2px;padding:10px 0;border-bottom:1px solid var(--border)">' +
            '<div style="font-size:10px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.4px">Access Permission</div>' +
            (log._prev && log._prev.permission
              ? '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
                  '<span style="font-size:13px;color:var(--text-dim);text-decoration:line-through">' + escapeHtml(log._prev.permission) + '</span>' +
                  '<span style="color:var(--text-dim)">→</span>' +
                  '<span style="font-size:13px;font-weight:600;color:' + color + '">' + escapeHtml(log.accessPermission) + '</span>' +
                  '<span style="font-size:10px;color:var(--text-dim);background:var(--border);padding:1px 6px;border-radius:10px">changed</span>' +
                '</div>'
              : '<div style="font-size:13px;color:var(--text)">' + escapeHtml(log.accessPermission) + '</div>') +
          '</div>'
        : '') +
      field('Modified By',    log.lastModifiedBy) +
      '<div style="padding-top:14px;display:flex;justify-content:flex-end">' +
        '<button class="btn btn-sm" id="rlm-close">Close</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  document.getElementById('rlm-close').onclick = function() { document.body.removeChild(modal); };
  modal.addEventListener('click', function(e) { if (e.target === modal) document.body.removeChild(modal); });
}

// ─── Notes Actions ────────────────────────────────────────────
function homeAddNote() {
  function inputRow(lbl, id, type) {
    return '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<label style="font-size:11px;color:var(--text-muted)">' + lbl + '</label>' +
      '<input id="' + id + '" type="' + (type||'text') + '" ' +
        'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
          'padding:7px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
    '</div>';
  }
  function selectRow(lbl, id, optionsHtml) {
    return '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<label style="font-size:11px;color:var(--text-muted)">' + lbl + '</label>' +
      '<select id="' + id + '" style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
        'padding:7px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
        optionsHtml +
      '</select>' +
    '</div>';
  }

  var taskOptions   = '<option value="">— None —</option>' +
    _tasks.map(function(t) { return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>'; }).join('');
  var projectOptions = '<option value="">— None —</option>' +
    _projects.map(function(p) { return '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>'; }).join('');
  var calEventOptions = '<option value="">— None —</option>' +
    _calEvs.map(function(c) { return '<option value="' + c.id + '">' + escapeHtml(c.title) + ' (' + c.date + ')</option>'; }).join('');

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-top:3px solid #9b59b6;' +
      'border-radius:10px;padding:24px;width:420px;max-width:92vw;display:flex;flex-direction:column;gap:14px">' +
      '<div style="font-size:15px;font-weight:600;color:var(--text)">New Note</div>' +
      inputRow('Title *', 'nm-name') +
      '<div style="display:flex;flex-direction:column;gap:4px">' +
        '<label style="font-size:11px;color:var(--text-muted)">Description</label>' +
        '<textarea id="nm-desc" rows="5" ' +
          'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
            'padding:8px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box;resize:vertical"></textarea>' +
      '</div>' +
      selectRow('Related Task (optional)',           'nm-task',     taskOptions) +
      selectRow('Related Project (optional)',         'nm-project',  projectOptions) +
      selectRow('Related Calendar Event (optional)', 'nm-calevent', calEventOptions) +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn btn-sm" id="nm-cancel">Cancel</button>' +
        '<button class="btn btn-sm btn-primary" id="nm-save">Save</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  document.getElementById('nm-name').focus();
  document.getElementById('nm-cancel').onclick = function() { document.body.removeChild(modal); };
  document.getElementById('nm-save').onclick = async function() {
    var name = document.getElementById('nm-name').value.trim();
    if (!name) { showToast('Title is required', 'error'); return; }
    try {
      var NF  = FIELD.NOTES;
      var rec = {};
      rec[NF.name]        = { value: name };
      rec[NF.description] = { value: document.getElementById('nm-desc').value.trim() };
      var taskId    = document.getElementById('nm-task').value;
      var projectId = document.getElementById('nm-project').value;
      var calEvId   = document.getElementById('nm-calevent').value;
      if (taskId)    rec[NF.relatedTask]      = { value: parseInt(taskId) };
      if (projectId) rec[NF.relatedProject]   = { value: parseInt(projectId) };
      if (calEvId)   rec[NF.relatedCalEvent]  = { value: parseInt(calEvId) };
      await qbUpsert(TABLES.notes, [rec], [3]);
      document.body.removeChild(modal);
      showToast('Note saved', 'success');
      await _loadAll();
      _render();
    } catch(e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };
  modal.addEventListener('click', function(e) { if (e.target === modal) document.body.removeChild(modal); });
}

function homeEditNote(id) {
  id = parseInt(id);
  var n = _notes.find(function(n) { return parseInt(n.id) === id; });
  if (!n) return;

  function inputRow(lbl, elId, value) {
    return '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<label style="font-size:11px;color:var(--text-muted)">' + lbl + '</label>' +
      '<input id="' + elId + '" type="text" value="' + escapeHtml(value || '') + '" ' +
        'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
          'padding:7px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
    '</div>';
  }
  function selectRow(lbl, elId, optionsHtml) {
    return '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<label style="font-size:11px;color:var(--text-muted)">' + lbl + '</label>' +
      '<select id="' + elId + '" style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
        'padding:7px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
        optionsHtml +
      '</select>' +
    '</div>';
  }

  var taskOptions = '<option value="">— None —</option>' +
    _tasks.map(function(t) {
      return '<option value="' + t.id + '"' + (String(n.relatedTask) === String(t.id) ? ' selected' : '') + '>' + escapeHtml(t.name) + '</option>';
    }).join('');
  var projectOptions = '<option value="">— None —</option>' +
    _projects.map(function(p) {
      return '<option value="' + p.id + '"' + (String(n.relatedProject) === String(p.id) ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>';
    }).join('');
  var calEventOptions = '<option value="">— None —</option>' +
    _calEvs.map(function(c) {
      return '<option value="' + c.id + '"' + (String(n.relatedCalEvent) === String(c.id) ? ' selected' : '') + '>' + escapeHtml(c.title) + ' (' + c.date + ')</option>';
    }).join('');

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-top:3px solid #9b59b6;' +
      'border-radius:10px;padding:24px;width:420px;max-width:92vw;display:flex;flex-direction:column;gap:14px">' +
      '<div style="font-size:15px;font-weight:600;color:var(--text)">Edit Note</div>' +
      inputRow('Title *', 'nem-name', n.name) +
      '<div style="display:flex;flex-direction:column;gap:4px">' +
        '<label style="font-size:11px;color:var(--text-muted)">Description</label>' +
        '<textarea id="nem-desc" rows="5" ' +
          'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
            'padding:8px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box;resize:vertical">' +
          escapeHtml(n.description || '') +
        '</textarea>' +
      '</div>' +
      selectRow('Related Task (optional)',           'nem-task',     taskOptions) +
      selectRow('Related Project (optional)',         'nem-project',  projectOptions) +
      selectRow('Related Calendar Event (optional)', 'nem-calevent', calEventOptions) +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn btn-sm" id="nem-cancel">Cancel</button>' +
        '<button class="btn btn-sm btn-primary" id="nem-save">Save</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  document.getElementById('nem-cancel').onclick = function() { document.body.removeChild(modal); };
  document.getElementById('nem-save').onclick = async function() {
    var name = document.getElementById('nem-name').value.trim();
    if (!name) { showToast('Title is required', 'error'); return; }
    try {
      var NF  = FIELD.NOTES;
      var rec = { 3: { value: n.id } };
      rec[NF.name]        = { value: name };
      rec[NF.description] = { value: document.getElementById('nem-desc').value.trim() };
      var taskId    = document.getElementById('nem-task').value;
      var projectId = document.getElementById('nem-project').value;
      var calEvId   = document.getElementById('nem-calevent').value;
      rec[NF.relatedTask]      = { value: taskId    ? parseInt(taskId)    : '' };
      rec[NF.relatedProject]   = { value: projectId ? parseInt(projectId) : '' };
      rec[NF.relatedCalEvent]  = { value: calEvId   ? parseInt(calEvId)   : '' };
      await qbUpsert(TABLES.notes, [rec], [3]);
      document.body.removeChild(modal);
      showToast('Note saved', 'success');
      await _loadAll();
      _render();
    } catch(e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };
  modal.addEventListener('click', function(e) { if (e.target === modal) document.body.removeChild(modal); });
}

async function homeDeleteNote(id) {
  id = parseInt(id);
  if (!confirm('Delete this note?')) return;
  try {
    await qbDelete(TABLES.notes, '{3.EX.' + id + '}');
    showToast('Note deleted', 'success');
    await _loadAll();
    _render();
  } catch(e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// ─── New Task ─────────────────────────────────────────────────
function homeNewTask() {
  function inputRow(lbl, id, type, value, placeholder) {
    return '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<label style="font-size:11px;color:var(--text-muted)">' + lbl + '</label>' +
      '<input id="' + id + '" type="' + (type||'text') + '" value="' + escapeHtml(value||'') + '" ' +
        (placeholder ? 'placeholder="' + escapeHtml(placeholder) + '" ' : '') +
        'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
          'padding:7px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
    '</div>';
  }
  function selectRow(lbl, id, options) {
    return '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<label style="font-size:11px;color:var(--text-muted)">' + lbl + '</label>' +
      '<select id="' + id + '" style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
        'padding:7px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
        options.map(function(o) { return '<option>' + escapeHtml(o) + '</option>'; }).join('') +
      '</select>' +
    '</div>';
  }

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-top:3px solid #68B6E5;' +
      'border-radius:10px;padding:24px;width:400px;max-width:92vw;display:flex;flex-direction:column;gap:14px">' +
      '<div style="font-size:15px;font-weight:600;color:var(--text)">New Task</div>' +
      inputRow('Name *', 'ntm-name', 'text', '', 'Task name') +
      selectRow('Priority', 'ntm-priority', ['03-Medium','01-Critical','02-High','04-Low']) +
      inputRow('Assigned To', 'ntm-assignedTo', 'text', '') +
      inputRow('Start Date', 'ntm-startDate', 'date', '') +
      inputRow('Est End Date', 'ntm-estEndDate', 'date', '') +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn btn-sm" id="ntm-cancel">Cancel</button>' +
        '<button class="btn btn-sm btn-primary" id="ntm-save">Create</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  document.getElementById('ntm-name').focus();
  document.getElementById('ntm-cancel').onclick = function() { document.body.removeChild(modal); };
  document.getElementById('ntm-save').onclick = async function() {
    var name = document.getElementById('ntm-name').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }
    try {
      var rec = {};
      rec[FIELD.TASKS.name]       = { value: name };
      rec[FIELD.TASKS.priority]   = { value: document.getElementById('ntm-priority').value };
      rec[FIELD.TASKS.assignedTo] = { value: document.getElementById('ntm-assignedTo').value.trim() };
      rec[FIELD.TASKS.status]     = { value: 'Open' };
      var sd = document.getElementById('ntm-startDate').value;
      var ed = document.getElementById('ntm-estEndDate').value;
      if (sd) rec[FIELD.TASKS.startDate]  = { value: sd };
      if (ed) rec[FIELD.TASKS.estEndDate] = { value: ed };
      await qbUpsert(TABLES.tasks, [rec], [3]);
      document.body.removeChild(modal);
      showToast('Task created', 'success');
      await _loadAll();
      _render();
    } catch(e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };
  modal.addEventListener('click', function(e) { if (e.target === modal) document.body.removeChild(modal); });
}

// ─── Task → Today drag ────────────────────────────────────────
function homeTaskDragStart(e, id) {
  e.dataTransfer.setData('text/plain', String(id));
  e.dataTransfer.effectAllowed = 'move';
}

async function homeTodayDrop(e) {
  e.preventDefault();
  var dropEl = document.getElementById('home-today-drop');
  if (dropEl) dropEl.style.outline = 'none';
  var id = parseInt(e.dataTransfer.getData('text/plain'));
  if (!id) return;
  var today = _todayStr();
  var task  = _tasks.find(function(t) { return t.id === id; });
  if (!task) return;
  try {
    var rec = { 3: { value: id } };
    rec[FIELD.TASKS.startDate]  = { value: today };
    rec[FIELD.TASKS.estEndDate] = { value: today };
    await qbUpsert(TABLES.tasks, [rec], [3]);
    task.startDate  = today;
    task.estEndDate = today;
    showToast('Task scheduled for today', 'success');
    _render();
  } catch(err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

function homeOpenCalEvent(id) {
  id = parseInt(id);
  // Delegate to calendar module if loaded, otherwise use _calEvs directly
  if (typeof window.calOpenCalEvent === 'function') {
    window.calOpenCalEvent(id);
    return;
  }
  // Fallback: simple read-only modal using home's own _calEvs
  var ev = _calEvs.find(function(c) { return parseInt(c.id) === id; });
  if (!ev) return;
  function field(label, value) {
    if (!value) return '';
    return '<div style="display:flex;flex-direction:column;gap:2px;padding:8px 0;border-bottom:1px solid var(--border)">' +
      '<div style="font-size:10px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.4px">' + label + '</div>' +
      '<div style="font-size:13px;color:var(--text)">' + escapeHtml(String(value)) + '</div>' +
    '</div>';
  }
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-top:3px solid #9b59b6;' +
      'border-radius:10px;padding:24px;width:400px;max-width:92vw;display:flex;flex-direction:column;gap:0;max-height:85vh;overflow-y:auto">' +
      '<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:12px">' + escapeHtml(ev.title) + '</div>' +
      field('Date', ev.date) +
      field('Start Time', ev.startTime) +
      field('End Time',   ev.endTime) +
      '<div style="padding-top:14px;display:flex;justify-content:flex-end">' +
        '<button class="btn btn-sm" id="hcev-close">Close</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  document.getElementById('hcev-close').onclick = function() { document.body.removeChild(modal); };
  modal.addEventListener('click', function(e) { if (e.target === modal) document.body.removeChild(modal); });
}

window.homeRefresh        = homeRefresh;
window.homeOpenEdit       = homeOpenEdit;
window.homeOpenRealmLog   = homeOpenRealmLog;
window.homeOpenCalEvent   = homeOpenCalEvent;
window.homeAddNote        = homeAddNote;
window.homeEditNote       = homeEditNote;
window.homeDeleteNote     = homeDeleteNote;
window.homeNewTask        = homeNewTask;
window.homeTaskDragStart  = homeTaskDragStart;
window.homeTodayDrop      = homeTodayDrop;

})();
