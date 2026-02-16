import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '@/stores/workspace-store'

/**
 * ChatGPT-style mobile keyboard handler.
 *
 * Strategy: `interactive-widget=resizes-visual` in viewport meta means
 * the layout viewport does NOT change when the keyboard opens. Instead,
 * `window.visualViewport.height` shrinks. We listen to that and set
 * a CSS custom property `--app-height` on <html> that tracks the actual
 * usable screen height. The app shell uses this instead of `h-dvh`.
 *
 * This is exactly how ChatGPT handles keyboard on iOS Safari:
 * - Visual viewport shrinks → app container shrinks → composer stays
 *   pinned to bottom → messages scroll area shrinks → everything stays
 *   in view without any scroll/overlap bugs.
 */
export function useMobileKeyboard() {
  const setMobileKeyboardOpen = useWorkspaceStore(
    (s) => s.setMobileKeyboardOpen,
  )
  const lastAppHeightRef = useRef<number | null>(null)
  const lastKeyboardOpenRef = useRef<boolean | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    const rootStyle = document.documentElement.style

    const applyAppHeight = (height: number) => {
      if (lastAppHeightRef.current === height) return
      lastAppHeightRef.current = height
      rootStyle.setProperty('--app-height', `${height}px`)
    }

    const applyKeyboardState = (open: boolean) => {
      if (lastKeyboardOpenRef.current === open) return
      lastKeyboardOpenRef.current = open
      setMobileKeyboardOpen(open)
    }

    if (!vv) {
      const updateFallback = () => {
        applyAppHeight(window.innerHeight)
      }

      // Fallback: track height, keyboard state handled by focus/blur.
      updateFallback()
      applyKeyboardState(false)
      window.addEventListener('resize', updateFallback)

      return () => {
        window.removeEventListener('resize', updateFallback)
      }
    }

    // Use hysteresis to avoid keyboard open/close flicker while iOS animates.
    const OPEN_THRESHOLD = 120
    const CLOSE_THRESHOLD = 80
    let frameId: number | null = null

    const update = () => {
      const height = Math.round(vv.height)
      applyAppHeight(height)

      const kbHeight = Math.max(0, window.innerHeight - height)
      const wasOpen = lastKeyboardOpenRef.current ?? false
      const isOpen = wasOpen
        ? kbHeight > CLOSE_THRESHOLD
        : kbHeight > OPEN_THRESHOLD
      applyKeyboardState(isOpen)
    }

    const scheduleUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        update()
      })
    }

    // Set initial value
    scheduleUpdate()

    vv.addEventListener('resize', scheduleUpdate)
    // iOS Safari sometimes needs scroll event too
    vv.addEventListener('scroll', scheduleUpdate)
    // Also handle orientation changes
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      vv.removeEventListener('resize', scheduleUpdate)
      vv.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [setMobileKeyboardOpen])
}
