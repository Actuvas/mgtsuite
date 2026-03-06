import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkSquare02Icon,
  CommandIcon,
  DashboardCircleIcon,
  KanbanIcon,
  Loading02Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { createMCTask } from '@/lib/mc-api'
import type {
  MCAgent,
  MCAgentStatus,
  MCBoard,
  MCTask,
  MCTaskPriority,
  MCTaskStatus,
  CreateMCTaskInput,
} from '@/lib/mc-api'
import { mcKeys, useMCAgents, useMCBoards, useMCTasks } from '@/hooks/use-mission-control'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'boards' | 'agents'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

// ── Status badge styles ───────────────────────────────────────────────────────

function taskStatusBadgeClass(status: MCTaskStatus): string {
  switch (status) {
    case 'in_progress':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
    case 'done':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
    case 'review':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
    case 'blocked':
      return 'bg-red-500/15 text-red-600 dark:text-red-400'
    case 'cancelled':
      return 'bg-neutral-200/80 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
    default:
      // pending
      return 'bg-neutral-200/80 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
  }
}

function taskStatusLabel(status: MCTaskStatus): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress'
    case 'done':
      return 'Done'
    case 'review':
      return 'Review'
    case 'blocked':
      return 'Blocked'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Pending'
  }
}

function priorityBadgeClass(priority: MCTaskPriority): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-500/15 text-red-600 dark:text-red-400'
    case 'high':
      return 'bg-orange-500/15 text-orange-700 dark:text-orange-400'
    case 'medium':
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
    default:
      return 'bg-neutral-200/60 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
  }
}

function agentStatusDotClass(status: MCAgentStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500'
    case 'idle':
      return 'bg-neutral-400'
    case 'paused':
      return 'bg-yellow-400'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-neutral-700'
  }
}

function agentStatusLabel(status: MCAgentStatus): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'idle':
      return 'Idle'
    case 'paused':
      return 'Paused'
    case 'error':
      return 'Error'
    default:
      return 'Offline'
  }
}

// ── New Task Modal ─────────────────────────────────────────────────────────────

type NewTaskModalProps = {
  boardId: string
  onClose: () => void
  onSuccess: () => void
}

const TASK_STATUS_OPTIONS: Array<{ value: MCTaskStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'cancelled', label: 'Cancelled' },
]

