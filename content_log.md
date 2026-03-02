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
