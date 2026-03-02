/**
 * Simple in-memory rate limiter (no external deps).
 * Uses a sliding window approach per key.
 */

// Tracks timestamps and the oldest window used (to compute Retry-After correctly).
const store = new Map<string, { timestamps: number[] }>()

// Cleanup old entries every 5 minutes.
// Keep the cleanup window at 2x the largest expected windowMs (120s covers a 60s window).
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}, 300_000)

type RateLimitResult =
  | { allowed: true; remaining: number; resetMs: number }
  | { allowed: false; remaining: 0; resetMs: number; retryAfterSec: number }

/**
 * Check if a request is allowed under the rate limit.
 * Returns a structured result with rate limit metadata for response headers.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)

  const resetMs = entry.timestamps.length > 0
    ? entry.timestamps[0] + windowMs
    : now + windowMs

  if (entry.timestamps.length >= maxRequests) {
    const retryAfterSec = Math.ceil((resetMs - now) / 1000)
    return { allowed: false, remaining: 0, resetMs, retryAfterSec }
  }

  entry.timestamps.push(now)
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetMs,
  }
}

/**
 * Legacy boolean wrapper — kept for call sites that only need pass/fail.
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  return checkRateLimit(key, maxRequests, windowMs).allowed
}

/**
 * Extract client IP from request for rate limiting key.
 *
 * SECURITY NOTE: X-Forwarded-For is only trusted when the app is running
 * behind a trusted reverse proxy (nginx, Caddy, etc.). When running directly
 * on the internet, do NOT trust this header — an attacker can set it to any
 * value to bypass per-IP rate limits. The env var TRUST_PROXY=1 must be
 * explicitly set to enable XFF parsing.
 */
export function getClientIp(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY === '1'

  if (trustProxy) {
    // Only use the leftmost (client) IP from X-Forwarded-For.
    // Never use X-Real-IP alone — it can be spoofed by clients too.
    const xff = request.headers.get('x-forwarded-for')
    if (xff) {
      const candidate = xff.split(',')[0].trim()
      // Validate it looks like an IP address to prevent injecting garbage keys
      if (/^[\d.:a-fA-F]+$/.test(candidate)) {
        return candidate
      }
    }
  }

  // Fall back to a single shared key for all local/direct connections.
  // This is conservative: all requests from the same server share one bucket,
  // which is safe for a local-first tool.
  return 'local'
}

/**
 * Return a 429 Too Many Requests response with standard rate limit headers.
 */
export function rateLimitResponse(retryAfterSec = 60): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests, please try again later' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}

/**
 * Build standard X-RateLimit-* response headers from a rate limit result.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
  }
}

/**
 * Lightweight CSRF check: reject POST/PUT/PATCH/DELETE that don't send
 * `Content-Type: application/json`. Browsers won't set this header on
 * a simple form/navigation request, so its presence indicates a
 * programmatic call (JS fetch, curl, etc.).
 *
 * Returns `null` when the check passes, or a 415 Response to send back.
 */
export function requireJsonContentType(request: Request): Response | null {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null
  const ct = request.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) return null
  return new Response(
    JSON.stringify({ error: 'Content-Type must be application/json' }),
    { status: 415, headers: { 'Content-Type': 'application/json' } },
  )
}

/**
 * Sanitize error for response — hide details in production.
 */
export function safeErrorMessage(err: unknown): string {
  if (process.env.NODE_ENV === 'production') {
    return 'Internal server error'
  }
  return err instanceof Error ? err.message : String(err)
}
