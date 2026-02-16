import { useCallback, useRef } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import type { TouchEvent } from 'react'

const TAB_ORDER = [
  'dashboard',
  'agentHub',
  'chat',
  'skills',
  'settings',
] as const

type TouchStart = {
  x: number
  y: number
  at: number
}

function findCurrentTabIndex(pathname: string): number {
  if (pathname.startsWith('/dashboard')) return 0
  if (pathname.startsWith('/agent-swarm') || pathname.startsWith('/agents')) {
    return 1
  }
  if (pathname.startsWith('/chat') || pathname === '/new' || pathname === '/') {
    return 2
  }
  if (pathname.startsWith('/skills')) return 3
  if (pathname.startsWith('/settings')) return 4
  return -1
}

function shouldIgnoreSwipeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest('input, textarea, button, select, pre, code, .no-swipe'),
  )
}

export function useSwipeNavigation() {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const touchStartRef = useRef<TouchStart | null>(null)

  const onTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0]
    if (!touch || shouldIgnoreSwipeTarget(event.target)) {
      touchStartRef.current = null
      return
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      at: Date.now(),
    }
  }, [])

  const onTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const start = touchStartRef.current
      touchStartRef.current = null
      if (!start) return

      const touch = event.changedTouches[0]
      if (!touch) return

      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const dt = Date.now() - start.at

      if (Math.abs(dx) <= 60 || Math.abs(dy) >= 30 || dt >= 500) return

      const currentIndex = findCurrentTabIndex(pathname)
      if (currentIndex === -1) return

      const nextIndex =
        dx < 0
          ? Math.min(currentIndex + 1, TAB_ORDER.length - 1)
          : Math.max(currentIndex - 1, 0)

      if (nextIndex === currentIndex) return

      const nextTab = TAB_ORDER[nextIndex]
      if (nextTab === 'dashboard') {
        void navigate({ to: '/dashboard' })
        return
      }
      if (nextTab === 'agentHub') {
        void navigate({ to: '/agent-swarm' })
        return
      }
      if (nextTab === 'chat') {
        void navigate({ to: '/chat/$sessionKey', params: { sessionKey: 'main' } })
        return
      }
      if (nextTab === 'skills') {
        void navigate({ to: '/skills' })
        return
      }
      void navigate({ to: '/settings' })
    },
    [navigate, pathname],
  )

  return { onTouchStart, onTouchEnd }
}
