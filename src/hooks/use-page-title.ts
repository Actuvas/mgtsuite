import { useEffect } from 'react'

const BASE_TITLE = 'MGT Suite'

/**
 * Sets document.title for the current page.
 * Usage: usePageTitle('Dashboard') → "Dashboard — MGT Suite"
 */
export function usePageTitle(page: string) {
  useEffect(() => {
    document.title = page ? `${page} — ${BASE_TITLE}` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [page])
}
