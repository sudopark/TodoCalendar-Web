import TopToolbar from '../components/TopToolbar'
import LeftSidebar from '../components/LeftSidebar'
import MainCalendar from '../calendar/MainCalendar'
import { RightEventPanel } from '../components/RightEventPanel'
import { EventFormPopover } from '../components/eventForm/EventFormPopover'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useUiStore } from '../stores/uiStore'

export function MainPage() {
  useKeyboardShortcuts()
  const rightPanelOpen = useUiStore(s => s.rightPanelOpen)

  return (
    <div className="h-screen bg-slate-50">
      <div className="flex h-full flex-col overflow-hidden">
        <TopToolbar />
        <div className="flex flex-1 min-h-0 relative">
          <LeftSidebar />
          <MainCalendar />

          {/* 오버레이: 중앙 캘린더를 덮는 패널 */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-[408px] z-10 transition-transform duration-300 ease-in-out ${
              rightPanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <RightEventPanel />
          </div>
        </div>
      </div>
      <EventFormPopover />
    </div>
  )
}
