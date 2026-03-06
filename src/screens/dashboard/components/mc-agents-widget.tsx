import { UserGroupIcon } from '@hugeicons/core-free-icons'
import { WidgetShell } from './widget-shell'
import { useMCAgents } from '@/hooks/use-mission-control'
import type { MCAgent, MCAgentStatus } from '@/lib/mc-api'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type MCAgentsWidgetProps = {
  onRemove?: () => void
}

// ── Status helpers ────────────────────────────────────────────────────────────

/** Returns the dot colour class for each agent status. */
function dotClass(status: MCAgentStatus): string {
  switch (status) {
    case 'active':
      return 'bg-blue-500 animate-pulse'
    case 'idle':
      return 'bg-emerald-500'
    case 'paused':
      return 'bg-amber-400'
    case 'error':
      return 'bg-red-500'
    case 'offline':
      return 'bg-neutral-500'
  }
}

/** Returns the badge label for each agent status. */
function statusLabel(status: MCAgentStatus): string {
  switch (status) {
    case 'active':
      return 'BUSY'
    case 'idle':
      return 'IDLE'
    case 'paused':
      return 'WAIT'
    case 'error':
      return 'ERR'
    case 'offline':
      return 'OFF'
  }
}

/** Returns the badge colour classes for each agent status. */
function badgeClass(status: MCAgentStatus): string {
  switch (status) {
    case 'active':
      return 'border-blue-900 bg-blue-950/60 text-blue-400'
    case 'idle':
      return 'border-emerald-900 bg-emerald-950/60 text-emerald-400'
    case 'paused':
      return 'border-amber-900 bg-amber-950/60 text-amber-400'
    case 'error':
      return 'border-red-900 bg-red-950/60 text-red-400'
    case 'offline':
      return 'border-neutral-700 bg-neutral-900/60 text-neutral-500'
  }
}

/** True when the agent status counts as "online" for the header counter. */
function isOnline(status: MCAgentStatus): boolean {
  return status === 'active' || status === 'idle' || status === 'paused'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AgentStatusBadge({ status }: { status: MCAgentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        badgeClass(status),
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

function AgentRow({ agent }: { agent: MCAgent }) {
  /** An agent with an active task assignment gets a small bolt indicator. */
  const hasActiveTask = agent.currentTaskId !== null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary-200 dark:border-neutral-800 bg-primary-50 dark:bg-neutral-950 px-2.5 py-1.5">
      <span
        className={cn('size-2 shrink-0 rounded-full', dotClass(agent.status))}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate text-xs font-medium text-primary-900 dark:text-neutral-100">
            {agent.name}
          </p>
          {hasActiveTask ? (
            <span
              aria-label="Has active task"
              title="Has active task"
              className="shrink-0 text-[9px] leading-none text-amber-400"
            >
              &#9733;
            </span>
          ) : null}
        </div>
        {agent.model != null ? (
          <p className="truncate font-mono text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400">
            {agent.model}
          </p>
        ) : null}
      </div>
      <AgentStatusBadge status={agent.status} />
    </div>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function MCAgentsWidget({ onRemove }: MCAgentsWidgetProps) {
  const { data, isLoading, error } = useMCAgents({ live: true })

  const agents = data?.agents ?? []
  const totalCount = data?.total ?? 0
  const onlineCount = agents.filter((a) => isOnline(a.status)).length

  const errorMessage =
    error instanceof Error
      ? `MC unreachable: ${error.message}`
      : error != null
        ? 'Mission Control is unreachable'
        : undefined

  return (
    <WidgetShell
      size="medium"
      title="Mission Control"
      icon={UserGroupIcon}
      onRemove={onRemove}
      loading={isLoading}
      error={errorMessage}
      action={
        !isLoading && !errorMessage ? (
          <span className="inline-flex items-center rounded-full border border-primary-200 dark:border-neutral-800 bg-primary-50 dark:bg-neutral-950 px-2 py-0.5 font-mono text-[11px] tabular-nums text-primary-800 dark:text-neutral-200">
            {onlineCount}/{totalCount} online
          </span>
        ) : undefined
      }
      className="h-full rounded-xl border border-neutral-200 dark:border-neutral-700 border-l-4 border-l-blue-500 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-[0_6px_20px_rgba(0,0,0,0.25)] [&_svg]:text-blue-500"
    >
      {agents.length === 0 ? (
        <div className="flex h-full items-center justify-center px-2 py-4 text-center">
          <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            No agents registered
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </WidgetShell>
  )
}
