/**
 * MGT Mission Control API client
 * Connects to the FastAPI backend running on port 8001.
 *
 * Endpoints consumed:
 *   Tasks  — GET /tasks/   GET /tasks/{id}   POST /tasks/   PATCH /tasks/{id}   DELETE /tasks/{id}
 *   Boards — GET /boards/  GET /boards/{id}  POST /boards/  PATCH /boards/{id}  DELETE /boards/{id}
 *   Agents — GET /agents/  GET /agents/{id}  POST /agents/  PATCH /agents/{id}  DELETE /agents/{id}
 *
 * Auth: Bearer token read from MC_AUTH_TOKEN (server env).
 * The token is a server-side secret and must never be included in client bundles.
 * All Mission Control calls should be made from TanStack Start server functions
 * or server routes, not directly from browser code.
 *
 * For convenience during development the client also works when called from
 * the browser if MC_AUTH_TOKEN happens to be injected — but production usage
 * should route through a server proxy to keep the token hidden.
 */

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_MC_URL = 'http://127.0.0.1:8001'
const DEFAULT_TIMEOUT_MS = 8_000

function getMcBaseUrl(): string {
  const raw =
    typeof process !== 'undefined'
      ? process.env.MC_API_URL?.trim()
      : undefined
  return raw || DEFAULT_MC_URL
}

