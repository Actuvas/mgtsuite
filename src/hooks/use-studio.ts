/**
 * React hooks for MGT Studio data.
 *
 * All hooks use TanStack Query v5 following the same conventions as
 * use-system-metrics.ts and use-search-data.ts in this codebase:
 *   - useQuery with named queryKey arrays
 *   - retry: false for external services (mirrors existing pattern)
 *   - Signal forwarded from TanStack Query to the fetch layer for cancellation
 *   - Raw query spread-returned alongside any derived values
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchStudioTasks,
  fetchStudioTask,
  fetchStudioStatsOverview,
  fetchStudioStatsTrends,
} from '@/lib/studio-api'
import type {
  FetchStudioTasksOptions,
  FetchStudioStatsTrendsOptions,
  StudioTaskStatus,
} from '@/lib/studio-api'

// ── Query key factory ─────────────────────────────────────────────────────────

export const studioKeys = {
  all: ['studio'] as const,
  tasks: () => [...studioKeys.all, 'tasks'] as const,
  taskList: (opts: { page?: number; pageSize?: number; status?: StudioTaskStatus }) =>
    [...studioKeys.tasks(), opts] as const,
  task: (id: string) => [...studioKeys.tasks(), id] as const,
  stats: () => [...studioKeys.all, 'stats'] as const,
  statsOverview: () => [...studioKeys.stats(), 'overview'] as const,
  statsTrends: (opts: { periodDays?: number }) =>
    [...studioKeys.stats(), 'trends', opts] as const,
} as const

// ── Stale time constants ──────────────────────────────────────────────────────

const TASKS_STALE_TIME_MS = 30_000
const TASK_DETAIL_STALE_TIME_MS = 15_000
const STATS_STALE_TIME_MS = 60_000
const TRENDS_STALE_TIME_MS = 5 * 60_000

// ── Hooks ─────────────────────────────────────────────────────────────────────

export type UseStudioTasksOptions = Omit<FetchStudioTasksOptions, 'signal'> & {
  enabled?: boolean
}

/**
 * Fetches the paginated task list from MGT Studio.
 *
 * @example
 * const { data, isLoading, error } = useStudioTasks({ page: 1, pageSize: 20 })
 */
export function useStudioTasks(options: UseStudioTasksOptions = {}) {
  const { enabled = true, ...fetchOptions } = options

  return useQuery({
    queryKey: studioKeys.taskList({
      page: fetchOptions.page,
      pageSize: fetchOptions.pageSize,
      status: fetchOptions.status,
    }),
    queryFn: ({ signal }) => fetchStudioTasks({ ...fetchOptions, signal }),
    enabled,
    staleTime: TASKS_STALE_TIME_MS,
    retry: false,
  })
}

/**
 * Fetches a single Studio task by ID, including its clip array.
 *
 * @example
 * const { data: task } = useStudioTask('task-abc123')
 */
export function useStudioTask(id: string | null | undefined) {
  return useQuery({
    queryKey: studioKeys.task(id ?? ''),
    queryFn: ({ signal }) => fetchStudioTask(id!, signal),
    enabled: Boolean(id),
    staleTime: TASK_DETAIL_STALE_TIME_MS,
    retry: false,
  })
}

/**
 * Fetches aggregate stats from MGT Studio (counts, averages).
 * Refreshes every 60 seconds automatically.
 *
 * @example
 * const { data: overview } = useStudioStatsOverview()
 */
export function useStudioStatsOverview() {
  return useQuery({
    queryKey: studioKeys.statsOverview(),
    queryFn: ({ signal }) => fetchStudioStatsOverview(signal),
    staleTime: STATS_STALE_TIME_MS,
    refetchInterval: STATS_STALE_TIME_MS,
    retry: false,
  })
}

export type UseStudioStatsTrendsOptions = Omit<
  FetchStudioStatsTrendsOptions,
  'signal'
> & {
  enabled?: boolean
}

/**
 * Fetches the daily clip and processing-time trend series from MGT Studio.
 *
 * @example
 * const { data: trends } = useStudioStatsTrends({ periodDays: 14 })
 */
export function useStudioStatsTrends(
  options: UseStudioStatsTrendsOptions = {},
) {
  const { enabled = true, ...fetchOptions } = options

  return useQuery({
    queryKey: studioKeys.statsTrends({ periodDays: fetchOptions.periodDays }),
    queryFn: ({ signal }) => fetchStudioStatsTrends({ ...fetchOptions, signal }),
    enabled,
    staleTime: TRENDS_STALE_TIME_MS,
    retry: false,
  })
}
