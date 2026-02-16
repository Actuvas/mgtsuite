import { memo, useCallback, useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Folder01Icon,
  Menu01Icon,
  ReloadIcon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { UsageMeter } from '@/components/usage-meter'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function formatSyncAge(updatedAt: number): string {
  if (updatedAt <= 0) return ''
  const seconds = Math.round((Date.now() - updatedAt) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  return `${minutes}m ago`
}

type ChatHeaderProps = {
  activeTitle: string
  wrapperRef?: React.Ref<HTMLDivElement>
  showSidebarButton?: boolean
  onOpenSidebar?: () => void
  showFileExplorerButton?: boolean
  fileExplorerCollapsed?: boolean
  onToggleFileExplorer?: () => void
  /** Timestamp (ms) of last successful history fetch */
  dataUpdatedAt?: number
  /** Callback to manually refresh history */
  onRefresh?: () => void
  mobileStatus?: 'connected' | 'connecting' | 'disconnected'
}

function ChatHeaderComponent({
  activeTitle,
  wrapperRef,
  showSidebarButton = false,
  onOpenSidebar,
  showFileExplorerButton = false,
  fileExplorerCollapsed = true,
  onToggleFileExplorer,
  dataUpdatedAt = 0,
  onRefresh,
  mobileStatus = 'connecting',
}: ChatHeaderProps) {
  const [syncLabel, setSyncLabel] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (dataUpdatedAt <= 0) return
    const update = () => setSyncLabel(formatSyncAge(dataUpdatedAt))
    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [dataUpdatedAt])

  const isStale = dataUpdatedAt > 0 && Date.now() - dataUpdatedAt > 15000
  const isCompactMobileHeader = showSidebarButton && !showFileExplorerButton

  const mobileStatusLabel =
    mobileStatus === 'connected'
      ? 'Online'
      : mobileStatus === 'disconnected'
        ? 'Offline'
        : 'Connecting'

  const handleRefresh = useCallback(() => {
    if (!onRefresh) return
    setIsRefreshing(true)
    onRefresh()
    setTimeout(() => setIsRefreshing(false), 600)
  }, [onRefresh])

  return (
    <div
      ref={wrapperRef}
      className="shrink-0 border-b border-primary-200 px-4 h-12 flex items-center bg-surface"
    >
      {showSidebarButton ? (
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onOpenSidebar}
          className="mr-2 h-11 w-11 text-primary-800 hover:bg-primary-100 md:h-8 md:w-8"
          aria-label="Open sidebar"
        >
          <HugeiconsIcon icon={Menu01Icon} size={20} strokeWidth={1.5} />
        </Button>
      ) : null}
      {showFileExplorerButton ? (
        <TooltipProvider>
          <TooltipRoot>
            <TooltipTrigger
              onClick={onToggleFileExplorer}
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="mr-2 text-primary-800 hover:bg-primary-100"
                  aria-label={
                    fileExplorerCollapsed ? 'Show files' : 'Hide files'
                  }
                >
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    size={20}
                    strokeWidth={1.5}
                  />
                </Button>
              }
            />
            <TooltipContent side="bottom">
              {fileExplorerCollapsed ? 'Show files' : 'Hide files'}
            </TooltipContent>
          </TooltipRoot>
        </TooltipProvider>
      ) : null}
      <div
        className={cn(
          'min-w-0 flex-1 text-sm font-medium text-balance',
          isCompactMobileHeader && 'truncate',
        )}
        suppressHydrationWarning
      >
        {activeTitle}
      </div>
      {isCompactMobileHeader ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums',
            mobileStatus === 'connected' &&
              'border-emerald-200 bg-emerald-100/70 text-emerald-700',
            mobileStatus === 'disconnected' &&
              'border-red-200 bg-red-100/70 text-red-700',
            mobileStatus === 'connecting' &&
              'border-amber-200 bg-amber-100/70 text-amber-700',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              mobileStatus === 'connected' && 'bg-emerald-500',
              mobileStatus === 'disconnected' && 'bg-red-500',
              mobileStatus === 'connecting' && 'bg-amber-500',
            )}
          />
          {mobileStatusLabel}
        </span>
      ) : (
        <>
          {syncLabel ? (
            <span
              className={cn(
                'mr-1 text-[11px] tabular-nums transition-colors',
                isStale ? 'text-amber-500' : 'text-primary-400',
              )}
              title={
                dataUpdatedAt > 0
                  ? `Last synced: ${new Date(dataUpdatedAt).toLocaleTimeString()}`
                  : undefined
              }
            >
              {isStale ? '⚠ ' : ''}
              {syncLabel}
            </span>
          ) : null}
          {onRefresh ? (
            <TooltipProvider>
              <TooltipRoot>
                <TooltipTrigger
                  onClick={handleRefresh}
                  render={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="mr-1 text-primary-500 hover:bg-primary-100 hover:text-primary-700"
                      aria-label="Refresh chat"
                    >
                      <HugeiconsIcon
                        icon={ReloadIcon}
                        size={20}
                        strokeWidth={1.5}
                        className={cn(isRefreshing && 'animate-spin')}
                      />
                    </Button>
                  }
                />
                <TooltipContent side="bottom">Sync messages</TooltipContent>
              </TooltipRoot>
            </TooltipProvider>
          ) : null}
          <UsageMeter />
        </>
      )}
    </div>
  )
}

const MemoizedChatHeader = memo(ChatHeaderComponent)

export { MemoizedChatHeader as ChatHeader }
