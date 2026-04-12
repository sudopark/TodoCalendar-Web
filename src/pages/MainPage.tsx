import TopToolbar from '../components/TopToolbar'
import LeftSidebar from '../components/LeftSidebar'
import MainCalendar from '../calendar/MainCalendar'
import { RightEventPanel } from '../components/RightEventPanel'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useUiStore } from '../stores/uiStore'

export function MainPage() {
  useKeyboardShortcuts()
  const rightPanelOpen = useUiStore(s => s.rightPanelOpen)

  return (
    <div className="h-screen bg-slate-50">
      <div className="flex h-full flex-col overflow-hidden">
        <TopToolbar />
        <div className="flex flex-1 min-h-0">
          <LeftSidebar />
          <MainCalendar />
          <div
            className={`shrink-0 overflow-hidden transition-all duration-200 ${
              rightPanelOpen ? 'w-80' : 'w-0'
            }`}
          >
            <RightEventPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
