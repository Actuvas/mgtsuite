import { useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Chat01Icon,
  GridIcon,
  Home01Icon,
  PuzzleIcon,
  Settings01Icon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

/** Height constant for consistent bottom insets on non-chat routes */
export const MOBILE_TAB_BAR_OFFSET = '3.75rem'

type TabItem = {
  id: string
  label: string
  icon: typeof Chat01Icon
  to: string
  match: (path: string) => boolean
}

const TABS: TabItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home01Icon,
    to: '/dashboard',
    match: (p) => p.startsWith('/dashboard'),
  },
  {
    id: 'agents',
    label: 'Agent Hub',
    icon: UserMultipleIcon,
    to: '/agent-swarm',
    match: (p) => p.startsWith('/agent-swarm') || p.startsWith('/agents'),
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: Chat01Icon,
    to: '/chat/main',
    match: (p) => p.startsWith('/chat') || p === '/new' || p === '/',
  },
  {
    id: 'skills',
    label: 'Skills',
    icon: PuzzleIcon,
    to: '/skills',
    match: (p) => p.startsWith('/skills'),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings01Icon,
    to: '/settings',
    match: (p) => p.startsWith('/settings'),
  },
]

function isOnChatRoute(pathname: string): boolean {
  return pathname.startsWith('/chat') || pathname === '/new' || pathname === '/'
}

/**
 * Full tab bar — renders on non-chat routes.
 */
function FullTabBar() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[60] pb-[env(safe-area-inset-bottom)] md:hidden transform-gpu"
      aria-label="Mobile navigation"
      style={{ WebkitTransform: 'translateZ(0)' }}
    >
      <div className="mx-2 mb-1 grid grid-cols-5 gap-1 rounded-2xl border border-primary-200/60 bg-white/95 px-1 py-1.5 shadow-[0_2px_20px_rgba(0,0,0,0.08)] dark:bg-gray-900/95">
        {TABS.map((tab) => {
          const isActive = tab.match(pathname)
          const isCenterChat = tab.id === 'chat'
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate({ to: tab.to })}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-medium transition-transform duration-150 active:scale-90',
                isCenterChat ? '-translate-y-1' : '',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center rounded-full transition-all duration-150',
                  isCenterChat
                    ? cn(
                        'size-9 bg-accent-500 text-white shadow-sm',
                        isActive && 'ring-1 ring-accent-200/40 shadow-sm',
                      )
                    : isActive
                      ? 'size-7 bg-accent-500/15 text-accent-600'
                      : 'size-7 text-primary-400',
                )}
              >
                <HugeiconsIcon
                  icon={tab.icon}
                  size={isCenterChat ? 20 : 17}
                  strokeWidth={isCenterChat ? 1.8 : isActive ? 2 : 1.6}
                />
              </span>
              <span
                className={cn(
                  'leading-tight',
                  isActive ? 'text-accent-600' : 'text-primary-400',
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * Chat nav pill — small floating button to open full nav overlay from chat.
 */
function ChatNavPill({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] left-3 z-[55] flex size-10 items-center justify-center rounded-full border border-primary-200/60 bg-white/90 shadow-md active:scale-90 transition-transform md:hidden dark:bg-gray-900/90 dark:border-gray-700/60"
      aria-label="Open navigation"
    >
      <HugeiconsIcon icon={GridIcon} size={18} strokeWidth={1.6} className="text-primary-500" />
    </button>
  )
}

/**
 * Chat nav overlay — full tab bar shown temporarily over chat.
 */
function ChatNavOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="fixed inset-0 z-[70] md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 animate-in fade-in duration-150"
        onClick={onClose}
        aria-label="Close navigation"
      />
      <nav
        className="absolute inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-4 duration-200"
        aria-label="Mobile navigation"
      >
        <div className="mx-2 mb-1 grid grid-cols-5 gap-1 rounded-2xl border border-primary-200/60 bg-white/95 px-1 py-1.5 shadow-[0_2px_20px_rgba(0,0,0,0.08)] dark:bg-gray-900/95">
          {TABS.map((tab) => {
            const isActive = tab.match(pathname)
            const isCenterChat = tab.id === 'chat'
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onClose()
                  navigate({ to: tab.to })
                }}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-medium transition-transform duration-150 active:scale-90',
                  isCenterChat ? '-translate-y-1' : '',
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full transition-all duration-150',
                    isCenterChat
                      ? cn(
                          'size-9 bg-accent-500 text-white shadow-sm',
                          isActive && 'ring-1 ring-accent-200/40 shadow-sm',
                        )
                      : isActive
                        ? 'size-7 bg-accent-500/15 text-accent-600'
                        : 'size-7 text-primary-400',
                  )}
                >
                  <HugeiconsIcon
                    icon={tab.icon}
                    size={isCenterChat ? 20 : 17}
                    strokeWidth={isCenterChat ? 1.8 : isActive ? 2 : 1.6}
                  />
                </span>
                <span
                  className={cn(
                    'leading-tight',
                    isActive ? 'text-accent-600' : 'text-primary-400',
                  )}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [chatNavOpen, setChatNavOpen] = useState(false)
  const onChat = isOnChatRoute(pathname)

  // On chat routes: show small pill + overlay on demand
  if (onChat) {
    return (
      <>
        {!chatNavOpen && <ChatNavPill onOpen={() => setChatNavOpen(true)} />}
        {chatNavOpen && <ChatNavOverlay onClose={() => setChatNavOpen(false)} />}
      </>
    )
  }

  // On all other routes: show full tab bar
  return <FullTabBar />
}
