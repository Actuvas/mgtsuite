import fs from 'node:fs'
import path from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '@/server/auth-middleware'

const FACTORY = 'C:\\ClawFactory'
const STATE_FILE = path.join(FACTORY, 'logs', 'pipeline_state.json')
const HEARTBEAT_FILE = path.join(FACTORY, 'logs', 'pipeline_heartbeat.json')

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const Route = createFileRoute('/api/pipeline-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const state = readJson(STATE_FILE) as Record<string, unknown> | null
        const heartbeat = readJson(HEARTBEAT_FILE)

        if (!state) {
          return json({
            ok: true,
            status: 'no_state',
            message: 'Pipeline has not run yet',
          })
        }

        const tasks = (state.tasks || {}) as Record<
          string,
          Record<string, unknown>
        >
        const taskStatuses: Record<string, number> = {}
        const heldTasks: Array<Record<string, unknown>> = []
        const nicheBreakdown: Record<string, number> = {}

        for (const [tid, t] of Object.entries(tasks)) {
          const s = (t.status as string) || 'unknown'
          taskStatuses[s] = (taskStatuses[s] || 0) + 1

          const niche = (t.niche as string) || 'unknown'
          nicheBreakdown[niche] = (nicheBreakdown[niche] || 0) + 1

          if (
            t.post_status === 'held_high' ||
            t.post_status === 'held_medium'
          ) {
            heldTasks.push({
              id: tid,
              title: t.title,
              niche: t.niche,
              safety: t.safety_result,
              post_status: t.post_status,
            })
          }
        }

        const posts = (state.posts || []) as Array<Record<string, unknown>>
        const postStatuses: Record<string, number> = {}
        for (const p of posts) {
          const s = (p.status as string) || 'unknown'
          postStatuses[s] = (postStatuses[s] || 0) + 1
        }

        return json({
          ok: true,
          date: state.date,
          phase: state.status,
          updatedAt: state.updated_at,
          stats: state.stats,
          tasks: {
            total: Object.keys(tasks).length,
            byStatus: taskStatuses,
            byNiche: nicheBreakdown,
          },
          posts: {
            total: posts.length,
            byStatus: postStatuses,
          },
          held: heldTasks,
          heartbeat,
        })
      },
    },
  },
})
