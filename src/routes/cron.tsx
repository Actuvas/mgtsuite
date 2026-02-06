import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { CronManagerScreen } from '@/screens/cron/cron-manager-screen'

export const Route = createFileRoute('/cron')({
  component: function CronRoute() {
    usePageTitle('Cron Manager')
    return <CronManagerScreen />
  },
})