const TASK_PRIORITY_OPTIONS: Array<{ value: MCTaskPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

function NewTaskModal({ boardId, onClose, onSuccess }: NewTaskModalProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<MCTaskPriority>('medium')
  const [status, setStatus] = useState<MCTaskStatus>('pending')
  const [formError, setFormError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: function mutateCreateTask(input: CreateMCTaskInput) {
      return createMCTask(input)
    },
    onSuccess: async function onCreateSuccess() {
      await queryClient.invalidateQueries({ queryKey: mcKeys.tasks() })
      await queryClient.invalidateQueries({ queryKey: mcKeys.boards() })
      onSuccess()
    },
    onError: function onCreateError(error: unknown) {
      setFormError(
        error instanceof Error ? error.message : 'Failed to create task',
      )
    },
  })

  const handleSubmit = useCallback(
    function handleNewTaskSubmit(event: React.FormEvent) {
      event.preventDefault()
      const trimmedTitle = title.trim()
      if (!trimmedTitle) return
      setFormError(null)
      createMutation.mutate({
        boardId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        priority,
        status,
      })
    },
    [title, description, priority, status, boardId, createMutation],
  )

  const isPending = createMutation.isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={function stopProp(e) {
          e.stopPropagation()
        }}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-primary-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
      >
        <h2 className="mb-4 text-sm font-semibold text-primary-900 dark:text-neutral-100">
          New Mission Control Task
        </h2>

        {formError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {formError}
          </p>
        ) : null}

        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-primary-500 dark:text-neutral-400">
            Title *
          </span>
          <input
            type="text"
            value={title}
            onChange={function onTitleChange(e) {
              setTitle(e.target.value)
            }}
            className="w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-[13px] text-primary-900 outline-none focus:border-primary-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500"
            autoFocus
            placeholder="What needs to be done..."
            disabled={isPending}
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-primary-500 dark:text-neutral-400">
            Description
          </span>
          <textarea
            value={description}
            onChange={function onDescChange(e) {
              setDescription(e.target.value)
            }}
            rows={3}
            className="w-full resize-none rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-[13px] text-primary-900 outline-none focus:border-primary-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500"
            placeholder="Optional details..."
            disabled={isPending}
          />
        </label>

        <div className="mb-4 flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-primary-500 dark:text-neutral-400">
              Priority
            </span>
            <select
              value={priority}
              onChange={function onPriorityChange(e) {
                setPriority(e.target.value as MCTaskPriority)
              }}
              className="w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-[13px] text-primary-900 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              disabled={isPending}
            >
              {TASK_PRIORITY_OPTIONS.map(function renderPriorityOption(opt) {
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                )
              })}
            </select>
          </label>

          <label className="flex-1">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-primary-500 dark:text-neutral-400">
              Status
            </span>
            <select
              value={status}
              onChange={function onStatusChange(e) {
                setStatus(e.target.value as MCTaskStatus)
              }}
              className="w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-[13px] text-primary-900 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              disabled={isPending}
            >
              {TASK_STATUS_OPTIONS.map(function renderStatusOption(opt) {
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                )
              })}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-3 py-1.5 text-[13px] text-primary-500 transition-colors hover:text-primary-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-500/90 disabled:opacity-40"
          >
            {isPending ? (
              <HugeiconsIcon
                icon={Loading02Icon}
                size={13}
                strokeWidth={1.5}
                className="animate-spin"
              />
            ) : null}
            {isPending ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: MCTask }) {
  return (
    <article className="flex flex-wrap items-center gap-2 rounded-lg border border-primary-100 bg-primary-50/60 px-3 py-2 text-[12px] dark:border-neutral-800 dark:bg-neutral-900/40">
      <span className="min-w-0 flex-1 truncate font-medium text-primary-900 dark:text-neutral-100">
        {task.title}
      </span>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 font-medium capitalize tabular-nums',
            taskStatusBadgeClass(task.status),
          )}
        >
          {taskStatusLabel(task.status)}
        </span>

        <span
          className={cn(
            'rounded px-1.5 py-0.5 capitalize',
            priorityBadgeClass(task.priority),
          )}
        >
          {task.priority}
        </span>

        {task.assignedAgentId ? (
          <span className="inline-flex items-center gap-0.5 rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            <HugeiconsIcon icon={UserIcon} size={10} strokeWidth={1.5} />
            <span className="max-w-[80px] truncate">{task.assignedAgentId}</span>
          </span>
        ) : null}

        <span className="text-primary-400 tabular-nums dark:text-neutral-500">
          {formatShortDate(task.createdAt)}
        </span>
      </div>
    </article>
  )
}

// ── Board Tasks Panel ─────────────────────────────────────────────────────────

function BoardTasksPanel({
  boardId,
  boardName,
}: {
  boardId: string
  boardName: string
}) {
  const { data, isLoading, isError } = useMCTasks({ boardId })
  const [showNewTask, setShowNewTask] = useState(false)

  const tasks = data?.tasks ?? []

  return (
    <div className="mt-2 rounded-lg border border-primary-100 bg-primary-50/40 p-3 dark:border-neutral-800 dark:bg-neutral-900/30">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-primary-400 dark:text-neutral-500">
          {boardName} tasks
        </p>
        <button
          type="button"
          onClick={function openNewTask() {
            setShowNewTask(true)
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-600 transition-colors hover:border-primary-300 hover:text-primary-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-neutral-100"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.5} />
          New Task
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-3 text-[12px] text-primary-400 dark:text-neutral-500">
          <HugeiconsIcon
            icon={Loading02Icon}
            size={14}
            strokeWidth={1.5}
            className="animate-spin"
          />
          Loading tasks...
        </div>
      ) : isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Failed to load tasks
        </p>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-primary-200 py-6 text-center text-[12px] text-primary-400 dark:border-neutral-700 dark:text-neutral-500">
          No tasks yet — add one above
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(function renderTask(task) {
            return <TaskRow key={task.id} task={task} />
          })}
        </div>
      )}

      {showNewTask ? (
        <NewTaskModal
          boardId={boardId}
          onClose={function closeNewTask() {
            setShowNewTask(false)
          }}
          onSuccess={function onTaskCreated() {
            setShowNewTask(false)
          }}
        />
      ) : null}
    </div>
  )
}

