import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  isPasswordProtectionEnabled,
  isAuthenticated,
} from '../../server/auth-middleware'

export const Route = createFileRoute('/api/auth-check')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return Promise.race([
          (async () => {
            const authRequired = isPasswordProtectionEnabled()
            const authenticated = isAuthenticated(request)

            return json({
              authenticated,
              authRequired,
            })
          })(),
          new Promise<Response>((resolve) => {
            setTimeout(() => {
              // Fail-secure on timeout: treat auth as required and not
              // authenticated so callers never accidentally grant access.
              resolve(
                json(
                  {
                    authenticated: false,
                    authRequired: true,
                    error: 'server_timeout',
                  },
                  { status: 503 },
                ),
              )
            }, 4_000)
          }),
        ])
      },
    },
  },
})
