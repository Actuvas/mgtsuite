# AGENTS.md — ClawSuite Codebase Guide

## Stack
- **Framework:** TanStack Start (React, file-based routing)
- **Language:** TypeScript (strict) — `npx tsc --noEmit` must pass with 0 errors
- **Styling:** Tailwind CSS with custom design tokens
- **State:** Zustand stores + TanStack Query
- **Icons:** `@hugeicons/react` + `@hugeicons/core-free-icons`
- **Animation:** `motion/react` (AnimatePresence, motion.div)
- **Package manager:** npm (NOT pnpm)

## Key Paths
```
src/routes/          — File-based routes (pages + API endpoints)
src/routes/api/      — API routes (TanStack Start server handlers)
src/components/      — Shared UI components
src/screens/         — Full-page screen components
src/hooks/           — React hooks
src/stores/          — Zustand stores
src/lib/             — Utilities
src/server/          — Server-only code (auth, gateway RPC, rate limiting)
public/              — Static assets (logos, icons)
```

## Design Tokens (always use these, never raw colors)
```
bg-primary-950/900/800/700  — dark backgrounds (darkest to lighter)
text-primary-100/200/300/400 — text (lightest to dimmer)
border-primary-800/700       — borders
bg-accent-500/400            — orange CTA (hover: accent-400)
text-accent-300/400/500      — orange text
```

## Component Patterns

### API Routes
```ts
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { requireJsonContentType } from '../../server/rate-limit'

export const Route = createFileRoute('/api/my-endpoint')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        // ...
        return json({ ok: true, data })
      },
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        const body = await request.json()
        return json({ ok: true })
      },
    },
  },
})
```

### Dynamic API Routes
File: `src/routes/api/items.$id.action.ts`
Route: `createFileRoute('/api/items/$id/action')`
Access: `params.id`

### UI Components
- Always use `HugeiconsIcon` from `@hugeicons/react` for icons
- Wrap transitions in `AnimatePresence` from `motion/react`
- Use `cn()` from `@/lib/utils` for conditional classNames
- Path alias `@/` maps to `src/`

### Gateway RPC
```ts
import { gatewayRpc } from '../../server/gateway'
await gatewayRpc('sessions.delete', { key: sessionKey })
```

## Rules
- **Never push to GitHub** — PRs only, Eric reviews before merge
- **Always run `npx tsc --noEmit`** before finishing — 0 errors required
- **No pnpm** — use npm
- **No new dependencies** without asking — check if existing packages cover it first
- **Mobile-first** — all UI must work on small screens
- **Dark theme only** — use primary-* tokens, never hardcode colors
- **POST endpoints** must have `requireJsonContentType` CSRF check
- **All endpoints** must have `isAuthenticated` check

## Common Imports
```ts
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { SomeIcon } from '@hugeicons/core-free-icons'
import { motion, AnimatePresence } from 'motion/react'
import { useQuery, useMutation } from '@tanstack/react-query'
```

## Current Branch: main
Latest commit: f7d4ff9 — mobile setup wizard, paste fix, CLI kill fix