// ── Board Card ────────────────────────────────────────────────────────────────

function BoardCard({ board }: { board: MCBoard }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <article className="overflow-hidden rounded-xl border border-primary-200 bg-primary-50/80 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
      <button
        type="button"
        onClick={function toggleExpanded() {
          setIsExpanded(function toggle(prev) {
            return !prev
          })
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-100/50 dark:hover:bg-neutral-800/50"
      >
        <HugeiconsIcon
          icon={KanbanIcon}
          size={18}
          strokeWidth={1.5}
          className="shrink-0 text-primary-400 dark:text-neutral-500"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-primary-900 dark:text-neutral-100">
            {board.name}
          </p>
          {board.description ? (
            <p className="mt-0.5 truncate text-[11px] text-primary-500 dark:text-neutral-400">
              {board.description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-primary-200 bg-primary-100/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {board.taskCount} tasks
          </span>
          <HugeiconsIcon
            icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
            size={14}
            strokeWidth={1.5}
            className="text-primary-400 dark:text-neutral-500"
          />
        </div>
      </button>

      {isExpanded ? (
        <div className="border-t border-primary-200 px-4 pb-4 pt-2 dark:border-neutral-800">
          <BoardTasksPanel boardId={board.id} boardName={board.name} />
        </div>
      ) : null}
    </article>
  )
}

// ── Boards Tab ────────────────────────────────────────────────────────────────

function BoardsTab() {
  const { data, isLoading, isError } = useMCBoards()
  const boards = data?.boards ?? []

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-primary-400 dark:text-neutral-500">
        <HugeiconsIcon
          icon={Loading02Icon}
          size={16}
          strokeWidth={1.5}
          className="animate-spin"
        />
        Loading boards...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Failed to load Mission Control boards. Is the backend running on port 8001?
      </div>
    )
  }

  if (boards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-primary-200 py-12 text-center dark:border-neutral-700">
        <HugeiconsIcon
          icon={KanbanIcon}
          size={32}
          strokeWidth={1}
          className="mx-auto mb-3 text-primary-300 dark:text-neutral-600"
        />
        <p className="text-sm font-medium text-primary-500 dark:text-neutral-400">
          No boards found
        </p>
        <p className="mt-1 text-[12px] text-primary-400 dark:text-neutral-500">
          Create boards in MGT Mission Control to see them here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {boards.map(function renderBoard(board) {
        return <BoardCard key={board.id} board={board} />
      })}
    </div>
  )
}

// ── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: MCAgent }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-primary-200 bg-primary-50/80 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 size-2.5 shrink-0 rounded-full',
            agentStatusDotClass(agent.status),
          )}
          title={agentStatusLabel(agent.status)}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-primary-900 dark:text-neutral-100">
            {agent.name}
          </p>
          {agent.description ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-primary-500 dark:text-neutral-400">
              {agent.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[11px] font-medium',
            agent.status === 'active'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : agent.status === 'error'
                ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                : agent.status === 'paused'
                  ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
                  : agent.status === 'offline'
                    ? 'bg-neutral-200/80 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                    : 'bg-neutral-200/60 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
          )}
        >
          {agentStatusLabel(agent.status)}
        </span>

        {agent.model ? (
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {agent.model}
          </span>
        ) : null}

        {agent.currentTaskId ? (
          <span className="inline-flex items-center gap-0.5 rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
            <HugeiconsIcon icon={CheckmarkSquare02Icon} size={10} strokeWidth={1.5} />
            Active task
          </span>
        ) : null}
      </div>

      {agent.lastSeenAt ? (
        <p className="text-[11px] text-primary-400 tabular-nums dark:text-neutral-500">
          Last seen {formatShortDate(agent.lastSeenAt)}
        </p>
      ) : null}
    </article>
  )
}

