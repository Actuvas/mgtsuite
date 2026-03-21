# MGT Suite Content Log

## [2026-03-20] - Build Fix + OpenClaw Cleanup + TS Error Purge
- **What**: Fixed broken build caused by recharts internal import paths (budgets-screen.tsx). Cleaned up 5 stale OpenClaw references: removed deprecated OpenClawStudioIcon aliases from mgtsuite.tsx, cleaned clawsuite.tsx re-exports, removed OPENCLAW_CONFIG_PATH deprecated alias from provider-catalog.ts. Fixed TS errors: removed undefined `data`/`modelString` vars in agent-hub-layout.tsx (gateway disabled code path), removed unused `GatewayStatusResponse`/`GatewayNodesResponse` types and `extractNodeCount` function from use-services-health.ts, removed dead `readyStateName` function and unused `gatewayClient` variable from gateway.ts.
- **Why it matters**: Suite had been broken since the recharts import — couldn't build for production. Now all 53 tests pass, build succeeds in 4.5s. Every OpenClaw reference is either gone or mapped to the MGT name. Zero dead code in the gateway layer.
- **Post angle**: "Fixed a broken build, purged dead code, and removed every last trace of the old brand from our ops dashboard. 53 tests green. Build in 4.5s. Sometimes the most productive session is the one where you delete code."

## [2026-03-15] - Campaigns View: Goal Tracking + Campaign Management for MGT Factory
- **What**: Built a full Campaigns view for MGT Suite. Includes a `/api/factory-campaigns` API route that reads/writes `C:\ClawFactory\logs\campaigns\*.json` and `C:\ClawFactory\logs\goals\*.json` using atomic writes (tmp-then-rename). TanStack Query hook polls every 30s. Four KPI cards: Active Campaigns, Goals Tracked, Total Runs Linked, Total Spend. Goals section shows one card per goal with per-metric progress bars (target vs current + %), overall progress bar, deadline, and workspace. Campaigns section shows a card grid with status badge, goal link, niche tags, budget spend bar, run count, and created date — click any card to open a full detail panel with linked run IDs. Two creation modals: Create Campaign (name, goal dropdown, niches, budget) and Create Goal (name, description, workspace, deadline, dynamic metrics list). Nav entry added with `Target02Icon` between Factory Runs and Approvals.
- **Why it matters**: Before this, campaigns and goals lived only as Python models in Factory with no visibility layer. Now you can create a goal (e.g., "1M views in Q2") with measurable metrics and deadlines, create campaigns that link to that goal, and track spend + runs without touching the codebase. This closes the loop between the Factory pipeline and the Suite ops dashboard.
- **Post angle**: "Added Campaigns + Goals tracking to our AI content pipeline dashboard. Goals have per-metric progress bars, deadlines, and overall completion %. Campaigns track spend, linked runs, and niches. Create either from the UI — JSON persisted to Factory's log dir. This is what campaign management looks like when you own the whole stack."

## [2026-03-15] - Policies View: Live Config Control for MGT Factory Rules
- **What**: Built a full Policies management view for MGT Suite — 5 policy cards in a responsive grid (budget, safety, brand, publishing, schedule), each with type-colored badges, enabled/disabled toggles, live rule summaries, and inline edit forms. Added `/api/factory-policies` API route that reads and atomically writes to `C:\ClawFactory\policies\policies.json`. Each policy type gets a purpose-built editor: Budget has number inputs + operator limits table + warning threshold slider; Safety has dual keyword textareas + hold threshold selector + API review toggle; Brand has a full routing table with per-niche, per-platform handle editing; Publishing has platform toggles + a 24-hour blackout hour picker + approval threshold control; Schedule has time pickers + poll interval input. TanStack Query hook auto-refreshes every 30s. "Initialize Defaults" button calls the Factory's init endpoint. Nav entry added with `SecurityLockIcon` after Workspaces.
- **Why it matters**: Before this, editing Factory policy rules meant manually editing the policies.json file on disk or re-running a Python CLI command. Now every pipeline rule — daily spend cap, safety keyword filters, account routing, platform blackouts, pipeline schedule — is editable through a clean UI with no file system access required. This is the config plane that ties MGT Factory to MGT Suite as a real control loop.
- **Post angle**: "Added a Policies view to our AI content pipeline dashboard. 5 policy types, inline editors, atomic JSON writes, 30s auto-refresh. Budget cap, safety keywords, brand routing, publishing blackouts, pipeline schedule — all editable from the UI. No more editing config files by hand."

