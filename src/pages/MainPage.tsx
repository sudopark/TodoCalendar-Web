import TopToolbar from '../components/TopToolbar'
import LeftSidebar from '../components/LeftSidebar'
import MainCalendar from '../calendar/MainCalendar'
import { RightEventPanel } from '../components/RightEventPanel'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

export function MainPage() {
  useKeyboardShortcuts()

  return (
    <div className="h-screen bg-slate-800 p-2">
      <div className="flex h-full flex-col rounded-2xl bg-surface overflow-hidden shadow-xl">
        <TopToolbar />
        <div className="flex flex-1 min-h-0">
          <LeftSidebar />
          <MainCalendar />
          <RightEventPanel />
        </div>
      </div>
    </div>
  )
}
