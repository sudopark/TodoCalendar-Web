import TopToolbar from '../components/TopToolbar'
import LeftSidebar from '../components/LeftSidebar'
import MainCalendar from '../calendar/MainCalendar'
import { RightEventPanel } from '../components/RightEventPanel'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

export function MainPage() {
  useKeyboardShortcuts()

  return (
    <div className="flex h-screen flex-col bg-surface">
      <TopToolbar />
      <div className="flex flex-1 min-h-0">
        <LeftSidebar />
        <MainCalendar />
        <RightEventPanel />
      </div>
    </div>
  )
}