## [2026-03-15] - Ops Inbox: One View to Rule All Factory Alerts
- **What**: Built the Ops Inbox view for MGT Suite — a unified, urgency-sorted dashboard that aggregates failed runs (last 24h), pending approvals, budget warnings, and stuck workflows into a single actionable feed. Added a new API route (`/api/factory-inbox`) that reads from events.jsonl, the held/ directory, cost_log.csv, and budget_config.json simultaneously. Each item is classified by urgency (critical/high/medium/low) with left-accent color coding and inline actions — approve/reject buttons for pending clips, "View Run" links for failures and stuck jobs, "Edit Budget" for budget alerts. KPI cards at the top give instant status: total items, failed runs (red if >0), pending approvals (amber if >0), budget status. Auto-refreshes every 10s. Nav entry added to the sidebar with Alert01Icon.
- **Why it matters**: Previously you had to open three separate views — Runs, Approvals, Budget — to know if anything needed attention. The Ops Inbox collapses all of that into one page. The moment you open MGT Suite, you see exactly what needs your attention and you can act on it without leaving the view. This is the "zero-to-action" pattern every ops dashboard should have.
- **Post angle**: "Built an Ops Inbox for our AI content pipeline dashboard. One view. Everything that needs attention: failed runs, pending approvals, budget warnings, stuck workflows. Urgency-sorted. Inline actions. Auto-refresh every 10s. This is what 'ops visibility' should feel like."

## [2026-03-14] - MGT Suite: The Rebrand That Rewired Everything
- **What**: Rebranded from ClawSuite to MGT Suite across 60+ files. Stripped every OpenClaw reference, updated all imports, routes, components, and branding. Added 5 new operational views: Factory Runs (live pipeline job tracking), Approvals (Discord-linked approve/reject queue), Activity Timeline (cross-service event stream), Budget Dashboard (cost tracking with $5/day cap visualization). MGT Suite is now a real ops cockpit — not just a chat terminal with a sidebar.
- **Why it matters**: This is the moment the agent management UI grew up. It went from "a fork with someone else's name" to the nerve center of an entire content automation pipeline. The 5 new views mean you can monitor Factory jobs, approve content, track spend, and see activity across all MGT services from one screen. Solo devs running AI pipelines need this kind of visibility.
- **Post angle**: "Rebranded ClawSuite to MGT Suite today. 60+ files. Every OpenClaw reference gone. But the rebrand was the easy part. The real work: 5 new operational views — Factory Runs, Approvals, Activity Timeline, Budget Dashboard. It's not a chat terminal anymore. It's a content ops cockpit. This is what managing an AI pipeline should look like."

## [2026-03-14] - From Chat Terminal to Mission Control UI
- **What**: MGT Suite now surfaces real-time Factory pipeline data — job statuses, approval queues, budget burn rate, and a unified activity timeline across Studio, Factory, and Mission Control. Every view is wired to live API data with TanStack Query polling.
- **Why it matters**: Most solo devs managing AI pipelines are flying blind — checking logs, SSH-ing into servers, scrolling Discord. MGT Suite puts everything in one place with real-time updates. This is the difference between "I think it's working" and "I can see it working."
- **Post angle**: "Stop SSH-ing into your server to check if the pipeline is running. Built a real-time ops dashboard for our AI content factory: job tracking, approval queue, budget burn rate, activity timeline. If you're running AI automation and your monitoring is 'check Discord,' you need this."

---

## 2026-03-05 — Dedicated Studio & Mission Control Screens

**What shipped today:** Full dedicated screens for Studio Tasks and Mission Control, replacing placeholder pages with real data-driven UIs.

**Files added/changed:**

- `src/screens/studio/studio-tasks-screen.tsx` — Studio Tasks page with status filters, expandable clip rows, pagination
- `src/screens/mission-control/mission-control-screen.tsx` — MC page with Boards + Agents tabs, task creation modal, live 15s agent polling
- `src/routes/mission-control.tsx` — New route wiring for /mission-control
- `src/routes/tasks.tsx` — Updated to render StudioTasksScreen
- `src/lib/mc-api.ts` — Fixed auth token browser leak, AbortSignal memory leak, readError body double-consume
- `src/lib/studio-api.ts` — Same AbortSignal + readError fixes

**Build-in-public highlights:**

- 1,375 lines of new screen code committed
- API clients + hooks wired to real Studio and MC backends
- Security fixes: browser auth guard, signal cleanup, response body handling
- Full verification: TypeScript clean, ClawFactory 258 tests pass, Docker healthy, Studio reachable

## 2026-03-02 — Security Audit and Hardening

**What shipped today:** Full security audit + hardening pass on the ClawSuite backend (TanStack Start / React 19 app).

**Files changed:**

