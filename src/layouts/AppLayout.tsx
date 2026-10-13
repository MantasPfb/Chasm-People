import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { AssistantPanel } from '@/components/assistant/AssistantPanel'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar />
        <main className="max-w-7xl mx-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
      <AssistantPanel />
    </div>
  )
}
