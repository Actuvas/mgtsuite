/**
 * MGT Studio API client
 * Connects to the FastAPI backend running on port 8000.
 *
 * Endpoints consumed:
 *   GET /tasks/              — paginated task list
 *   GET /tasks/{id}          — task detail with clip array
 *   GET /stats/overview      — aggregate metrics
 *   GET /stats/trends        — daily clips + processing time series
 *
 * Auth: user_id header injected from the value of STUDIO_USER_ID (server env)
 * or falls back to 'local' for development.
 *
 * All functions are safe to call from both server and client contexts.
 * Env vars that must NOT leak to the client bundle are read through
 * process.env — Vite's client-process-env plugin blanks unknown vars,
 * keeping secrets server-side only.
 */

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_STUDIO_URL = 'http://127.0.0.1:8000'
const DEFAULT_TIMEOUT_MS = 8_000

function getStudioBaseUrl(): string {
  const raw =
    typeof process !== 'undefined'
      ? process.env.STUDIO_API_URL?.trim()
      : undefined
  return raw || DEFAULT_STUDIO_URL
}

function getStudioUserId(): string {
  const raw =
    typeof process !== 'undefined'
      ? process.env.STUDIO_USER_ID?.trim()
      : undefined
  return raw || 'local'
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type StudioClipStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export type StudioClip = {
  id: string
  taskId: string
  title: string | null
  status: StudioClipStatus
  startTime: number | null
  endTime: number | null
  durationSeconds: number | null
  outputPath: string | null
  thumbnailUrl: string | null
  captionText: string | null
  safetyScore: number | null
  createdAt: string
  updatedAt: string
}

export type StudioTaskStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type StudioTask = {
  id: string
  userId: string
  title: string
  sourceUrl: string | null
  sourceType: string | null
  status: StudioTaskStatus
  progress: number | null
  errorMessage: string | null
  clipCount: number
  createdAt: string
  updatedAt: string
}

export type StudioTaskDetail = StudioTask & {
  clips: Array<StudioClip>
}

export type StudioTasksResponse = {
  tasks: Array<StudioTask>
  total: number
  page: number
  pageSize: number
}

export type StudioStatsOverview = {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  processingTasks: number
  totalClips: number
  averageClipsPerTask: number | null
  averageProcessingTimeSeconds: number | null
}

export type StudioStatsTrendPoint = {
  date: string
  clipsCreated: number
  averageProcessingTimeSeconds: number | null
}

export type StudioStatsTrends = {
  points: Array<StudioStatsTrendPoint>
  periodDays: number
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>
    if (typeof payload.detail === 'string') return payload.detail
    if (typeof payload.error === 'string') return payload.error
    if (typeof payload.message === 'string') return payload.message
    return JSON.stringify(payload)
  } catch {
    const text = await response.text().catch(() => '')
    return text || response.statusText || 'Studio request failed'
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

type StudioRequestInit = {
  method?: string
  body?: string
  timeoutMs?: number
  signal?: AbortSignal
}

async function studioFetch<T>(
  pathname: string,
  init: StudioRequestInit = {},
): Promise<T> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = init

  const controller = new AbortController()

  // Respect an externally provided signal (e.g. TanStack Query's signal)
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const url = `${getStudioBaseUrl()}${pathname}`
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-user-id': getStudioUserId(),
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(await readError(response))
    }

    return (await response.json()) as T
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Studio request timed out')
    }
    throw error
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

// ── Public API functions ──────────────────────────────────────────────────────

export type FetchStudioTasksOptions = {
  page?: number
  pageSize?: number
  status?: StudioTaskStatus
  signal?: AbortSignal
}

export async function fetchStudioTasks(
  options: FetchStudioTasksOptions = {},
): Promise<StudioTasksResponse> {
  const { page = 1, pageSize = 20, status, signal } = options
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  if (status) params.set('status', status)

  return studioFetch<StudioTasksResponse>(`/tasks/?${params.toString()}`, {
    signal,
  })
}

export async function fetchStudioTask(
  id: string,
  signal?: AbortSignal,
): Promise<StudioTaskDetail> {
  return studioFetch<StudioTaskDetail>(
    `/tasks/${encodeURIComponent(id)}`,
    { signal },
  )
}

export async function fetchStudioStatsOverview(
  signal?: AbortSignal,
): Promise<StudioStatsOverview> {
  return studioFetch<StudioStatsOverview>('/stats/overview', { signal })
}

export type FetchStudioStatsTrendsOptions = {
  periodDays?: number
  signal?: AbortSignal
}

export async function fetchStudioStatsTrends(
  options: FetchStudioStatsTrendsOptions = {},
): Promise<StudioStatsTrends> {
  const { periodDays = 30, signal } = options
  const params = new URLSearchParams()
  params.set('period_days', String(periodDays))

  return studioFetch<StudioStatsTrends>(`/stats/trends?${params.toString()}`, {
    signal,
  })
}
