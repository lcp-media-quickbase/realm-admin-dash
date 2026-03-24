# LCP QuickBase Dashboard — Boilerplate

Reusable template for building tabbed, role-aware single-page dashboards on QuickBase Code Pages. Includes the full LCP design system, auth layer, QB API client, shared ticket system, and ViewAs test mode — out of the box.

## Quick Start

### 1. Copy this repo

Fork or clone this repo into a new GitHub repository for your project.

### 2. Configure `codepages/shared.js`

Open the file and update the five config blocks near the top:

```js
var APP_NAME = 'My App Name';
var LOGO_DARK  = 'https://...';   // optional — leave empty for text-only
var LOGO_LIGHT = 'https://...';

var QB_REALM = 'lcpmedia.quickbase.com';
var QB_APP   = 'YOUR_APP_DBID';

var TABLES = {
  users:    'abc12345',
  projects: 'def67890',
};

var FIELD = {
  USERS:    { id: 3, name: 6, email: 7 },
  PROJECTS: { id: 3, name: 6, stage: 7 },
};

var ROLE = { VIEWER: 10, ADMIN: 12 };
var ROLE_NAMES = { 10: 'Viewer', 12: 'Administrator' };
```

### 3. Build your tabs

Copy `codepages/tabs/example.js`, rename it, and replace the placeholder data and actions with real QB queries. Each tab is a self-contained IIFE that calls `registerTab()`.

### 4. Register your tabs in `codepages/dashboard.html`

Add a `<script>` tag per tab in the "TAB MODULES" section:

```html
<script src="tabs/my-tab.js"></script>
```

### 5. Set your repo in `shells/production/dashboard.html`

```js
var REPO = 'lcp-media-quickbase/my-app';
```

### 6. Deploy

See [Deploy Process](#deploy-process) below.

---

## Architecture

```
QB Code Page (shell)          jsDelivr CDN                    GitHub
─────────────────────────────────────────────────────────────────────
dashboard shell (once)   →  reads version.json (@main)  →  this repo
                         →  loads @{tag}/codepages/*     →  tagged release
```

**Shell:** Uploaded once to QB (`shells/production/dashboard.html`). Reads `version.json` from raw GitHub to get the current tag, then loads all code from jsDelivr at that version. Never needs re-uploading.

**Deploy:** Push code → tag → update `version.json` → push. Users get the new version on next page load (~5 min CDN cache TTL on `version.json`).

---

## File Structure

```
codepages/
├── shared.css          Design system (Aileron font, LCP Blue #68B6E5, dark/light)
├── shared.js           Auth, QB API client, tab framework, theme, ViewAs, tickets
├── dashboard.html      SPA shell — registers tabs, builds header + sidebar
├── version.json        Current tagged version pointer
└── tabs/
    └── example.js      Annotated sample tab — copy to create new tabs

shells/
└── production/
    └── dashboard.html  QB Code Page shell — upload once, set REPO variable
```

---

## Tab API

```js
registerTab('myTab', {
  icon:         ICONS.reports,        // SVG from ICONS in shared.js, or raw SVG string
  label:        'My Tab',             // Shown in sidebar nav and header breadcrumb
  roles:        [],                   // ROLE IDs that can see this; empty = all roles
  onInit:       async function() {},  // Called once on first activation
  onActivate:   function() {},        // Called every time tab becomes visible
  onDeactivate: function() {},        // Called when leaving this tab
  onSearch:     function(query) {}    // Called when header search input changes
});
```

Wrap each tab in an IIFE `(function() { ... })()` to scope all state and helper functions locally.

---

## QB API Client

All functions are available globally from `shared.js`:

| Function | Description |
|---|---|
| `qbQuery(tableId, select, where, sortBy, top, skip)` | Query up to `top` records |
| `qbQueryAll(tableId, select, where, sortBy)` | Auto-paginate — returns all records |
| `qbUpsert(tableId, records, fieldsToReturn)` | Insert or update records |
| `qbDelete(tableId, where)` | Delete matching records |

**Example:**
```js
var rows = await qbQueryAll(
  TABLES.projects,
  [FIELD.PROJECTS.id, FIELD.PROJECTS.name, FIELD.PROJECTS.stage],
  "{" + FIELD.PROJECTS.stage + ".EX.'Active'}"
);
var projects = rows.map(function(r) {
  return { id: val(r, FIELD.PROJECTS.id), name: val(r, FIELD.PROJECTS.name) };
});
```

---

## Design System

The full LCP design system lives in `shared.css`. Key utility classes:

| Class | Purpose |
|---|---|
| `.topbar` | Tab's top action bar (title + buttons) |
| `.page-body` | Scrollable content area with padding |
| `.page-body-flush` | Full-height non-scrolling layout (for Gantt, etc.) |
| `.data-table` | Styled `<table>` with sticky headers and hover rows |
| `.btn`, `.btn-primary`, `.btn-sm` | Buttons |
| `.badge`, `.badge-success`, `.badge-info`, `.badge-warning`, `.badge-danger` | Status pills |
| `.card`, `.card-title`, `.card-value` | Metric/KPI cards |
| `.modal-overlay`, `.modal` | Modal dialogs |
| `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea` | Form elements |
| `.empty-state` | No-data placeholder with icon and message |
| `.loading`, `.spinner` | Loading states |
| `.tooltip` | Positioned tooltips |
| `.tabs`, `.tab` | Sub-tab bar within a page |

Dark mode is the default. Light mode is toggled via the sidebar button and persisted to `localStorage`.

---

## Auth

Automatic environment detection:

- **QB Code Page** — Uses per-table temporary tokens via `credentials: 'include'`. QB enforces role permissions on every API call.
- **Local dev** — Prompts for a `QB-USER-TOKEN`. Open `codepages/dashboard.html` directly in a browser.

---

## Roles & ViewAs

`ROLE` and `ROLE_NAMES` in `shared.js` define who can see which tabs. Admins (`ROLE.ADMIN`) get a **ViewAs** dropdown in the header to impersonate any role or user for QA — a red banner appears while active.

---

## Branching

```
your-name/feature  ──PR──→  main
```

- **`main`** is always deployable.
- Feature branches prefixed with your name.

---

## Deploy Process

```bash
# 1. Commit and push your changes to main
git add -A && git commit -m "feat: describe your change"
git push origin main

# 2. Tag the release
git tag vX.Y.Z
git push origin vX.Y.Z

# 3. Update version pointer so the QB shell picks up the new code
echo '{"version":"vX.Y.Z"}' > codepages/version.json
git add codepages/version.json
git commit -m "chore: bump version to vX.Y.Z"
git push
```

Users get the new version within ~5 minutes (raw GitHub CDN cache TTL on `version.json`).

---

## Local Development

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO/codepages
# Open dashboard.html in a browser → prompts for QB User Token
```

---

## Brand

- **Font:** Aileron (Regular 400, SemiBold 600, Bold 700) via cdnfonts.com
- **Primary Color:** `#68B6E5` (LCP Blue, Pantone 292 C)
- **Leading:** 125% (per LCP Graphic Standards Manual)
