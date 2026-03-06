import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { MissionControlScreen } from '@/screens/mission-control/mission-control-screen'

export const Route = createFileRoute('/mission-control')({
  component: function MissionControlRoute() {
    usePageTitle('Mission Control')
    return <MissionControlScreen />
  },
  errorComponent: function MissionControlError({ error }) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-primary-50 dark:bg-neutral-900">
        <h2 className="text-xl font-semibold text-primary-900 dark:text-neutral-100 mb-3">
          Failed to Load Mission Control
        </h2>
        <p className="text-sm text-primary-600 dark:text-neutral-400 mb-4 max-w-md">
          {error instanceof Error
            ? error.message
            : 'An unexpected error occurred'}
        </p>
        <button
          onClick={function reloadPage() {
            window.location.reload()
          }}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-500/90 transition-colors"
        >
          Reload Page
        </button>
      </div>
    )
  },
  pendingComponent: function MissionControlPending() {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-r-transparent mb-3" />
          <p className="text-sm text-primary-500 dark:text-neutral-400">
            Loading Mission Control...
          </p>
        </div>
      </div>
    )
  },
})