function getMcAuthToken(): string | null {
  const raw =
    typeof process !== 'undefined'
      ? process.env.MC_AUTH_TOKEN?.trim()
      : undefined
  return raw || null
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type MCTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'blocked'
  | 'review'
  | 'done'
  | 'cancelled'

export type MCTaskPriority = 'critical' | 'high' | 'medium' | 'low'

export type MCTask = {
  id: string
  boardId: string | null
  title: string
  description: string | null
  status: MCTaskStatus
  priority: MCTaskPriority
  assignedAgentId: string | null
  dependsOn: Array<string>
  tags: Array<string>
  metadata: Record<string, unknown> | null
  dueAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type MCTasksResponse = {
  tasks: Array<MCTask>
  total: number
}

export type MCBoardStatus = 'active' | 'archived' | 'draft'

export type MCBoard = {
  id: string
  name: string
  description: string | null
  status: MCBoardStatus
  orgId: string | null
  taskCount: number
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type MCBoardDetail = MCBoard & {
  tasks: Array<MCTask>
}

export type MCBoardsResponse = {
  boards: Array<MCBoard>
  total: number
}

export type MCAgentStatus = 'active' | 'idle' | 'paused' | 'error' | 'offline'

export type MCAgent = {
  id: string
  name: string
  description: string | null
  status: MCAgentStatus
  model: string | null
  capabilities: Array<string>
  currentTaskId: string | null
  metadata: Record<string, unknown> | null
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export type MCAgentsResponse = {
  agents: Array<MCAgent>
  total: number
}

// Mutation input types

export type CreateMCTaskInput = {
  boardId?: string
  title: string
  description?: string
  status?: MCTaskStatus
  priority?: MCTaskPriority
  assignedAgentId?: string
  dependsOn?: Array<string>
  tags?: Array<string>
  metadata?: Record<string, unknown>
  dueAt?: string
}

export type UpdateMCTaskInput = Partial<
  Omit<CreateMCTaskInput, 'boardId'>
> & {
  status?: MCTaskStatus
}

export type CreateMCBoardInput = {
  name: string
  description?: string
  status?: MCBoardStatus
  orgId?: string
  metadata?: Record<string, unknown>
}

export type UpdateMCBoardInput = Partial<CreateMCBoardInput>

export type CreateMCAgentInput = {
  name: string
  description?: string
  model?: string
  capabilities?: Array<string>
  metadata?: Record<string, unknown>
}

export type UpdateMCAgentInput = Partial<CreateMCAgentInput> & {
  status?: MCAgentStatus
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function readError(response: Response): Promise<string> {
  const fallback = response.statusText || 'Mission Control request failed'
  try {
    const text = await response.text()
    try {
      const json = JSON.parse(text) as Record<string, unknown>
      return (json.detail ?? json.message ?? json.error ?? fallback) as string
    } catch {
      return text || fallback
    }
  } catch {
    return fallback
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

type MCRequestInit = {
  method?: string
  body?: string
  timeoutMs?: number
  signal?: AbortSignal
}

async function mcFetch<T>(
  pathname: string,
  init: MCRequestInit = {},
): Promise<T> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = init

  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(new Error('timeout')),
    timeoutMs,
  )
  const onAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const url = `${getMcBaseUrl()}${pathname}`
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }

    const token = getMcAuthToken()
    if (token) {
      headers['authorization'] = `Bearer ${token}`
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

    // 204 No Content — DELETE responses
    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Mission Control request timed out')
    }
    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', onAbort)
  }
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export type FetchMCTasksOptions = {
  boardId?: string
  status?: MCTaskStatus
  assignedAgentId?: string
  signal?: AbortSignal
}

export async function fetchMCTasks(
  options: FetchMCTasksOptions = {},
): Promise<MCTasksResponse> {
  const { boardId, status, assignedAgentId, signal } = options
  const params = new URLSearchParams()
  if (boardId) params.set('board_id', boardId)
  if (status) params.set('status', status)
  if (assignedAgentId) params.set('assigned_agent_id', assignedAgentId)

  const qs = params.toString()
  return mcFetch<MCTasksResponse>(`/tasks/${qs ? `?${qs}` : ''}`, { signal })
}

export async function fetchMCTask(
  id: string,
  signal?: AbortSignal,
): Promise<MCTask> {
  return mcFetch<MCTask>(`/tasks/${encodeURIComponent(id)}`, { signal })
}

export async function createMCTask(
  input: CreateMCTaskInput,
): Promise<MCTask> {
  return mcFetch<MCTask>('/tasks/', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateMCTask(
  id: string,
  input: UpdateMCTaskInput,
): Promise<MCTask> {
  return mcFetch<MCTask>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteMCTask(id: string): Promise<void> {
  return mcFetch<void>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// ── Boards ────────────────────────────────────────────────────────────────────

export type FetchMCBoardsOptions = {
  status?: MCBoardStatus
  orgId?: string
  signal?: AbortSignal
}

export async function fetchMCBoards(
  options: FetchMCBoardsOptions = {},
): Promise<MCBoardsResponse> {
  const { status, orgId, signal } = options
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (orgId) params.set('org_id', orgId)

  const qs = params.toString()
  return mcFetch<MCBoardsResponse>(`/boards/${qs ? `?${qs}` : ''}`, { signal })
}

export async function fetchMCBoard(
  id: string,
  signal?: AbortSignal,
): Promise<MCBoardDetail> {
  return mcFetch<MCBoardDetail>(`/boards/${encodeURIComponent(id)}`, { signal })
}

export async function createMCBoard(
  input: CreateMCBoardInput,
): Promise<MCBoard> {
  return mcFetch<MCBoard>('/boards/', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateMCBoard(
  id: string,
  input: UpdateMCBoardInput,
): Promise<MCBoard> {
  return mcFetch<MCBoard>(`/boards/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteMCBoard(id: string): Promise<void> {
  return mcFetch<void>(`/boards/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// ── Agents ────────────────────────────────────────────────────────────────────

export type FetchMCAgentsOptions = {
  status?: MCAgentStatus
  signal?: AbortSignal
}

export async function fetchMCAgents(
  options: FetchMCAgentsOptions = {},
): Promise<MCAgentsResponse> {
  const { status, signal } = options
  const params = new URLSearchParams()
  if (status) params.set('status', status)

  const qs = params.toString()
  return mcFetch<MCAgentsResponse>(`/agents/${qs ? `?${qs}` : ''}`, { signal })
}

export async function fetchMCAgent(
  id: string,
  signal?: AbortSignal,
): Promise<MCAgent> {
  return mcFetch<MCAgent>(`/agents/${encodeURIComponent(id)}`, { signal })
}

export async function createMCAgent(
  input: CreateMCAgentInput,
): Promise<MCAgent> {
  return mcFetch<MCAgent>('/agents/', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateMCAgent(
  id: string,
  input: UpdateMCAgentInput,
): Promise<MCAgent> {
  return mcFetch<MCAgent>(`/agents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteMCAgent(id: string): Promise<void> {
  return mcFetch<void>(`/agents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
