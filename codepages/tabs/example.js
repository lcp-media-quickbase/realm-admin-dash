// ═══════════════════════════════════════════════════════════════
// Example Tab
//
// This file demonstrates the full registerTab() API.
// To create a new tab:
//   1. Copy this file and rename it (e.g. tabs/projects.js)
//   2. Replace all occurrences of 'example' with your tab ID
//   3. Update label, icon, and roles
//   4. Replace the load() and render() functions with real QB queries
//   5. Add a <script src="tabs/projects.js"></script> in dashboard.html
// ═══════════════════════════════════════════════════════════════
(function() {

// ─── State (scoped to this tab via IIFE) ─────────────────────
var _data   = [];
var _filter = '';

// ─── Tab Registration ─────────────────────────────────────────
registerTab('example', {
  icon:  ICONS.reports,    // Pick any icon key from ICONS in shared.js
  label: 'Example',

  // roles: Which ROLE IDs can see this tab.
  // Empty array = visible to all roles.
  // Example: roles: [ROLE.ADMIN, ROLE.VIEWER]
  roles: [],

  onInit: async function() {
    // Called once, the first time this tab is activated.
    // Good place to set up the DOM skeleton and do the initial data load.
    _render();
    await _load();
  },

  onActivate: function() {
    // Called every time this tab becomes visible (including after onInit).
    // Good for refreshing stale data or resetting scroll position.
  },

  onDeactivate: function() {
    // Called when the user switches away from this tab.
    // Good for cancelling in-flight requests or closing open dropdowns.
  },

  onSearch: function(query) {
    // Called when the header search input changes.
    // Filter your rendered rows based on the query string.
    _filter = query.toLowerCase();
    _render();
  }
});

// ─── Data loading ─────────────────────────────────────────────
async function _load() {
  var container = document.getElementById('tab-example');
  if (!container) return;

  // Show a spinner while loading
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';

  try {
    // TODO: Replace with a real QB query, for example:
    //
    //   var rows = await qbQueryAll(
    //     TABLES.projects,
    //     [FIELD.PROJECTS.id, FIELD.PROJECTS.name, FIELD.PROJECTS.stage],
    //     null   // where clause, or null for all records
    //   );
    //   _data = rows.map(function(r) {
    //     return {
    //       id:    val(r, FIELD.PROJECTS.id),
    //       name:  val(r, FIELD.PROJECTS.name),
    //       stage: val(r, FIELD.PROJECTS.stage),
    //     };
    //   });

    // Placeholder data — remove when using real QB queries
    _data = [
      { id: 1, name: 'Alpha Project',   status: 'Active'   },
      { id: 2, name: 'Beta Initiative', status: 'Pending'  },
      { id: 3, name: 'Gamma Release',   status: 'Complete' },
    ];

    _render();
  } catch(e) {
    container.innerHTML = '<div class="loading" style="color:var(--danger)">Error: ' + escapeHtml(e.message) + '</div>';
  }
}

// ─── Rendering ────────────────────────────────────────────────
function _render() {
  var container = document.getElementById('tab-example');
  if (!container) return;

  // Apply search filter
  var rows = _data;
  if (_filter) {
    rows = _data.filter(function(row) {
      return row.name.toLowerCase().indexOf(_filter) !== -1 ||
             row.status.toLowerCase().indexOf(_filter) !== -1;
    });
  }

  container.innerHTML =
    // ── Top action bar ──────────────────────────────────────
    '<div class="topbar">' +
      '<div class="topbar-left">' +
        '<span class="page-title">Example</span>' +
      '</div>' +
      '<div class="topbar-right">' +
        '<button class="btn btn-primary" onclick="exampleAdd()">+ Add</button>' +
      '</div>' +
    '</div>' +

    // ── Scrollable content ──────────────────────────────────
    '<div class="page-body">' +
      (rows.length === 0
        ? '<div class="empty-state">' +
            '<div class="empty-state-icon">📋</div>' +
            '<div class="empty-state-text">' + (_filter ? 'No results for "' + escapeHtml(_filter) + '"' : 'No records found') + '</div>' +
          '</div>'
        : '<table class="data-table">' +
            '<thead><tr><th>ID</th><th>Name</th><th>Status</th><th></th></tr></thead>' +
            '<tbody>' +
              rows.map(function(row) {
                var badgeClass = row.status === 'Active'   ? 'badge-info'    :
                                 row.status === 'Complete' ? 'badge-success' : 'badge-warning';
                return '<tr>' +
                  '<td class="cell-mono">' + escapeHtml(String(row.id)) + '</td>' +
                  '<td class="cell-name">' + escapeHtml(row.name) + '</td>' +
                  '<td><span class="badge ' + badgeClass + '">' + escapeHtml(row.status) + '</span></td>' +
                  '<td style="text-align:right">' +
                    '<button class="btn btn-sm" onclick="exampleEdit(' + row.id + ')">Edit</button>' +
                  '</td>' +
                '</tr>';
              }).join('') +
            '</tbody>' +
          '</table>'
      ) +
    '</div>';
}

// ─── Actions ──────────────────────────────────────────────────
function exampleAdd() {
  // TODO: Open a modal or inline form to create a new record.
  // Use qbUpsert(TABLES.yourTable, [{ fieldId: { value: ... } }]) to save.
  showToast('Add — implement me!', 'info');
}

function exampleEdit(id) {
  var row = _data.find(function(r) { return r.id === id; });
  if (!row) return;
  // TODO: Open an edit modal pre-populated with row data.
  showToast('Edit #' + id + ' — implement me!', 'info');
}

// Make actions accessible from inline onclick handlers
window.exampleAdd  = exampleAdd;
window.exampleEdit = exampleEdit;

})(); // end IIFE
