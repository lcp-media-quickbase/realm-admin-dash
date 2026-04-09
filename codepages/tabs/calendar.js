(function() {

// ─── State ────────────────────────────────────────────────────
var _projects    = [];
var _tasks       = [];
var _releases    = [];
var _icsEvents   = [];
var _year        = new Date().getFullYear();
var _month       = new Date().getMonth();
var _dragItem    = null;   // { type: 'task'|'project', id }

// ─── Color scheme ─────────────────────────────────────────────
var COLOR = {
  task:    '#68B6E5',   // blue
  project: '#82c96a',   // green
  release: '#e8a860',   // orange
  ics:     '#9b59b6',   // purple
};
var PROJECT_PALETTE = ['#82c96a','#e8a860','#e86060','#60d4c8','#e860a8','#e8d060','#6a9be8'];
function _projectColor(id) { return PROJECT_PALETTE[id % PROJECT_PALETTE.length]; }

// ─── Month labels ─────────────────────────────────────────────
var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DOW         = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── ICS helpers (also exposed on window for home.js) ─────────
function _getICSUrl()        { try { return localStorage.getItem('cal-ics-url')   || ''; } catch(e) { return ''; } }
function _setICSUrl(url)     { try { localStorage.setItem('cal-ics-url', url);          } catch(e) {} }
function _getProxyUrl()      { try { return localStorage.getItem('cal-proxy-url') || ''; } catch(e) { return ''; } }
function _setProxyUrl(url)   { try { localStorage.setItem('cal-proxy-url', url);         } catch(e) {} }

function _parseICSDate(val) {
  var clean = val.replace(/Z$/, '').split('T')[0];  // YYYYMMDD
  return clean.slice(0,4) + '-' + clean.slice(4,6) + '-' + clean.slice(6,8);
}

function _parseICS(text) {
  var events = [];
  // Unfold continuation lines
  var lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  var unfolded = [];
  lines.forEach(function(l) {
    if ((l[0] === ' ' || l[0] === '\t') && unfolded.length) {
      unfolded[unfolded.length-1] += l.slice(1);
    } else { unfolded.push(l); }
  });
  var inEvent = false, ev = {};
  unfolded.forEach(function(line) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; ev = {}; return; }
    if (line === 'END:VEVENT')   { if (ev.start && ev.name) events.push(ev); inEvent = false; return; }
    if (!inEvent) return;
    var ci = line.indexOf(':');
    if (ci === -1) return;
    var key = line.slice(0, ci).split(';')[0];
    var val = line.slice(ci + 1);
    if      (key === 'DTSTART')  ev.start = _parseICSDate(val);
    else if (key === 'DTEND')    ev.end   = _parseICSDate(val);
    else if (key === 'SUMMARY')  ev.name  = val.replace(/\\,/g,',').replace(/\\n/g,' ').trim();
  });
  return events;
}

async function _fetchICS(url) {
  if (!url) return [];
  try {
    var proxy = _getProxyUrl();
    var fetchUrl = proxy ? proxy + '?url=' + encodeURIComponent(url) : url;
    var resp = await fetch(fetchUrl);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var text = await resp.text();
    return _parseICS(text);
  } catch(e) {
    showToast('Could not load ICS calendar: ' + e.message, 'error');
    return [];
  }
}

// Expose so home.js can reuse
window._icsUtils = { getICSUrl: _getICSUrl, fetchICS: _fetchICS };

