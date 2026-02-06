import { createFileRoute } from '@tanstack/react-router'
import { DashboardScreen } from '@/screens/dashboard/dashboard-screen'
import { usePageTitle } from '@/hooks/use-page-title'

export const Route = createFileRoute('/dashboard')({
  component: function DashboardRoute() {
    usePageTitle('Dashboard')
    return <DashboardScreen />
  },
})
