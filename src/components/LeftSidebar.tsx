import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ko } from 'date-fns/locale'
import { useUiStore } from '../stores/uiStore'
import { useHolidayStore } from '../stores/holidayStore'
import { Calendar } from '@/components/ui/calendar'
import { formatDateKey } from '../utils/eventTimeUtils'
import CalendarList from './CalendarList'
import { Separator } from '@/components/ui/separator'

export default function LeftSidebar() {
  const navigate = useNavigate()
  const sidebarOpen = useUiStore(s => s.sidebarOpen)
  const selectedDate = useUiStore(s => s.selectedDate)
  const setSelectedDate = useUiStore(s => s.setSelectedDate)
  const currentMonth = useUiStore(s => s.currentMonth)
  const setCurrentMonth = useUiStore(s => s.setCurrentMonth)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)
  const getHolidayNames = useHolidayStore(s => s.getHolidayNames)

  useEffect(() => {
    const year = currentMonth.getFullYear()
    fetchHolidays(year)
    // Also fetch adjacent years if near boundaries
    const month = currentMonth.getMonth()
    if (month === 0) fetchHolidays(year - 1)
    if (month === 11) fetchHolidays(year + 1)
  }, [currentMonth, fetchHolidays])

  const isSunday = (date: Date) => date.getDay() === 0
  const isHoliday = (date: Date) => getHolidayNames(formatDateKey(date)).length > 0

  return (
    <div
      className={`hidden md:flex flex-col transition-all duration-200 bg-slate-50 border-r border-border-light overflow-hidden shrink-0 ${
        sidebarOpen ? 'w-64' : 'w-0'
      }`}
    >
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="px-1 pt-4">
          <Calendar
            mode="single"
            locale={ko}
            selected={selectedDate ?? undefined}
            onSelect={(date) => date && setSelectedDate(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={{
              sunday: (date) => isSunday(date),
              holiday: (date) => isHoliday(date),
            }}
            modifiersClassNames={{
              sunday: 'text-red-500',
              holiday: 'text-red-500',
            }}
            className="w-full"
          />
        </div>
        <div className="px-3 pt-6 flex-1">
          <CalendarList />
        </div>
      </div>
      <div className="shrink-0">
        <Separator />
        <div className="px-4 py-3 flex flex-col gap-1">
          <button
            onClick={() => navigate('/done')}
            className="flex items-center gap-2 py-1.5 rounded text-sm text-text-secondary hover:text-text-primary hover:bg-gray-100 text-left"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
            </svg>
            Archive
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 py-1.5 rounded text-sm text-text-secondary hover:text-text-primary hover:bg-gray-100 text-left"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}
