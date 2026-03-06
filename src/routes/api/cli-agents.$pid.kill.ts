import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'

const execFileAsync = promisify(execFile)

/** Verify the given PID belongs to a codex/claude agent process. */
async function isAgentProcess(pid: number): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('ps', ['-o', 'command=', '-p', String(pid)])
    return stdout.toLowerCase().includes('codex') || stdout.toLowerCase().includes('claude')
  } catch {
    return false
  }
}

export const Route = createFileRoute('/api/cli-agents/$pid/kill')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const pid = Number(params.pid)
        if (!Number.isFinite(pid) || !Number.isInteger(pid) || pid <= 0) {
          return json({ ok: false, error: 'Invalid pid' }, { status: 400 })
        }

        const isAgent = await isAgentProcess(pid)
        if (!isAgent) {
          return json({ ok: false, error: 'PID is not a recognized agent process' }, { status: 403 })
        }

        try {
          process.kill(pid, 'SIGTERM')
          return json({ ok: true })
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ESRCH'
          ) {
            // Process already exited; treat as success.
            return json({ ok: true })
          }

          return json(
            {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
