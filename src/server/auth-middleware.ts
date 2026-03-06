import { randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * In-memory session store with TTL-based expiry.
 * Tokens expire after SESSION_MAX_AGE_MS to prevent unbounded accumulation.
 * For production deployments with multiple replicas, consider Redis or a database.
 */
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days, matching cookie Max-Age

const tokenExpiry = new Map<string, number>()

// Purge expired tokens every 60 minutes to prevent unbounded memory growth.
setInterval(
  () => {
    const now = Date.now()
    for (const [tok, expiresAt] of tokenExpiry) {
      if (now >= expiresAt) {
        tokenExpiry.delete(tok)
      }
    }
  },
  60 * 60 * 1000,
).unref?.()

/**
 * Generate a cryptographically secure session token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Store a session token with an absolute expiry timestamp.
 */
export function storeSessionToken(token: string): void {
  tokenExpiry.set(token, Date.now() + SESSION_MAX_AGE_MS)
}

/**
 * Check if a session token is valid and not yet expired.
 */
export function isValidSessionToken(token: string): boolean {
  const expiresAt = tokenExpiry.get(token)
  if (expiresAt === undefined) return false
  if (Date.now() >= expiresAt) {
    tokenExpiry.delete(token)
    return false
  }
  return true
}

/**
 * Remove a session token (logout).
 */
export function revokeSessionToken(token: string): void {
  tokenExpiry.delete(token)
}

/**
 * Check if password protection is enabled.
 */
export function isPasswordProtectionEnabled(): boolean {
  return Boolean(
    process.env.MGTSUITE_PASSWORD && process.env.MGTSUITE_PASSWORD.length > 0,
  )
}

/**
 * Verify password using constant-time comparison.
 *
 * Both buffers are padded to the same length before the comparison so that the
 * execution time of this function does not reveal whether the submitted
 * password is the same length as the configured password (length timing leak).
 * The final length check is a non-secret boolean OR of the comparison result,
 * so it does not reintroduce a timing side-channel.
 */
export function verifyPassword(password: string): boolean {
  const configured = process.env.MGTSUITE_PASSWORD
  if (!configured || configured.length === 0) {
    return false
  }

  const passwordBuf = Buffer.from(password, 'utf8')
  const configuredBuf = Buffer.from(configured, 'utf8')

  // Pad both buffers to the same length so timingSafeEqual always performs a
  // full constant-time comparison regardless of whether the lengths differ.
  const maxLen = Math.max(passwordBuf.length, configuredBuf.length)
  const paddedPassword = Buffer.alloc(maxLen)
  const paddedConfigured = Buffer.alloc(maxLen)
  passwordBuf.copy(paddedPassword)
  configuredBuf.copy(paddedConfigured)

  try {
    const bytesEqual = timingSafeEqual(paddedPassword, paddedConfigured)
    // Also enforce that the original lengths match so that a zero-padded short
    // password cannot accidentally compare equal to a longer configured password.
    return bytesEqual && passwordBuf.length === configuredBuf.length
  } catch {
    return false
  }
}

/**
 * Extract session token from cookie header.
 */
export function getSessionTokenFromCookie(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  for (const cookie of cookies) {
    if (cookie.startsWith('mgtsuite-auth=')) {
      return cookie.substring('mgtsuite-auth='.length)
    }
  }
  return null
}

/**
 * Check if the request is authenticated.
 * Returns true if:
 * - Password protection is disabled, OR
 * - Request has a valid, unexpired session token
 */
export function isAuthenticated(request: Request): boolean {
  // No password configured? No auth needed
  if (!isPasswordProtectionEnabled()) {
    return true
  }

  // Check for valid session token
  const cookieHeader = request.headers.get('cookie')
  const token = getSessionTokenFromCookie(cookieHeader)

  if (!token) {
    return false
  }

  return isValidSessionToken(token)
}

/**
 * Create a Set-Cookie header for the session token.
 *
 * The Secure attribute is added when the request arrived over HTTPS (detected
 * via the X-Forwarded-Proto header set by a reverse proxy, or when the
 * FORCE_SECURE_COOKIES=1 env var is set). This keeps local HTTP dev working
 * while enforcing Secure in production HTTPS deployments.
 *
 * Attributes:
 *   HttpOnly        — blocks JavaScript access, mitigates XSS session theft
 *   Secure          — HTTPS-only delivery (set when request is over TLS)
 *   SameSite=Strict — cookie not sent on cross-site requests (CSRF protection)
 *   Path=/          — available to all routes
 *   Max-Age         — 30-day absolute expiry (matches server-side SESSION_MAX_AGE_MS)
 */
export function createSessionCookie(token: string, request?: Request): string {
  const maxAge = 30 * 24 * 60 * 60
  const isSecure =
    process.env.FORCE_SECURE_COOKIES === '1' ||
    request?.headers.get('x-forwarded-proto') === 'https'

  const securePart = isSecure ? '; Secure' : ''
  return `mgtsuite-auth=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${securePart}`
}
