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
    <div className="h-screen bg-slate-800 p-2">
      <div className="flex h-full flex-col rounded-2xl bg-surface overflow-hidden shadow-xl">
        <TopToolbar />
        <div className="flex flex-1 min-h-0 relative overflow-hidden">
          <LeftSidebar />
          <MainCalendar />

          {/* 드로워: absolute positioning으로 캘린더 위에 오버레이 */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-80 z-10 bg-surface shadow-xl transition-transform duration-300 ease-in-out ${
              rightPanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <RightEventPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
