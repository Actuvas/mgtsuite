# ClawSuite Content Log

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
