import { useUiStore } from '../stores/uiStore'
import MiniCalendar from '../calendar/MiniCalendar'
import CalendarList from './CalendarList'

export default function LeftSidebar() {
  const sidebarOpen = useUiStore(s => s.sidebarOpen)

  return (
    <div
      className={`hidden md:flex flex-col transition-all duration-200 border-r dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden ${
        sidebarOpen ? 'w-64' : 'w-0'
      }`}
    >
      <MiniCalendar />
      <div className="flex-1 overflow-y-auto">
        <CalendarList />
      </div>
    </div>
  )
}