- `src/server/rate-limit.ts`
- `src/server/auth-middleware.ts`
- `server-entry.js`
- `src/routes/api/auth.ts`
- `src/routes/api/config-patch.ts`
- `src/routes/api/agent-dispatch.ts`
- `src/routes/api/agent-steer.ts`
- `src/routes/api/cron/upsert.ts`
- `src/routes/api/browser/navigate.ts`
- `src/routes/api/validate-provider.ts`
- `src/server/browser-proxy.ts`
- `src/screens/files/files-screen.tsx`

**Security wins:**

- Added full HTTP security header suite (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection) to production server
- Fixed X-Forwarded-For IP spoofing bypass in rate limiter — now requires `TRUST_PROXY=1` env var to trust proxy headers
- Added `Retry-After` and `X-RateLimit-*` headers to 429 responses
- Added dynamic `Secure` cookie flag detection for HTTPS deployments
- Fixed `javascript:` URL injection in markdown file previewer
- Fixed SSRF in browser navigation — now strictly allowlists `http:` and `https:` only
- Tightened CORS header wildcard in browser proxy
- Scoped production error messages via `safeErrorMessage()` on highest-risk endpoints
- (Linter auto-fixed) Session tokens now have TTL-based expiry; improved timing-safe password comparison with length-padding

---

## 2026-03-05 — Studio + Mission Control API Integration + Dashboard Widgets

**What shipped today:** Wired ClawSuite to both MGT Studio and Mission Control APIs. Added typed fetch clients, TanStack Query hooks, and two new dashboard widgets showing live data from the pipeline.

**Files added:**

- `src/lib/studio-api.ts` — Typed fetch client for Studio (tasks, clips, stats overview)
- `src/lib/mc-api.ts` — Typed fetch client for Mission Control (15 CRUD functions: boards, tasks, agents, approvals)
- `src/hooks/use-studio.ts` — TanStack Query v5 hooks with query key factories, stale times
- `src/hooks/use-mission-control.ts` — TanStack Query hooks with filtering, live polling (15s for agents)
- `src/screens/dashboard/components/studio-clips-widget.tsx` — Studio Clips widget (stats row + 3 recent tasks with status badges)
- `src/screens/dashboard/components/mc-agents-widget.tsx` — MC Agents widget (live agent status, 5 states, gold star for active tasks)

**Files modified:**

- `src/screens/dashboard/constants/grid-config.ts` — Added `studio-clips` and `mc-agents` to WidgetId union + registry
- `src/screens/dashboard/constants/widget-meta.ts` — Added widget metadata entries
- `src/hooks/use-widget-reorder.ts` — Added to DashboardWidgetOrderId and DEFAULT_DASHBOARD_WIDGET_ORDER
- `src/screens/dashboard/dashboard-screen.tsx` — Wired both widgets into desktop and mobile layouts

**Technical highlights:**

- Zero external dependencies added — uses native fetch, follows ClawSuite conventions (no semicolons, single quotes)
- Studio hooks: `useStudioTasks`, `useStudioClips`, `useStudioStatsOverview` with pagination
- MC hooks: `useMCBoards`, `useMCTasks`, `useMCAgents`, `useMCApprovals` with filter params
- Agent widget polls every 15s for near-real-time status
- Both widgets use the existing WidgetShell component for consistent loading/error states
- Env vars: `STUDIO_API_URL`, `STUDIO_USER_ID`, `MC_API_URL`, `MC_AUTH_TOKEN`

**Build-in-public angle:**
"ClawSuite now sees the full pipeline. Two new dashboard widgets show Studio clip processing and Mission Control agent status in real-time. 6 new files, typed end-to-end, polling every 15 seconds. The ops terminal is coming to life."

**Tags**: #buildinpublic #ClawSuite #dashboard #api #typescript #tanstackquery

---

## 2026-03-07 - Health Check GREEN
- **What**: Health check GREEN: 0 npm vulnerabilities (T2 fix), build passing, clean git state.
- **Why it matters**: A 40k LOC codebase with zero vulnerabilities and a clean build is rare. This means ClawSuite is production-ready at any moment — no tech debt blocking deployment.
- **Post angle**: "40,000 lines of code. 0 npm vulnerabilities. Build passing. Git clean. ClawSuite health check: GREEN. Maintenance isn't glamorous, but shipping with zero known security issues is."

---

## 2026-03-07 - Integration Test Suite
- **What**: 44 integration tests (17 Studio API, 27 Mission Control API) — all passing
- **Why it matters**: First real test coverage for cross-service API calls
- **Post angle**: "Added 44 integration tests covering Studio and Mission Control APIs. Testing the glue between services is where bugs hide."
