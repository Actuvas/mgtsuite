# Dashboard Golden Path — End-to-End Verification

**Date:** 2026-02-10
**Branch:** `phase-dashboard-polish-2` (includes all gateway wiring + polish PRs)

---

## Widget Data Source Audit — FINAL STATUS

| # | Widget | Data Source | Route | Real Data? | Status |
|---|--------|-----------|-------|-----------|--------|
| 1 | Weather | wttr.in (external) | N/A | ✅ Real | PASS |
| 2 | Quick Actions | Static config (nav) | N/A | ✅ N/A | PASS |
| 3 | Time & Date | `Date` + `Intl` (client) | N/A | ✅ Real | PASS |
| 4 | Usage Meter | `GET /api/usage` → `sessions.usage` | `/api/usage` | ✅ Real | PASS |
| 5 | Cost Tracker | `GET /api/cost` → `usage.cost` | `/api/cost` | ✅ Real | PASS |
| 6 | Active Agents | `GET /api/sessions` → `sessions.list` | `/api/sessions` | ✅ Real | PASS |
| 7 | Recent Sessions | `GET /api/sessions` (via parent) | `/api/sessions` | ✅ Real | PASS |
| 8 | System Status | `GET /api/session-status` + `/api/ping` | `/api/session-status` | ✅ Real | PASS |
| 9 | Notifications | `GET /api/sessions` (lifecycle events) | `/api/sessions` | ✅ Real | PASS |
| 10 | Activity Log | SSE `GET /api/events` | `/api/events` | ✅ Real | PASS |
| 11 | Tasks | localStorage + seed data | N/A | ⚠️ Demo | PASS (labeled) |

**Result: 10/11 widgets use real gateway data. 1 widget (Tasks) is demo-labeled.**

---

## Gateway RPC → Server Route Map

| Gateway RPC | Server Route | Used By |
|------------|-------------|---------|
| `connect` | Internal (WS handshake) | Gateway connection |
| `sessions.list` | `GET /api/sessions` | Agent Status, Recent Sessions, Notifications |
| `sessions.usage` | `GET /api/usage` | Usage Meter |
| `usage.cost` | `GET /api/cost` | Cost Tracker |
| `session.status` | `GET /api/session-status` | System Status (model, uptime, session count) |
| `models.list` | `GET /api/models` | (available, not yet on dashboard) |
| SSE activity-stream | `GET /api/events` | Activity Log |
| ping | `GET /api/ping` | System Status (connected indicator) |

---

## Golden Path Steps

### 1. Launch & Connection
- [ ] Open localhost:3000 → dashboard loads
- [ ] System Status shows "Connected" (green indicator)

### 2. System Status — Real Data
- [ ] Model shows actual active model (e.g., "Opus 4.6")
- [ ] Uptime shows non-zero (derived from main session age)
- [ ] Session count matches actual sessions

### 3. Usage & Cost — Consistent Totals
- [ ] Usage Meter: donut shows input/output tokens (not inflated cache totals)
- [ ] Usage Meter: Direct Cost shown prominently, cache cost de-emphasized
- [ ] Cost Tracker: Shows billing period spend (different from all-time — this is correct)
- [ ] Per-provider bars visible with +cache indicators

### 4. Active Agents — Real Sessions
- [ ] Shows running sessions with model name, elapsed time, progress
- [ ] Progress derived from contextTokens/totalTokens (real)
- [ ] Empty state: "No active agent sessions" when none running

### 5. Quick Actions — All Routes Work
- [ ] New Chat → navigates to /new
- [ ] Open Terminal → navigates to /terminal
- [ ] Browse Skills → navigates to /skills
- [ ] View Files → navigates to /files

### 6. Recent Sessions — Navigation
- [ ] Shows real sessions sorted by most recent
- [ ] Clicking a session → navigates to /chat/{sessionKey}
- [ ] Preview shows actual last message content

### 7. Activity Log — SSE Stream
- [ ] Events appear after triggering activity (e.g., opening a session)
- [ ] Disconnect state: gray box with Retry button (not scary red)
- [ ] Connected: shows real-time events

### 8. Notifications — Filtered Events
- [ ] Shows session lifecycle events (starts/stops)
- [ ] Not duplicating Activity Log raw events

### 9. Layout
- [ ] Reset Layout → returns to default grid
- [ ] Add Widget → disabled with "Coming soon" tooltip
- [ ] Widgets snap to grid tiers (no whitespace gaps)
- [ ] Responsive: resize browser to check md/sm/xs breakpoints

### 10. Weather & Time
- [ ] Weather shows real forecast from wttr.in
- [ ] Temperature in °F
- [ ] Clock shows correct local time
- [ ] 12h/24h toggle works

---

## Remaining Gaps (documented, not blocking)

| Gap | Severity | Notes |
|-----|----------|-------|
| Tasks widget is demo only | Low | Labeled with "Demo" badge. No real task backend exists yet. |
| Add Widget not functional | Low | Disabled with tooltip. Widget registry exists for future use. |
| No Playwright smoke test | Low | Could add later. Manual golden path covers it for now. |
| Anthropic OAuth 403 | External | Provider-level issue, not dashboard bug. Usage data still flows. |
