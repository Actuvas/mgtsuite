import { useEffect } from 'react'
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

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) {
      // Fallback: just use innerHeight
      document.documentElement.style.setProperty(
        '--app-height',
        `${window.innerHeight}px`,
      )
      return
    }

    const KEYBOARD_THRESHOLD = 100

    function update() {
      if (!vv) return
      const height = vv.height
      document.documentElement.style.setProperty(
        '--app-height',
        `${height}px`,
      )

      const kbHeight = window.innerHeight - height
      const isOpen = kbHeight > KEYBOARD_THRESHOLD
      setMobileKeyboardOpen(isOpen)
    }

    // Set initial value
    update()

    vv.addEventListener('resize', update)
    // iOS Safari sometimes needs scroll event too
    vv.addEventListener('scroll', update)
    // Also handle orientation changes
    window.addEventListener('resize', update)

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [setMobileKeyboardOpen])
}
