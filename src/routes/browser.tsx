import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { BrowserPanel } from '@/components/browser-view/BrowserPanel'

export const Route = createFileRoute('/browser')({
  component: BrowserRoute,
})

function BrowserRoute() {
  usePageTitle('Browser')
  return <BrowserPanel />
}
