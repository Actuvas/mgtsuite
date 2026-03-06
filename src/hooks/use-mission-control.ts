/**
 * React hooks for MGT Mission Control data.
 *
 * Follows the same TanStack Query v5 conventions as use-studio.ts:
 *   - Hierarchical queryKey factory for precise cache invalidation
 *   - Signals forwarded for request cancellation
 *   - retry: false (MC is a local service; fast-fail is preferable)
 *   - Mutation helpers expose the raw async functions directly from
 *     mc-api.ts so callers can use them with useMutation or call them
 *     imperatively — this keeps the hooks file focused on reads.
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchMCTasks,
  fetchMCTask,
  fetchMCBoards,
  fetchMCBoard,
  fetchMCAgents,
  fetchMCAgent,
} from '@/lib/mc-api'
import type {
  FetchMCTasksOptions,
  FetchMCBoardsOptions,
  FetchMCAgentsOptions,
  MCTaskStatus,
  MCBoardStatus,
  MCAgentStatus,
} from '@/lib/mc-api'

// ── Query key factory ─────────────────────────────────────────────────────────

export const mcKeys = {
  all: ['mission-control'] as const,
  tasks: () => [...mcKeys.all, 'tasks'] as const,
  taskList: (opts: {
    boardId?: string
    status?: MCTaskStatus
    assignedAgentId?: string
  }) => [...mcKeys.tasks(), opts] as const,
  task: (id: string) => [...mcKeys.tasks(), id] as const,
  boards: () => [...mcKeys.all, 'boards'] as const,
  boardList: (opts: { status?: MCBoardStatus; orgId?: string }) =>
    [...mcKeys.boards(), opts] as const,
  board: (id: string) => [...mcKeys.boards(), id] as const,
  agents: () => [...mcKeys.all, 'agents'] as const,
  agentList: (opts: { status?: MCAgentStatus }) =>
    [...mcKeys.agents(), opts] as const,
  agent: (id: string) => [...mcKeys.agents(), id] as const,
} as const

// ── Stale time constants ──────────────────────────────────────────────────────

const TASKS_STALE_TIME_MS = 20_000
const TASK_DETAIL_STALE_TIME_MS = 10_000
const BOARDS_STALE_TIME_MS = 30_000
const BOARD_DETAIL_STALE_TIME_MS = 15_000
const AGENTS_STALE_TIME_MS = 15_000
const AGENT_DETAIL_STALE_TIME_MS = 10_000
const AGENTS_REFETCH_INTERVAL_MS = 15_000

// ── Task hooks ────────────────────────────────────────────────────────────────

export type UseMCTasksOptions = Omit<FetchMCTasksOptions, 'signal'> & {
  enabled?: boolean
}

/**
 * Fetches the Mission Control task list, optionally filtered by board,
 * status, or assigned agent.
 *
 * @example
 * const { data } = useMCTasks({ boardId: 'board-123', status: 'in_progress' })
 */
export function useMCTasks(options: UseMCTasksOptions = {}) {
  const { enabled = true, ...fetchOptions } = options

  return useQuery({
    queryKey: mcKeys.taskList({
      boardId: fetchOptions.boardId,
      status: fetchOptions.status,
      assignedAgentId: fetchOptions.assignedAgentId,
    }),
    queryFn: ({ signal }) => fetchMCTasks({ ...fetchOptions, signal }),
    enabled,
    staleTime: TASKS_STALE_TIME_MS,
    retry: false,
  })
}

/**
 * Fetches a single Mission Control task by ID.
 *
 * @example
 * const { data: task } = useMCTask('task-uuid')
 */
export function useMCTask(id: string | null | undefined) {
  return useQuery({
    queryKey: mcKeys.task(id ?? ''),
    queryFn: ({ signal }) => fetchMCTask(id!, signal),
    enabled: Boolean(id),
    staleTime: TASK_DETAIL_STALE_TIME_MS,
    retry: false,
  })
}

// ── Board hooks ───────────────────────────────────────────────────────────────

export type UseMCBoardsOptions = Omit<FetchMCBoardsOptions, 'signal'> & {
  enabled?: boolean
}

/**
 * Fetches the Mission Control board list.
 *
 * @example
 * const { data } = useMCBoards({ status: 'active' })
 */
export function useMCBoards(options: UseMCBoardsOptions = {}) {
  const { enabled = true, ...fetchOptions } = options

  return useQuery({
    queryKey: mcKeys.boardList({
      status: fetchOptions.status,
      orgId: fetchOptions.orgId,
    }),
    queryFn: ({ signal }) => fetchMCBoards({ ...fetchOptions, signal }),
    enabled,
    staleTime: BOARDS_STALE_TIME_MS,
    retry: false,
  })
}

/**
 * Fetches a single Mission Control board by ID, including its task list.
 *
 * @example
 * const { data: board } = useMCBoard('board-uuid')
 */
export function useMCBoard(id: string | null | undefined) {
  return useQuery({
    queryKey: mcKeys.board(id ?? ''),
    queryFn: ({ signal }) => fetchMCBoard(id!, signal),
    enabled: Boolean(id),
    staleTime: BOARD_DETAIL_STALE_TIME_MS,
    retry: false,
  })
}

// ── Agent hooks ───────────────────────────────────────────────────────────────

export type UseMCAgentsOptions = Omit<FetchMCAgentsOptions, 'signal'> & {
  enabled?: boolean
  /** When true the query refetches on the AGENTS_REFETCH_INTERVAL_MS cadence
   *  so the agent status column stays live. Default false. */
  live?: boolean
}

/**
 * Fetches the Mission Control agent list.
 * Pass `live: true` to keep status current with automatic polling.
 *
 * @example
 * const { data } = useMCAgents({ status: 'active', live: true })
 */
export function useMCAgents(options: UseMCAgentsOptions = {}) {
  const { enabled = true, live = false, ...fetchOptions } = options

  return useQuery({
    queryKey: mcKeys.agentList({ status: fetchOptions.status }),
    queryFn: ({ signal }) => fetchMCAgents({ ...fetchOptions, signal }),
    enabled,
    staleTime: AGENTS_STALE_TIME_MS,
    refetchInterval: live ? AGENTS_REFETCH_INTERVAL_MS : false,
    retry: false,
  })
}

/**
 * Fetches a single Mission Control agent by ID.
 *
 * @example
 * const { data: agent } = useMCAgent('agent-uuid')
 */
export function useMCAgent(id: string | null | undefined) {
  return useQuery({
    queryKey: mcKeys.agent(id ?? ''),
    queryFn: ({ signal }) => fetchMCAgent(id!, signal),
    enabled: Boolean(id),
    staleTime: AGENT_DETAIL_STALE_TIME_MS,
    retry: false,
  })
}
