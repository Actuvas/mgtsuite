import { Video01Icon } from '@hugeicons/core-free-icons'
import { WidgetShell } from './widget-shell'
import { useStudioStatsOverview, useStudioTasks } from '@/hooks/use-studio'
import type { StudioTaskStatus } from '@/lib/studio-api'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type StudioClipsWidgetProps = {
  onRemove?: () => void
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

function StatCell({
  value,
  label,
  valueClassName,
}: {
  value: string
  label: string
  valueClassName?: string
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg border border-primary-200 dark:border-neutral-800 bg-primary-50 dark:bg-neutral-950 px-2 py-1.5">
      <span
        className={cn(
          'font-mono text-xs font-semibold tabular-nums text-neutral-100',
          valueClassName,
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
    </div>
  )
}

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

// ── Widget ────────────────────────────────────────────────────────────────────

export function StudioClipsWidget({ onRemove }: StudioClipsWidgetProps) {
  const overviewQuery = useStudioStatsOverview()
  const tasksQuery = useStudioTasks({ pageSize: 3 })

  const isLoading = overviewQuery.isLoading || tasksQuery.isLoading
  const errorMessage =
    overviewQuery.error instanceof Error
      ? overviewQuery.error.message
      : tasksQuery.error instanceof Error
        ? tasksQuery.error.message
        : overviewQuery.error || tasksQuery.error
          ? 'Studio unreachable'
          : undefined

  const overview = overviewQuery.data
  const recentTasks = tasksQuery.data?.tasks ?? []
  const totalClips = overview?.totalClips ?? 0

  return (
    <WidgetShell
      size="medium"
      title="Studio Clips"
      icon={Video01Icon}
      onRemove={onRemove}
      loading={isLoading}
      error={errorMessage}
      action={
        <span className="inline-flex items-center rounded-full border border-primary-200 dark:border-neutral-800 bg-primary-50 dark:bg-neutral-950 px-2 py-0.5 font-mono text-[11px] tabular-nums text-primary-800 dark:text-neutral-200">
          {totalClips} clips
        </span>
      }
      className="h-full rounded-xl border border-neutral-200 dark:border-neutral-700 border-l-4 border-l-blue-500 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-[0_6px_20px_rgba(0,0,0,0.25)] [&_svg]:text-blue-500"
    >
      <div className="flex flex-col gap-3">
        {/* Stats row */}
        <div className="flex items-stretch gap-1.5">
          <StatCell
            value={String(overview?.totalClips ?? '—')}
            label="Clips"
          />
          <StatCell
            value={String(overview?.completedTasks ?? '—')}
            label="Done"
            valueClassName="text-emerald-400"
          />
          <StatCell
            value={String(overview?.failedTasks ?? '—')}
            label="Failed"
            valueClassName={
              (overview?.failedTasks ?? 0) > 0 ? 'text-red-400' : undefined
            }
          />
          <StatCell
            value={formatSeconds(overview?.averageProcessingTimeSeconds ?? null)}
            label="Avg time"
          />
        </div>

        {/* Recent tasks */}
        <div className="space-y-1.5">
          {recentTasks.length === 0 ? (
            <div className="flex items-center justify-center py-3">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                No tasks yet
              </p>
            </div>
          ) : (
            recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-lg border border-primary-200 dark:border-neutral-800 bg-primary-50 dark:bg-neutral-950 px-2.5 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-primary-900 dark:text-neutral-100">
                    {task.title}
                  </p>
                  <p className="font-mono text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400">
                    {task.clipCount} {task.clipCount === 1 ? 'clip' : 'clips'}{' '}
                    &middot; {formatRelativeTime(task.createdAt)}
                  </p>
                </div>
                <TaskStatusBadge status={task.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </WidgetShell>
  )
}
