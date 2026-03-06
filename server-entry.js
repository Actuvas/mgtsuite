import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import server from './dist/server/server.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const CLIENT_DIR = join(__dirname, 'dist', 'client')

const port = parseInt(process.env.PORT || '3000', 10)
const host = process.env.HOST || '0.0.0.0'

const MIME_TYPES = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
}

/**
 * Security headers applied to every response.
 *
 * CSP notes:
 *  - 'unsafe-inline' for scripts is required for the inline splash-screen and
 *    theme scripts injected by __root.tsx. Prefer removing those scripts and
 *    switching to nonces if tightening CSP further.
 *  - Shiki syntax highlighting generates inline styles — 'unsafe-inline' is
 *    therefore required for style-src as well.
 *  - The connect-src allowlist covers the local gateway WebSocket, the MGT Suite
 *    API itself, and blob: for any file downloads.
 *  - ws: and wss: in connect-src cover the gateway WebSocket proxy.
 *  - data: in img-src is needed for base64-encoded image previews.
 */
const SECURITY_HEADERS = {
  // Prevent MIME sniffing — always honour the declared Content-Type
  'X-Content-Type-Options': 'nosniff',

  // Block framing by other origins (clickjacking protection)
  'X-Frame-Options': 'SAMEORIGIN',

  // Legacy XSS filter (belt-and-suspenders for older browsers)
  'X-XSS-Protection': '1; mode=block',

  // Do not send Referer to cross-origin destinations
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Disable browser features that the app does not need
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',

  // HSTS: only set when running over HTTPS (detected via env var or proxy header)
  // 1 year max-age; includeSubDomains is intentionally omitted for local-first use.
  ...(process.env.FORCE_SECURE_COOKIES === '1'
    ? { 'Strict-Transport-Security': 'max-age=31536000' }
    : {}),

  // Content Security Policy
  // default-src 'self' restricts all fetch-type directives unless overridden below.
  'Content-Security-Policy': [
    "default-src 'self'",
    // Inline scripts are required for splash screen and theme bootstrap (see __root.tsx).
    // Remove 'unsafe-inline' and add a nonce if you inline fewer scripts in future.
    "script-src 'self' 'unsafe-inline'",
    // Shiki produces inline <style> blocks for syntax highlighting colours.
    "style-src 'self' 'unsafe-inline'",
    // data: URI images for base64 file preview; blob: for downloads
    "img-src 'self' data: blob:",
    // Fonts are all bundled locally
    "font-src 'self'",
    // API calls go to self; WebSocket to self (proxied to gateway); blob: for workers
    "connect-src 'self' ws: wss: blob:",
    // Worker scripts are bundled with the app
    "worker-src 'self' blob:",
    // No plugins (Flash, etc.)
    "object-src 'none'",
    // base element must point to same origin only
    "base-uri 'self'",
    // All form actions stay on the app itself
    "form-action 'self'",
    // The app embeds the gateway UI in an iframe (see vite.config.ts /gateway-ui proxy)
    // Allow framing from self only; adjust if the gateway runs on a different origin.
    "frame-src 'self'",
  ].join('; '),
}

/**
 * Attach all security headers to an outgoing Node http.ServerResponse.
 * Skips headers that were already set (avoids overwriting explicit values
 * set by individual API handlers, e.g. Content-Type on API responses).
 */
function applySecurityHeaders(res) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!res.hasHeader(name)) {
      res.setHeader(name, value)
    }
  }
}

async function tryServeStatic(req, res) {
  const url = new URL(
    req.url || '/',
    `http://${req.headers.host || 'localhost'}`,
  )
  const pathname = decodeURIComponent(url.pathname)

  // Prevent directory traversal
  if (pathname.includes('..')) return false

  const filePath = join(CLIENT_DIR, pathname)

  // Make sure the resolved path is within CLIENT_DIR
  if (!filePath.startsWith(CLIENT_DIR)) return false

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) return false

    const ext = extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const data = await readFile(filePath)

    const headers = {
      'Content-Type': contentType,
      'Content-Length': data.length,
    }

    // Cache hashed assets aggressively (they have content hashes in filenames)
    if (pathname.startsWith('/assets/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    }

    // Apply security headers before writeHead so they merge with file headers
    applySecurityHeaders(res)
    res.writeHead(200, headers)
    res.end(data)
    return true
  } catch {
    return false
  }
}

const httpServer = createServer(async (req, res) => {
  // Try static files first (client assets)
  if (req.method === 'GET' || req.method === 'HEAD') {
    const served = await tryServeStatic(req, res)
    if (served) return
  }

  // Fall through to SSR handler
  const url = new URL(
    req.url || '/',
    `http://${req.headers.host || 'localhost'}`,
  )

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  let body = null
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise((resolve) => {
      const chunks = []
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body,
    duplex: 'half',
  })

  try {
    const response = await server.fetch(request)

    // Apply security headers first, then let individual route headers take precedence.
    applySecurityHeaders(res)
    res.writeHead(
      response.status,
      Object.fromEntries(response.headers.entries()),
    )

    if (response.body) {
      const reader = response.body.getReader()
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(value)
        }
        res.end()
      }
      pump().catch((err) => {
        console.error('Stream error:', err)
        res.end()
      })
    } else {
      const text = await response.text()
      res.end(text)
    }
  } catch (err) {
    console.error('Request error:', err)
    res.writeHead(500)
    res.end('Internal Server Error')
  }
})

httpServer.listen(port, host, () => {
  console.log(`MGT Suite running at http://${host}:${port}`)
})