// ─── Tab Registration ─────────────────────────────────────────
registerTab('calendar', {
  icon:  ICONS.scheduler,
  label: 'Calendar',
  roles: [],

  onInit: async function() {
    var c = document.getElementById('tab-calendar');
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
  var icsUrl = _getICSUrl();
  var results = await Promise.all([
    qbQueryAll(TABLES.projects,  [3, 16, 28, 27, 23, 24], null),
    qbQueryAll(TABLES.tasks,     [3, 6, 12, 13, 125, 48, FIELD.TASKS.startDate, FIELD.TASKS.estEndDate], null),
    qbQueryAll(TABLES.releases,  [3, FIELD.RELEASES.releaseName, FIELD.RELEASES.startDate, FIELD.RELEASES.estEndDate], null),
    _fetchICS(icsUrl),
  ]);

  _projects = results[0].map(function(r) {
    return {
      id:           val(r, 3),
      name:         val(r, FIELD.PROJECTS.name)         || '',
      status:       val(r, FIELD.PROJECTS.status)       || '',
      estStartDate: val(r, FIELD.PROJECTS.estStartDate) || '',
      estEndDate:   val(r, FIELD.PROJECTS.estEndDate)   || '',
    };
  });

  _tasks = results[1].map(function(r) {
    return {
      id:         val(r, 3),
      name:       val(r, FIELD.TASKS.name)      || '',
      status:     val(r, FIELD.TASKS.status)    || '',
      priority:   val(r, FIELD.TASKS.priority)  || '',
      assignedTo: val(r, FIELD.TASKS.assignedTo)|| '',
      startDate:  val(r, FIELD.TASKS.startDate) || '',
      estEndDate: val(r, FIELD.TASKS.estEndDate)|| '',
    };
  });

  _releases = results[2].map(function(r) {
    return {
      id:        val(r, 3),
      name:      val(r, FIELD.RELEASES.releaseName) || '',
      startDate: val(r, FIELD.RELEASES.startDate)   || '',
      estEndDate:val(r, FIELD.RELEASES.estEndDate)  || '',
    };
  });

  _icsEvents = results[3];
}

// ─── Events on a given date ───────────────────────────────────
function _eventsForDate(ds) {
  var evs = [];
  _projects.forEach(function(p) {
    if (!p.estStartDate || !p.estEndDate) return;
    var s = p.estStartDate.split('T')[0], e = p.estEndDate.split('T')[0];
    if (ds >= s && ds <= e) evs.push({ label: p.name, color: _projectColor(p.id), type: 'project', id: p.id });
  });
  _tasks.forEach(function(t) {
    if (!t.startDate || !t.estEndDate) return;
    var s = t.startDate.split('T')[0], e = t.estEndDate.split('T')[0];
    if (ds >= s && ds <= e) evs.push({ label: t.name, color: COLOR.task, type: 'task', id: t.id });
  });
  _releases.forEach(function(r) {
    if (!r.startDate || !r.estEndDate) return;
    var s = r.startDate.split('T')[0], e = r.estEndDate.split('T')[0];
    if (ds >= s && ds <= e) evs.push({ label: r.name, color: COLOR.release, type: 'release', id: r.id });
  });
  _icsEvents.forEach(function(ev) {
    var s = ev.start, e = ev.end || ev.start;
    if (ds >= s && ds <= e) evs.push({ label: ev.name, color: COLOR.ics, type: 'ics', id: null });
  });
  return evs;
}

// ─── Render ───────────────────────────────────────────────────
function _render() {
  var c = document.getElementById('tab-calendar');
  if (!c) return;

  var today    = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

  // Build grid cells
  var firstDay = new Date(_year, _month, 1);
  var lastDay  = new Date(_year, _month + 1, 0);
  var cells    = [];
  for (var pad = 0; pad < firstDay.getDay(); pad++) cells.push(null);
  for (var d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(_year, _month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  var unscheduledTasks    = _tasks.filter(function(t)    { return !t.startDate; });
  var unscheduledProjects = _projects.filter(function(p) { return !p.estStartDate; });
  var unscheduledReleases = _releases.filter(function(r) { return !r.startDate; });
  var icsConfigured       = !!_getICSUrl();

  c.innerHTML =
    // Topbar
    '<div class="topbar">' +
      '<div class="topbar-left" style="gap:6px">' +
        '<button class="btn btn-sm" onclick="calPrevMonth()">‹</button>' +
        '<span style="font-size:14px;font-weight:600;min-width:160px;text-align:center">' +
          MONTH_NAMES[_month] + ' ' + _year +
        '</span>' +
        '<button class="btn btn-sm" onclick="calNextMonth()">›</button>' +
      '</div>' +
      '<div class="topbar-right">' +
        '<button class="btn btn-sm" onclick="calICSSettings()" title="Configure calendar feed" ' +
          'style="' + (icsConfigured ? 'border-color:var(--accent);color:var(--accent)' : '') + '">' +
          (icsConfigured ? '● Calendar Feed' : '+ Calendar Feed') +
        '</button>' +
        '<button class="btn btn-sm" onclick="calRefresh()">↺ Refresh</button>' +
      '</div>' +
    '</div>' +

    '<div style="display:flex;flex:1;overflow:hidden">' +

    // Left panel
    '<div style="width:220px;flex-shrink:0;border-right:1px solid var(--border);' +
      'overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:4px">' +

      '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;line-height:1.5">' +
        'Drag to a day to set dates.<br>Drag across days to set a range.' +
      '</div>' +

      // Unscheduled Tasks
      (unscheduledTasks.length > 0
        ? '<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:4px 0">' +
            'Tasks (' + unscheduledTasks.length + ')' +
          '</div>' +
          unscheduledTasks.map(function(t) {
            return '<div draggable="true" ondragstart="calDragStart(event,\'task\',' + t.id + ')" ' +
              'style="padding:7px 10px;border-radius:6px;border:1px solid var(--border);' +
                'border-left:3px solid ' + COLOR.task + ';background:var(--surface);' +
                'font-size:12px;color:var(--text);cursor:grab;user-select:none;margin-bottom:2px">' +
              escapeHtml(t.name) + '</div>';
          }).join('')
        : '') +

      // Unscheduled Projects
      (unscheduledProjects.length > 0
        ? '<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:8px 0 4px">' +
            'Projects (' + unscheduledProjects.length + ')' +
          '</div>' +
          unscheduledProjects.map(function(p) {
            var col = _projectColor(p.id);
            return '<div draggable="true" ondragstart="calDragStart(event,\'project\',' + p.id + ')" ' +
              'style="padding:7px 10px;border-radius:6px;border:1px solid var(--border);' +
                'border-left:3px solid ' + col + ';background:var(--surface);' +
                'font-size:12px;color:var(--text);cursor:grab;user-select:none;margin-bottom:2px">' +
              escapeHtml(p.name) + '</div>';
          }).join('')
        : '') +

      // Unscheduled Releases
      (unscheduledReleases.length > 0
        ? '<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:8px 0 4px">' +
            'Releases (' + unscheduledReleases.length + ')' +
          '</div>' +
          unscheduledReleases.map(function(r) {
            return '<div draggable="true" ondragstart="calDragStart(event,\'release\',' + r.id + ')" ' +
              'style="padding:7px 10px;border-radius:6px;border:1px solid var(--border);' +
                'border-left:3px solid ' + COLOR.release + ';background:var(--surface);' +
                'font-size:12px;color:var(--text);cursor:grab;user-select:none;margin-bottom:2px">' +
              escapeHtml(r.name) + '</div>';
          }).join('')
        : '') +

      // Scheduled items (re-drag to reschedule)
      '<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:8px 0 4px">Scheduled</div>' +
      _tasks.filter(function(t){ return t.startDate; }).concat(
        _projects.filter(function(p){ return p.estStartDate; }).map(function(p) {
          return { id: p.id, name: p.name, startDate: p.estStartDate, estEndDate: p.estEndDate, _type: 'project', _color: _projectColor(p.id) };
        })
      ).concat(
        _releases.filter(function(r){ return r.startDate; }).map(function(r) {
          return { id: r.id, name: r.name, startDate: r.startDate, estEndDate: r.estEndDate, _type: 'release', _color: COLOR.release };
        })
      ).map(function(item) {
        var isProj = item._type === 'project';
        var isRel  = item._type === 'release';
        var col    = isProj ? item._color : isRel ? COLOR.release : COLOR.task;
        var type   = item._type || 'task';
        return '<div draggable="true" ondragstart="calDragStart(event,\'' + type + '\',' + item.id + ')" ' +
          'style="padding:6px 10px;border-radius:6px;border:1px solid var(--border);' +
            'border-left:3px solid ' + col + ';background:var(--surface);' +
            'font-size:11px;color:var(--text);cursor:grab;user-select:none;margin-bottom:2px;opacity:0.75">' +
          escapeHtml(item.name) + '<br>' +
          '<span style="color:var(--text-dim);font-size:10px">' +
            (item.startDate||'').split('T')[0] + ' → ' + (item.estEndDate||'').split('T')[0] +
          '</span>' +
        '</div>';
      }).join('') +

    '</div>' +

    // Calendar area
    '<div style="flex:1;overflow:auto;padding:16px">' +

    // DOW headers
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">' +
    DOW.map(function(l) {
      return '<div style="text-align:center;font-size:11px;font-weight:600;color:var(--text-muted);padding:4px 0">' + l + '</div>';
    }).join('') + '</div>' +

    // Grid
    '<div id="cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">' +
    cells.map(function(date) {
      if (!date) return '<div style="min-height:100px;background:var(--bg);border-radius:6px;border:1px solid transparent;opacity:0.3"></div>';
      var ds  = date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
      var evs = _eventsForDate(ds);
      var isToday = ds === todayStr;
      return '<div class="cal-day" data-date="' + ds + '" ' +
        'ondragover="event.preventDefault()" ondrop="calDrop(event,\'' + ds + '\')" ' +
        'style="min-height:100px;background:var(--surface);border-radius:6px;padding:5px;' +
          'border:1px solid ' + (isToday ? 'var(--accent)' : 'var(--border)') + ';' +
          'cursor:crosshair;user-select:none;box-sizing:border-box;overflow:hidden">' +
        '<div style="font-size:12px;font-weight:' + (isToday ? '700':'500') + ';' +
          'color:' + (isToday ? 'var(--accent)':'var(--text)') + ';margin-bottom:3px">' + date.getDate() + '</div>' +
        evs.map(function(ev) {
          var clickable = ev.type !== 'ics' && ev.id;
          return '<div ' +
            (clickable ? 'onclick="calOpenEdit(\'' + ev.type + '\',' + ev.id + ')" ' : '') +
            'style="font-size:10px;padding:2px 5px;border-radius:3px;margin-bottom:2px;' +
            'background:' + ev.color + '28;border-left:2px solid ' + ev.color + ';' +
            'color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4;' +
            (clickable ? 'cursor:pointer;' : '') + '" ' +
            'title="' + escapeHtml(ev.label) + (clickable ? ' (click to edit)' : '') + '">' +
            escapeHtml(ev.label) +
          '</div>';
        }).join('') +
      '</div>';
    }).join('') + '</div>' +  // end grid

    // Legend
    '<div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;align-items:center">' +
      '<span style="font-size:11px;color:var(--text-dim)">Legend:</span>' +
      '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">' +
        '<div style="width:10px;height:10px;border-radius:2px;background:' + COLOR.task + '"></div>Tasks' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">' +
        '<div style="width:10px;height:10px;border-radius:2px;background:' + COLOR.project + '"></div>Projects' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">' +
        '<div style="width:10px;height:10px;border-radius:2px;background:' + COLOR.release + '"></div>Releases' +
      '</div>' +
      (_icsEvents.length > 0
        ? '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">' +
            '<div style="width:10px;height:10px;border-radius:2px;background:' + COLOR.ics + '"></div>Calendar Feed' +
          '</div>'
        : '') +
    '</div>' +

    '</div>' +   // end calendar area
    '</div>';    // end body row

  _initDragListeners();
}

// ─── Multi-day drag (mousedown → drag across → mouseup) ───────
function _initDragListeners() {
  var grid = document.getElementById('cal-grid');
  if (!grid) return;
  grid.addEventListener('mousedown', function(e) {
    var cell = e.target.closest('.cal-day[data-date]');
    if (!cell || e.button !== 0) return;
    if (e.target.closest('[draggable="true"]')) return;
    e.preventDefault();
    var startDate = cell.dataset.date, endDate = startDate;
    _highlightRange(startDate, endDate);

    function onMove(e2) {
      var el = document.elementFromPoint(e2.clientX, e2.clientY);
      var c2 = el && el.closest('.cal-day[data-date]');
      if (c2) { endDate = c2.dataset.date; _highlightRange(startDate, endDate); }
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      _clearHighlight();
      var s = startDate <= endDate ? startDate : endDate;
      var e = startDate <= endDate ? endDate   : startDate;
      _promptItemForRange(s, e);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function _highlightRange(s, e) {
  var lo = s <= e ? s : e, hi = s <= e ? e : s;
  document.querySelectorAll('.cal-day[data-date]').forEach(function(cell) {
    var inRange = cell.dataset.date >= lo && cell.dataset.date <= hi;
    cell.style.background  = inRange ? 'var(--accent-dim)' : '';
    cell.style.borderColor = inRange ? 'var(--accent)'     : '';
  });
}
function _clearHighlight() {
  document.querySelectorAll('.cal-day[data-date]').forEach(function(cell) {
    cell.style.background = cell.style.borderColor = '';
  });
}

// Modal: pick which task or project to assign the dragged range to
function _promptItemForRange(startStr, endStr) {
  var allItems = _tasks.map(function(t){ return { type:'task', id:t.id, label:'[Task] '+t.name }; })
    .concat(_projects.map(function(p){ return { type:'project', id:p.id, label:'[Project] '+p.name }; }))
    .concat(_releases.map(function(r){ return { type:'release', id:r.id, label:'[Release] '+r.name }; }));
  if (!allItems.length) { showToast('No items available', 'info'); return; }

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:24px;width:360px;display:flex;flex-direction:column;gap:14px">' +
      '<div style="font-size:14px;font-weight:600;color:var(--text)">Set Dates</div>' +
      '<div style="font-size:12px;color:var(--text-muted)">' + (startStr === endStr ? startStr : startStr + '  →  ' + endStr) + '</div>' +
      '<select id="cal-range-select" style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:8px;font-family:inherit;font-size:13px">' +
        '<option value="">— Select task or project —</option>' +
        allItems.map(function(it){ return '<option value="' + it.type + ':' + it.id + '">' + escapeHtml(it.label) + '</option>'; }).join('') +
      '</select>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn btn-sm" id="cal-range-cancel">Cancel</button>' +
        '<button class="btn btn-sm btn-primary" id="cal-range-ok">Set Dates</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  document.getElementById('cal-range-cancel').onclick = function() { document.body.removeChild(modal); };
  document.getElementById('cal-range-ok').onclick = function() {
    var val = document.getElementById('cal-range-select').value;
    if (!val) { showToast('Please select an item', 'info'); return; }
    document.body.removeChild(modal);
    var parts = val.split(':');
    _saveDates(parts[0], parseInt(parts[1]), startStr, endStr);
  };
}

// ─── HTML5 drag from left panel ───────────────────────────────
function calDragStart(e, type, id) {
  _dragItem = { type: type, id: id };
  e.dataTransfer.setData('text/plain', type + ':' + id);
  e.dataTransfer.effectAllowed = 'move';
}
function calDrop(e, dateStr) {
  e.preventDefault();
  var raw  = e.dataTransfer.getData('text/plain') || '';
  var item = _dragItem || (raw ? { type: raw.split(':')[0], id: parseInt(raw.split(':')[1]) } : null);
  _dragItem = null;
  if (!item) return;
  _saveDates(item.type, item.id, dateStr, dateStr);
}

// ─── Save dates to QB ─────────────────────────────────────────
async function _saveDates(type, id, startStr, endStr) {
  try {
    if (type === 'task') {
      await qbUpsert(TABLES.tasks, [{
        3:                        { value: id },
        [FIELD.TASKS.startDate]:  { value: startStr },
        [FIELD.TASKS.estEndDate]: { value: endStr },
      }], [3]);
      var t = _tasks.find(function(x){ return x.id === id; });
      if (t) { t.startDate = startStr; t.estEndDate = endStr; }
    } else if (type === 'release') {
      await qbUpsert(TABLES.releases, [{
        3:                           { value: id },
        [FIELD.RELEASES.startDate]:  { value: startStr },
        [FIELD.RELEASES.estEndDate]: { value: endStr },
      }], [3]);
      var r = _releases.find(function(x){ return x.id === id; });
      if (r) { r.startDate = startStr; r.estEndDate = endStr; }
    } else {
      await qbUpsert(TABLES.projects, [{
        3:                             { value: id },
        [FIELD.PROJECTS.estStartDate]: { value: startStr },
        [FIELD.PROJECTS.estEndDate]:   { value: endStr },
      }], [3]);
      var p = _projects.find(function(x){ return x.id === id; });
      if (p) { p.estStartDate = startStr; p.estEndDate = endStr; }
    }
    showToast('Dates saved', 'success');
    _render();
  } catch(e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
}

// ─── ICS Settings modal ───────────────────────────────────────
function calICSSettings() {
  var current      = _getICSUrl();
  var currentProxy = _getProxyUrl();
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:24px;width:480px;display:flex;flex-direction:column;gap:14px">' +
      '<div style="font-size:14px;font-weight:600;color:var(--text)">Calendar Feed (ICS)</div>' +
      '<div style="font-size:12px;color:var(--text-muted);line-height:1.6">' +
        'To get your Outlook/Teams ICS URL:<br>' +
        '1. Go to Outlook on the web (outlook.office365.com)<br>' +
        '2. Settings → View all Outlook settings → Calendar → Shared calendars<br>' +
        '3. Under "Publish a calendar" → select calendar → Can view all details → Publish<br>' +
        '4. Copy the <strong>ICS</strong> link and paste it below.' +
      '</div>' +
      '<input id="cal-ics-input" type="text" placeholder="https://outlook.office365.com/owa/calendar/..." ' +
        'value="' + escapeHtml(current) + '" ' +
        'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
          'padding:8px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
      '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">CORS Proxy URL</div>' +
      '<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">' +
        'Required to load Outlook ICS links. Enter your Cloudflare Worker URL (e.g. https://ics-proxy.yourname.workers.dev).' +
      '</div>' +
      '<input id="cal-proxy-input" type="text" placeholder="https://ics-proxy.yourname.workers.dev" ' +
        'value="' + escapeHtml(currentProxy) + '" ' +
        'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
          'padding:8px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        (current ? '<button class="btn btn-sm btn-danger" id="cal-ics-clear">Remove</button>' : '') +
        '<button class="btn btn-sm" id="cal-ics-cancel">Cancel</button>' +
        '<button class="btn btn-sm btn-primary" id="cal-ics-save">Save &amp; Refresh</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  document.getElementById('cal-ics-cancel').onclick = function() { document.body.removeChild(modal); };
  if (current) document.getElementById('cal-ics-clear').onclick = function() {
    _setICSUrl('');
    _setProxyUrl('');
    document.body.removeChild(modal);
    calRefresh();
  };
  document.getElementById('cal-ics-save').onclick = async function() {
    var url   = document.getElementById('cal-ics-input').value.trim();
    var proxy = document.getElementById('cal-proxy-input').value.trim();
    _setICSUrl(url);
    _setProxyUrl(proxy);
    document.body.removeChild(modal);
    calRefresh();
  };
}

// ─── Navigation ───────────────────────────────────────────────
function calPrevMonth() {
  _month--; if (_month < 0)  { _month = 11; _year--; }
  _render();
}
function calNextMonth() {
  _month++; if (_month > 11) { _month = 0;  _year++; }
  _render();
}
async function calRefresh() {
  var c = document.getElementById('tab-calendar');
  if (c) c.innerHTML = '<div class="loading"><div class="spinner"></div> Refreshing...</div>';
  await _loadAll();
  _render();
}

// ─── Edit modal ───────────────────────────────────────────────
function calOpenEdit(type, id) {
  var item = type === 'task'    ? _tasks.find(function(x)    { return x.id === id; })
           : type === 'project' ? _projects.find(function(x) { return x.id === id; })
           : type === 'release' ? _releases.find(function(x) { return x.id === id; })
           : null;
  if (!item) return;

  var isTask    = type === 'task';
  var isRelease = type === 'release';
  var title     = isTask ? 'Edit Task' : isRelease ? 'Edit Release' : 'Edit Project';
  var color     = isTask ? COLOR.task : isRelease ? COLOR.release : _projectColor(item.id);

  // Build field rows depending on type
  function row(label, id, value, inputType) {
    inputType = inputType || 'text';
    return '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<label style="font-size:11px;color:var(--text-muted)">' + label + '</label>' +
      '<input id="cal-edit-' + id + '" type="' + inputType + '" value="' + escapeHtml(value || '') + '" ' +
        'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
          'padding:7px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
    '</div>';
  }

  function selectRow(label, id, value, options) {
    return '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<label style="font-size:11px;color:var(--text-muted)">' + label + '</label>' +
      '<select id="cal-edit-' + id + '" ' +
        'style="background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
          'padding:7px 10px;font-family:inherit;font-size:13px;width:100%;box-sizing:border-box">' +
        options.map(function(o) {
          return '<option value="' + escapeHtml(o) + '"' + (o === value ? ' selected' : '') + '>' + escapeHtml(o) + '</option>';
        }).join('') +
      '</select>' +
    '</div>';
  }

  var statusOptions  = isTask
    ? ['Open','In Progress','Blocked','Complete','On Hold']
    : ['Active','In Progress','On Hold','Complete','Cancelled'];
  var priorityOptions = ['01-Critical','02-High','03-Medium','04-Low'];

  var fields = isTask
    ? row('Name', 'name', item.name) +
      selectRow('Status',   'status',   item.status,   statusOptions) +
      selectRow('Priority', 'priority', item.priority, priorityOptions) +
      row('Assigned To',  'assignedTo', item.assignedTo) +
      row('Start Date',   'startDate',  (item.startDate  || '').split('T')[0], 'date') +
      row('Est End Date', 'estEndDate', (item.estEndDate || '').split('T')[0], 'date')
    : isRelease
    ? row('Release Name', 'name',       item.name) +
      row('Start Date',   'startDate',  (item.startDate  || '').split('T')[0], 'date') +
      row('Est End Date', 'estEndDate', (item.estEndDate || '').split('T')[0], 'date')
    : row('Name', 'name', item.name) +
      selectRow('Status',   'status',   item.status,   statusOptions) +
      selectRow('Priority', 'priority', item.priority, priorityOptions) +
      row('Est Start Date', 'estStartDate', (item.estStartDate || '').split('T')[0], 'date') +
      row('Est End Date',   'estEndDate',   (item.estEndDate   || '').split('T')[0], 'date');

  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-top:3px solid ' + color + ';' +
      'border-radius:10px;padding:24px;width:400px;display:flex;flex-direction:column;gap:14px;max-height:90vh;overflow-y:auto">' +
      '<div style="font-size:15px;font-weight:600;color:var(--text)">' + title + '</div>' +
      fields +
      '<div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px">' +
        '<button class="btn btn-sm" id="cal-edit-cancel">Cancel</button>' +
        '<button class="btn btn-sm btn-primary" id="cal-edit-save">Save</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  document.getElementById('cal-edit-cancel').onclick = function() { document.body.removeChild(modal); };

  document.getElementById('cal-edit-save').onclick = async function() {
    function fval(fieldId) { var el = document.getElementById('cal-edit-' + fieldId); return el ? el.value.trim() : ''; }

    try {
      if (isTask) {
        var rec = {
          3:                        { value: id },
          [FIELD.TASKS.name]:       { value: fval('name') },
          [FIELD.TASKS.status]:     { value: fval('status') },
          [FIELD.TASKS.priority]:   { value: fval('priority') },
          [FIELD.TASKS.assignedTo]: { value: fval('assignedTo') },
        };
        if (fval('startDate'))  rec[FIELD.TASKS.startDate]  = { value: fval('startDate') };
        if (fval('estEndDate')) rec[FIELD.TASKS.estEndDate]  = { value: fval('estEndDate') };
        await qbUpsert(TABLES.tasks, [rec], [3]);
        // Update local state
        Object.assign(item, { name: fval('name'), status: fval('status'), priority: fval('priority'),
          assignedTo: fval('assignedTo'), startDate: fval('startDate'), estEndDate: fval('estEndDate') });
      } else if (isRelease) {
        var rec = {
          3:                           { value: id },
          [FIELD.RELEASES.releaseName]: { value: fval('name') },
        };
        if (fval('startDate'))  rec[FIELD.RELEASES.startDate]  = { value: fval('startDate') };
        if (fval('estEndDate')) rec[FIELD.RELEASES.estEndDate]  = { value: fval('estEndDate') };
        await qbUpsert(TABLES.releases, [rec], [3]);
        Object.assign(item, { name: fval('name'), startDate: fval('startDate'), estEndDate: fval('estEndDate') });
      } else {
        var rec = {
          3:                             { value: id },
          [FIELD.PROJECTS.name]:         { value: fval('name') },
          [FIELD.PROJECTS.status]:       { value: fval('status') },
          [FIELD.PROJECTS.priority]:     { value: fval('priority') },
        };
        if (fval('estStartDate')) rec[FIELD.PROJECTS.estStartDate] = { value: fval('estStartDate') };
        if (fval('estEndDate'))   rec[FIELD.PROJECTS.estEndDate]   = { value: fval('estEndDate') };
        await qbUpsert(TABLES.projects, [rec], [3]);
        Object.assign(item, { name: fval('name'), status: fval('status'), priority: fval('priority'),
          estStartDate: fval('estStartDate'), estEndDate: fval('estEndDate') });
      }
      document.body.removeChild(modal);
      showToast('Saved', 'success');
      _render();
    } catch(e) {
      showToast('Save failed: ' + e.message, 'error');
    }
  };
}

// ─── Window exports ───────────────────────────────────────────
window.calPrevMonth   = calPrevMonth;
window.calNextMonth   = calNextMonth;
window.calRefresh     = calRefresh;
window.calICSSettings = calICSSettings;
window.calDragStart   = calDragStart;
window.calDrop        = calDrop;
window.calOpenEdit    = calOpenEdit;

})();
