(function() {

// ─── State ────────────────────────────────────────────────────
var _tasks    = [];
var _projects = [];
var _filter   = { priority: 'All', status: 'All', search: '' };

// ─── Tab Registration ─────────────────────────────────────────
registerTab('tasks-projects', {
  icon:  ICONS.reports,
  label: 'Tasks & Projects',
  roles: [],

  onInit: async function() {
    var c = document.getElementById('tab-tasks-projects');
    if (c) c.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';
    await _load();
  },

  onActivate: function() {},
  onDeactivate: function() {},

  onSearch: function(query) {
    _filter.search = query.toLowerCase();
    _render();
  }
});

// ─── Data Loading ─────────────────────────────────────────────
async function _load() {
  try {
    var results = await Promise.all([
      qbQueryAll(TABLES.tasks,    [3, 6, 125, 12, 13, 99, 48, 142], null),
      qbQueryAll(TABLES.projects, [3, 16, 28, 27, 23, 24],          null),
    ]);

    _tasks = results[0].map(function(r) {
      return {
        id:             val(r, 3),
        name:           val(r, FIELD.TASKS.name)           || '',
        assignedTo:     val(r, FIELD.TASKS.assignedTo)     || '',
        status:         val(r, FIELD.TASKS.status)         || '',
        priority:       val(r, FIELD.TASKS.priority)       || '',
        dateComplete:   val(r, FIELD.TASKS.dateComplete)   || '',
        relatedProject: val(r, FIELD.TASKS.relatedProject) || '',
        system:         val(r, FIELD.TASKS.system)         || '',
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

    _render();
  } catch(e) {
    var c = document.getElementById('tab-tasks-projects');
    if (c) c.innerHTML = '<div class="loading" style="color:var(--danger)">Error: ' + escapeHtml(e.message) + '</div>';
  }
}

// ─── Filters ──────────────────────────────────────────────────
function _unique(arr) {
  return arr.filter(function(v, i, a) { return v && a.indexOf(v) === i; }).sort();
}

function _applyFilters() {
  var projectMap = {};
  _projects.forEach(function(p) { projectMap[p.id] = p.name; });

  var tasks = _tasks.filter(function(t) {
    if (_filter.priority !== 'All' && t.priority !== _filter.priority) return false;
    if (_filter.status   !== 'All' && t.status   !== _filter.status)   return false;
    if (_filter.search) {
      var hay = (t.name + ' ' + t.assignedTo + ' ' + (projectMap[t.relatedProject] || '')).toLowerCase();
      if (hay.indexOf(_filter.search) === -1) return false;
    }
    return true;
  });

  var projects = _projects.filter(function(p) {
    if (_filter.search) {
      if ((p.name + ' ' + p.status).toLowerCase().indexOf(_filter.search) === -1) return false;
    }
    return true;
  });

  return { tasks: tasks, projects: projects, projectMap: projectMap };
}

// ─── Badges ───────────────────────────────────────────────────
function _priorityBadge(p) {
  var cls = !p                  ? 'badge-neutral'  :
            /critical/i.test(p) ? 'badge-danger'   :
            /high/i.test(p)     ? 'badge-warning'  :
            /medium/i.test(p)   ? 'badge-info'     : 'badge-neutral';
  return p ? '<span class="badge ' + cls + '">' + escapeHtml(p) + '</span>' : '<span style="color:var(--text-dim)">—</span>';
}

function _statusBadge(s) {
  var cls = !s                       ? 'badge-neutral'  :
            /complete|done/i.test(s) ? 'badge-success'  :
            /progress/i.test(s)      ? 'badge-warning'  :
            /block/i.test(s)         ? 'badge-danger'   :
            /active|open/i.test(s)   ? 'badge-info'     : 'badge-neutral';
  return s ? '<span class="badge ' + cls + '">' + escapeHtml(s) + '</span>' : '<span style="color:var(--text-dim)">—</span>';
}

function _fmtDate(d) {
  if (!d) return '—';
  return String(d).split('T')[0];
}

// ─── Render ───────────────────────────────────────────────────
function _render() {
  var c = document.getElementById('tab-tasks-projects');
  if (!c) return;

  var f      = _applyFilters();
  var allPri = ['All'].concat(_unique(_tasks.map(function(t){ return t.priority; })));
  var allSta = ['All'].concat(_unique(_tasks.map(function(t){ return t.status; })));

  function pills(label, key, options) {
    return '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
      '<span style="font-size:11px;color:var(--text-dim);white-space:nowrap">' + label + '</span>' +
      options.map(function(o) {
        var active = _filter[key] === o;
        return '<button class="btn btn-sm' + (active ? ' btn-primary' : '') + '" ' +
          'onclick="tasksSetFilter(\'' + key + '\',\'' + escapeHtml(o) + '\')">' +
          escapeHtml(o) + '</button>';
      }).join('') +
    '</div>';
  }

  c.innerHTML =
    '<div class="topbar">' +
      '<div class="topbar-left"><span class="page-title">Tasks &amp; Projects</span></div>' +
      '<div class="topbar-right">' +
        '<button class="btn btn-sm" onclick="tasksRefresh()">↺ Refresh</button>' +
      '</div>' +
    '</div>' +

    '<div class="page-body">' +

    // Filter bar
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;padding:12px;' +
      'background:var(--surface);border:1px solid var(--border);border-radius:8px">' +
      pills('Priority:', 'priority', allPri) +
      pills('Status:',   'status',   allSta) +
    '</div>' +

    // Tasks section
    '<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;' +
      'letter-spacing:0.5px;margin-bottom:10px">Tasks (' + f.tasks.length + ')</div>' +

    (f.tasks.length === 0
      ? '<div class="empty-state" style="padding:24px 0"><div class="empty-state-text">No tasks match the current filters</div></div>'
      : '<div style="overflow-x:auto;margin-bottom:32px">' +
        '<table class="data-table">' +
          '<thead><tr>' +
            '<th>#</th><th>Name</th><th>Project</th><th>Priority</th>' +
            '<th>Status</th><th>Assigned To</th><th>Due</th>' +
          '</tr></thead>' +
          '<tbody>' +
          f.tasks.map(function(t) {
            return '<tr>' +
              '<td class="cell-mono" style="color:var(--text-dim)">' + escapeHtml(String(t.id)) + '</td>' +
              '<td class="cell-name">' + escapeHtml(t.name || '—') + '</td>' +
              '<td style="color:var(--text-muted)">' + escapeHtml(f.projectMap[t.relatedProject] || '—') + '</td>' +
              '<td>' + _priorityBadge(t.priority) + '</td>' +
              '<td>' + _statusBadge(t.status) + '</td>' +
              '<td style="color:var(--text-muted)">' + escapeHtml(t.assignedTo || '—') + '</td>' +
              '<td style="color:var(--text-muted)">' + escapeHtml(_fmtDate(t.dateComplete)) + '</td>' +
            '</tr>';
          }).join('') +
          '</tbody>' +
        '</table>' +
        '</div>'
    ) +

    // Projects section
    '<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;' +
      'letter-spacing:0.5px;margin-bottom:10px">Projects (' + f.projects.length + ')</div>' +

    (f.projects.length === 0
      ? '<div class="empty-state" style="padding:24px 0"><div class="empty-state-text">No projects found</div></div>'
      : '<div style="overflow-x:auto">' +
        '<table class="data-table">' +
          '<thead><tr>' +
            '<th>Name</th><th>Status</th><th>Priority</th><th>Est Start</th><th>Est End</th>' +
          '</tr></thead>' +
          '<tbody>' +
          f.projects.map(function(p) {
            return '<tr>' +
              '<td class="cell-name">' + escapeHtml(p.name || '—') + '</td>' +
              '<td>' + _statusBadge(p.status) + '</td>' +
              '<td>' + _priorityBadge(p.priority) + '</td>' +
              '<td style="color:var(--text-muted)">' + escapeHtml(_fmtDate(p.estStartDate)) + '</td>' +
              '<td style="color:var(--text-muted)">' + escapeHtml(_fmtDate(p.estEndDate)) + '</td>' +
            '</tr>';
          }).join('') +
          '</tbody>' +
        '</table>' +
        '</div>'
    ) +

    '</div>'; // end page-body
}

// ─── Actions ──────────────────────────────────────────────────
function tasksSetFilter(key, value) {
  _filter[key] = value;
  _render();
}

async function tasksRefresh() {
  var c = document.getElementById('tab-tasks-projects');
  if (c) c.innerHTML = '<div class="loading"><div class="spinner"></div> Refreshing...</div>';
  await _load();
}

window.tasksSetFilter = tasksSetFilter;
window.tasksRefresh   = tasksRefresh;

})();
