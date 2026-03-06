import { useState } from 'react'
import {
  Video01Icon,
  Clock01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  FilterHorizontalIcon,
  CheckmarkCircle01Icon,
  Alert01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { cn } from '@/lib/utils'
import { useStudioTasks, useStudioTask, useStudioStatsOverview } from '@/hooks/use-studio'
import { EmptyState } from '@/components/empty-state'
import type { StudioTaskStatus, StudioTask, StudioClip } from '@/lib/studio-api'

// ── Types ──────────────────────────────────────────────────────────────────────

type StatusFilter = StudioTaskStatus | 'all'

type FilterOption = {
  id: StatusFilter
  label: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS: Array<FilterOption> = [
  { id: 'all', label: 'All' },
  { id: 'queued', label: 'Queued' },
  { id: 'processing', label: 'Processing' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
]

const PAGE_SIZE = 20

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSeconds(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m${secs > 0 ? ` ${secs}s` : ''}`
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatClipFilename(clip: StudioClip): string {
  if (clip.outputPath) {
    const parts = clip.outputPath.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] ?? clip.id
  }
  if (clip.title) return clip.title
  return clip.id
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TaskStatusBadge({ status }: { status: StudioTaskStatus }) {
  const config: Record<StudioTaskStatus, { label: string; className: string }> = {
    queued: {
      label: 'QUEUED',
      className: 'border-amber-900 bg-amber-950/60 text-amber-400',
    },
    processing: {
      label: 'RUNNING',
      className: 'border-blue-900 bg-blue-950/60 text-blue-400',
    },
    completed: {
      label: 'DONE',
      className: 'border-emerald-900 bg-emerald-950/60 text-emerald-400',
    },
    failed: {
      label: 'FAILED',
      className: 'border-red-900 bg-red-950/60 text-red-400',
    },
    cancelled: {
      label: 'CANCEL',
      className: 'border-neutral-700 bg-neutral-900/60 text-neutral-400',
    },
  }

  const { label, className } = config[status] ?? config.cancelled

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        className,
      )}
    >
      {label}
    </span>
  )
}

function ClipStatusIndicator({ status }: { status: StudioClip['status'] }) {
  if (status === 'completed') {
    return (
      <span className='inline-flex items-center gap-1 rounded-full border border-emerald-900 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium text-emerald-400'>
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={10} strokeWidth={1.5} />
        Complete
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className='inline-flex items-center gap-1 rounded-full border border-red-900 bg-red-950/60 px-2 py-0.5 text-[10px] font-medium text-red-400'>
        <HugeiconsIcon icon={Alert01Icon} size={10} strokeWidth={1.5} />
        Failed
      </span>
    )
  }
  return (
    <span className='inline-flex items-center gap-1 rounded-full border border-blue-900 bg-blue-950/60 px-2 py-0.5 text-[10px] font-medium text-blue-400'>
      <span className='size-1.5 animate-pulse rounded-full bg-blue-400' />
      Processing
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TaskRowSkeleton() {
  return (
    <div className='flex animate-pulse items-center gap-3 border-b border-primary-200 px-4 py-3 dark:border-neutral-800'>
      <div className='h-4 w-48 rounded bg-primary-200 dark:bg-neutral-800' />
      <div className='h-5 w-16 rounded-full bg-primary-200 dark:bg-neutral-800' />
      <div className='ml-auto h-4 w-12 rounded bg-primary-200 dark:bg-neutral-800' />
      <div className='h-4 w-20 rounded bg-primary-200 dark:bg-neutral-800' />
      <div className='h-4 w-10 rounded bg-primary-200 dark:bg-neutral-800' />
    </div>
  )
}

// ── Expanded Clips Panel ───────────────────────────────────────────────────────

function ExpandedClipsPanel({ taskId }: { taskId: string }) {
  const { data, isLoading, error } = useStudioTask(taskId)

  if (isLoading) {
    return (
      <div className='space-y-1.5 px-4 py-3'>
        {[0, 1, 2].map(function renderClipSkeleton(i) {
          return (
            <div
              key={i}
              className='flex h-8 animate-pulse items-center gap-3 rounded-lg bg-primary-100 dark:bg-neutral-800/60'
            />
          )
        })}
      </div>
    )
  }

  if (error) {
    return (
      <div className='px-4 py-3'>
        <p className='text-xs text-red-500 dark:text-red-400'>
          {error instanceof Error ? error.message : 'Failed to load clips'}
        </p>
      </div>
    )
  }

  const clips = data?.clips ?? []

  if (clips.length === 0) {
    return (
      <div className='px-4 py-3'>
        <p className='text-xs text-primary-400 dark:text-neutral-500'>
          No clips attached to this task
        </p>
      </div>
    )
  }

  return (
    <div className='border-t border-primary-200 bg-primary-50/40 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40'>
      <p className='mb-2 text-[10px] font-medium uppercase tracking-wider text-primary-400 dark:text-neutral-500'>
        Clips ({clips.length})
      </p>
      <div className='space-y-1.5'>
        {clips.map(function renderClip(clip) {
          return (
            <div
              key={clip.id}
              className='flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900'
            >
              <span className='min-w-0 flex-1 truncate font-mono text-[11px] text-primary-700 dark:text-neutral-300'>
                {formatClipFilename(clip)}
              </span>
              {clip.durationSeconds !== null ? (
                <span className='flex items-center gap-0.5 text-[10px] tabular-nums text-primary-400 dark:text-neutral-500'>
                  <HugeiconsIcon icon={Clock01Icon} size={10} strokeWidth={1.5} />
                  {formatSeconds(clip.durationSeconds)}
                </span>
              ) : null}
              <ClipStatusIndicator status={clip.status} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  isExpanded,
  onToggle,
}: {
  task: StudioTask
  isExpanded: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div className='border-b border-primary-200 dark:border-neutral-800 last:border-b-0'>
      <button
        type='button'
        onClick={function handleToggle() {
          onToggle(task.id)
        }}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
          'hover:bg-primary-50/80 dark:hover:bg-neutral-800/50',
          isExpanded && 'bg-primary-50/60 dark:bg-neutral-800/30',
        )}
        aria-expanded={isExpanded}
      >
        {/* Title */}
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium text-primary-900 dark:text-neutral-100'>
            {task.title}
          </p>
          {task.sourceUrl ? (
            <p className='mt-0.5 truncate font-mono text-[10px] text-primary-400 dark:text-neutral-500'>
              {task.sourceUrl}
            </p>
          ) : null}
        </div>

        {/* Status badge */}
        <TaskStatusBadge status={task.status} />

        {/* Clip count */}
        <span className='hidden shrink-0 tabular-nums text-xs text-primary-500 dark:text-neutral-400 sm:block'>
          {task.clipCount} {task.clipCount === 1 ? 'clip' : 'clips'}
        </span>

        {/* Created */}
        <span className='hidden shrink-0 tabular-nums text-xs text-primary-400 dark:text-neutral-500 md:block'>
          {formatRelativeTime(task.createdAt)}
        </span>

        {/* Duration indicator (progress for processing tasks) */}
        {task.status === 'processing' && task.progress !== null ? (
          <span className='hidden shrink-0 tabular-nums text-xs text-blue-500 dark:text-blue-400 lg:block'>
            {Math.round(task.progress)}%
          </span>
        ) : null}

        {/* Expand chevron */}
        <HugeiconsIcon
          icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
          size={14}
          strokeWidth={1.5}
          className='shrink-0 text-primary-400 dark:text-neutral-500'
        />
      </button>

      {isExpanded ? <ExpandedClipsPanel taskId={task.id} /> : null}
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className='flex items-center justify-center gap-3 pt-4'>
      <button
        type='button'
        onClick={onPrev}
        disabled={page <= 1}
        className={cn(
          'rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-xs text-primary-700 transition-colors dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300',
          'hover:bg-primary-50 dark:hover:bg-neutral-800',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        Prev
      </button>

      <span className='text-xs tabular-nums text-primary-500 dark:text-neutral-400'>
        Page {page} of {totalPages}
      </span>

      <button
        type='button'
        onClick={onNext}
        disabled={page >= totalPages}
        className={cn(
          'rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-xs text-primary-700 transition-colors dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300',
          'hover:bg-primary-50 dark:hover:bg-neutral-800',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        Next
      </button>
    </div>
  )
}

// ── Header Stats Badge ────────────────────────────────────────────────────────

function StatsBadge() {
  const { data: overview, isLoading } = useStudioStatsOverview()

  if (isLoading) {
    return (
      <span className='inline-flex h-5 w-24 animate-pulse rounded-full bg-primary-200 dark:bg-neutral-800' />
    )
  }

  if (!overview) return null

  return (
    <span className='inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-100/80 px-2.5 py-0.5 text-xs dark:border-neutral-800 dark:bg-neutral-900'>
      <span className='tabular-nums text-primary-700 dark:text-neutral-300'>
        {overview.totalClips} clips
      </span>
      {overview.averageProcessingTimeSeconds !== null ? (
        <>
          <span className='text-primary-300 dark:text-neutral-600'>·</span>
          <span className='tabular-nums text-primary-500 dark:text-neutral-400'>
            avg {formatSeconds(overview.averageProcessingTimeSeconds)}
          </span>
        </>
      ) : null}
    </span>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function StudioTasksScreen() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const { data, isLoading, isFetching, error } = useStudioTasks({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    pageSize: PAGE_SIZE,
  })

  const tasks = data?.tasks ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleFilterChange(next: StatusFilter) {
    setStatusFilter(next)
    setPage(1)
    setExpandedTaskId(null)
  }

  function handleToggleExpand(taskId: string) {
    setExpandedTaskId(function computeNext(current) {
      return current === taskId ? null : taskId
    })
  }

  function handlePrev() {
    setPage(function computePrev(p) {
      return Math.max(1, p - 1)
    })
    setExpandedTaskId(null)
  }

  function handleNext() {
    setPage(function computeNext(p) {
      return Math.min(totalPages, p + 1)
    })
    setExpandedTaskId(null)
  }

  return (
    <main className='min-h-full bg-surface px-4 pt-5 pb-24 text-primary-900 dark:text-neutral-100 md:px-6 md:pt-8'>
      <div className='mx-auto w-full max-w-[1200px]'>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className='mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60'>
          <div className='flex items-center gap-2.5'>
            <HugeiconsIcon
              icon={Video01Icon}
              size={20}
              strokeWidth={1.5}
              className='shrink-0 text-blue-500'
            />
            <div>
              <h1 className='text-base font-semibold text-primary-900 dark:text-neutral-100'>
                Studio Tasks
              </h1>
              <p className='text-xs text-primary-500 dark:text-neutral-400'>
                MGT Studio clip-processing pipeline
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            {isFetching && !isLoading ? (
              <span className='text-xs text-primary-400 dark:text-neutral-500'>
                Refreshing…
              </span>
            ) : null}
            <StatsBadge />
          </div>
        </header>

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <div className='mb-4 flex flex-wrap items-center gap-1.5'>
          <HugeiconsIcon
            icon={FilterHorizontalIcon}
            size={14}
            strokeWidth={1.5}
            className='text-primary-400 dark:text-neutral-500'
          />
          {STATUS_FILTERS.map(function renderFilter(option) {
            const active = statusFilter === option.id
            return (
              <button
                key={option.id}
                type='button'
                onClick={function onClickFilter() {
                  handleFilterChange(option.id)
                }}
                aria-pressed={active}
                className={cn(
                  'rounded-lg border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-accent-500 bg-accent-500 text-white'
                    : 'border-primary-200 bg-white text-primary-600 hover:bg-primary-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800',
                )}
              >
                {option.label}
              </button>
            )
          })}

          {total > 0 ? (
            <span className='ml-2 text-[11px] tabular-nums text-primary-400 dark:text-neutral-500'>
              {total} {total === 1 ? 'task' : 'tasks'}
            </span>
          ) : null}
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <section className='overflow-hidden rounded-xl border border-primary-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'>
            <div className='hidden grid-cols-[minmax(0,1fr)_100px_80px_120px_40px] items-center gap-4 border-b border-primary-200 px-4 py-2.5 dark:border-neutral-800 sm:grid'>
              <span className='text-[11px] uppercase tracking-wider text-primary-400 dark:text-neutral-500'>Task</span>
              <span className='text-[11px] uppercase tracking-wider text-primary-400 dark:text-neutral-500'>Status</span>
              <span className='text-[11px] uppercase tracking-wider text-primary-400 dark:text-neutral-500'>Clips</span>
              <span className='text-[11px] uppercase tracking-wider text-primary-400 dark:text-neutral-500'>Created</span>
              <span />
            </div>
            {[0, 1, 2, 3, 4].map(function renderSkeleton(i) {
              return <TaskRowSkeleton key={i} />
            })}
          </section>
        ) : error ? (
          <section className='rounded-xl border border-red-900/60 bg-red-950/30 p-6'>
            <p className='text-sm text-red-300'>
              {error instanceof Error ? error.message : 'Failed to load tasks'}
            </p>
          </section>
        ) : tasks.length === 0 ? (
          <section className='rounded-xl border border-dashed border-primary-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'>
            <EmptyState
              icon={Video01Icon}
              title='No tasks found'
              description={
                statusFilter === 'all'
                  ? 'Studio tasks will appear here once the pipeline processes your first clip.'
                  : `No ${statusFilter} tasks right now.`
              }
            />
          </section>
        ) : (
          <section className='overflow-hidden rounded-xl border border-primary-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'>
            {/* Table header — desktop only */}
            <div className='hidden grid-cols-[minmax(0,1fr)_100px_80px_120px_40px] items-center gap-4 border-b border-primary-200 px-4 py-2.5 dark:border-neutral-800 sm:grid'>
              <span className='text-[11px] uppercase tracking-wider text-primary-400 dark:text-neutral-500'>
                Task
              </span>
              <span className='text-[11px] uppercase tracking-wider text-primary-400 dark:text-neutral-500'>
                Status
              </span>
              <span className='text-[11px] uppercase tracking-wider text-primary-400 dark:text-neutral-500'>
                Clips
              </span>
              <span className='text-[11px] uppercase tracking-wider text-primary-400 dark:text-neutral-500'>
                Created
              </span>
              <span />
            </div>

            {/* Rows */}
            <div>
              {tasks.map(function renderRow(task) {
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isExpanded={expandedTaskId === task.id}
                    onToggle={handleToggleExpand}
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* ── Pagination ──────────────────────────────────────────────── */}
        {!isLoading && !error ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        ) : null}

      </div>
    </main>
  )
}