// ── Agents Tab ────────────────────────────────────────────────────────────────

function AgentsTab() {
  const { data, isLoading, isError } = useMCAgents({ live: true })
  const agents = data?.agents ?? []
  const total = data?.total ?? 0

  const onlineCount = agents.filter(function isOnline(agent) {
    return agent.status === 'active' || agent.status === 'idle'
  }).length

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-primary-400 dark:text-neutral-500">
        <HugeiconsIcon
          icon={Loading02Icon}
          size={16}
          strokeWidth={1.5}
          className="animate-spin"
        />
        Loading agents...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Failed to load Mission Control agents. Is the backend running on port 8001?
      </div>
    )
  }

  return (
    <div>
      {agents.length > 0 ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/60">
          <span
            className={cn(
              'size-2 rounded-full',
              onlineCount > 0 ? 'animate-pulse bg-emerald-500' : 'bg-neutral-400',
            )}
          />
          <p className="text-[13px] text-primary-700 dark:text-neutral-300">
            <span className="tabular-nums font-semibold">{onlineCount}</span>
            <span className="text-primary-400 dark:text-neutral-500">
              {' '}of{' '}
            </span>
            <span className="tabular-nums font-semibold">{total}</span>
            <span className="text-primary-500 dark:text-neutral-400">
              {' '}agents online
            </span>
          </p>
          <span className="ml-auto text-[11px] text-primary-400 dark:text-neutral-500">
            Polls every 15s
          </span>
        </div>
      ) : null}

      {agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary-200 py-12 text-center dark:border-neutral-700">
          <HugeiconsIcon
            icon={CommandIcon}
            size={32}
            strokeWidth={1}
            className="mx-auto mb-3 text-primary-300 dark:text-neutral-600"
          />
          <p className="text-sm font-medium text-primary-500 dark:text-neutral-400">
            No agents found
          </p>
          <p className="mt-1 text-[12px] text-primary-400 dark:text-neutral-500">
            Register agents in MGT Mission Control to see them here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map(function renderAgent(agent: MCAgent) {
            return <AgentCard key={agent.id} agent={agent} />
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

type TabOption = {
  id: Tab
  label: string
}

const TAB_OPTIONS: Array<TabOption> = [
  { id: 'boards', label: 'Boards' },
  { id: 'agents', label: 'Agents' },
]

// ── Main Screen ───────────────────────────────────────────────────────────────

export function MissionControlScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('boards')

  return (
    <main className="min-h-full bg-surface px-4 pt-5 pb-24 md:px-6 md:pt-8 text-primary-900 dark:text-neutral-100">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col">
        {/* Header */}
        <header className="mb-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
          <HugeiconsIcon
            icon={DashboardCircleIcon}
            size={20}
            strokeWidth={1.5}
            className="shrink-0 text-primary-500 dark:text-neutral-400"
          />
          <div>
            <h1 className="text-base font-semibold text-primary-900 dark:text-neutral-100">
              Mission Control
            </h1>
            <p className="text-xs text-primary-500 dark:text-neutral-400">
              MGT orchestration boards and agent status
            </p>
          </div>
        </header>

        {/* Tab Bar */}
        <div className="mb-4 inline-flex self-start rounded-lg border border-primary-200 bg-primary-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
          {TAB_OPTIONS.map(function renderTab(tab) {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={function selectTab() {
                  setActiveTab(tab.id)
                }}
                className={cn(
                  'rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors',
                  isActive
                    ? 'bg-primary-900 text-primary-50 dark:bg-neutral-100 dark:text-neutral-900'
                    : 'text-primary-500 hover:text-primary-900 dark:text-neutral-400 dark:hover:text-neutral-100',
                )}
                aria-pressed={isActive}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'boards' ? <BoardsTab /> : <AgentsTab />}
      </div>
    </main>
  )
}
