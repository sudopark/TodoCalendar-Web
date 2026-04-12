import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DayButton } from 'react-day-picker'
import { useUiStore } from '../stores/uiStore'
import { useHolidayStore } from '../stores/holidayStore'
import { Calendar } from '@/components/ui/calendar'
import CalendarList from './CalendarList'
import { Separator } from '@/components/ui/separator'
import { formatDateKey } from '../utils/eventTimeUtils'
import { cn } from '@/lib/utils'
import { SIDEBAR_WIDTH_CLASS } from '../constants/layout'

const WEEKDAY_KEYS = [
  'calendar.weekdays.sun',
  'calendar.weekdays.mon',
  'calendar.weekdays.tue',
  'calendar.weekdays.wed',
  'calendar.weekdays.thu',
  'calendar.weekdays.fri',
  'calendar.weekdays.sat',
] as const

const WEEKDAY_FALLBACKS = ['일', '월', '화', '수', '목', '금', '토']

const isSundayModifier = (date: Date) => date.getDay() === 0

interface MiniCalendarDayButtonProps extends React.ComponentProps<typeof DayButton> {
  getHolidayNames: (dateKey: string) => string[]
}

function MiniCalendarDayButton({
  day,
  modifiers,
  className,
  getHolidayNames,
  ...props
}: MiniCalendarDayButtonProps) {
  const isSunday = day.date.getDay() === 0
  const isHoliday = getHolidayNames(formatDateKey(day.date)).length > 0

  const isOutside = modifiers.outside
  const isToday = modifiers.today
  const isSelected = modifiers.selected

  // 선택된 날: 오늘이든 아니든 #303646 배경 + 흰색 텍스트
  // 오늘(미선택): #f4f4f4 배경 + #323232 텍스트
  // 이전/다음 달: 회색
  // 일/공휴일(미선택): 빨간색
  // 일반: #323232
  const bgStyle = isSelected
    ? 'bg-[#303646] rounded-full'
    : isToday
      ? 'bg-[#f4f4f4] rounded-full'
      : ''

  const textColor = isSelected
    ? 'text-white font-semibold'
    : isOutside
      ? 'text-gray-400'
      : isSunday || isHoliday
        ? 'text-red-500'
        : 'text-[#323232]'

  return (
    <button
      {...props}
      className={cn(
        'flex h-6 w-6 items-center justify-center text-[11px] mx-auto cursor-pointer bg-transparent border-0 p-0',
        bgStyle,
        textColor,
        className
      )}
    />
  )
}

export default function LeftSidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sidebarOpen = useUiStore(s => s.sidebarOpen)
  const sidebarMonth = useUiStore(s => s.sidebarMonth)
  const selectedDate = useUiStore(s => s.selectedDate)
  const setSelectedDate = useUiStore(s => s.setSelectedDate)
  const setSidebarMonth = useUiStore(s => s.setSidebarMonth)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)
  const getHolidayNames = useHolidayStore(s => s.getHolidayNames)

  // 월 변경 시 해당 연도 공휴일 로드 (이전·다음 달 경계 연도 포함)
  useEffect(() => {
    const year = sidebarMonth.getFullYear()
    const month = sidebarMonth.getMonth()
    const years = new Set([year])
    if (month === 0) years.add(year - 1)
    if (month === 11) years.add(year + 1)
    years.forEach(y => fetchHolidays(y))
  }, [sidebarMonth, fetchHolidays])

  const formatWeekdayName = (date: Date) => {
    const dayIndex = date.getDay()
    return t(WEEKDAY_KEYS[dayIndex], WEEKDAY_FALLBACKS[dayIndex])
  }

  return (
    <div
      className={cn(
        'hidden md:flex flex-col transition-all duration-200 bg-slate-50 overflow-hidden shrink-0',
        sidebarOpen ? SIDEBAR_WIDTH_CLASS : 'w-0'
      )}
    >
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="px-3 pt-4">
          <div>
            <div className="p-3">
              <Calendar
                className="!bg-transparent"
                mode="single"
                selected={selectedDate ?? undefined}
                onSelect={(date) => date && setSelectedDate(date)}
                month={sidebarMonth}
                onMonthChange={setSidebarMonth}
                formatters={{ formatWeekdayName }}
                modifiers={{ sunday: isSundayModifier }}
                classNames={{
                  root: 'w-full bg-transparent',
                  months: 'relative flex flex-col gap-0',
                  month: 'flex w-full flex-col gap-2',
                  month_caption: 'flex h-7 w-full items-center justify-center px-7',
                  caption_label: 'text-sm font-semibold text-text-primary select-none',
                  nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between',
                  button_previous: 'rounded p-0.5 hover:bg-gray-100 text-text-secondary h-7 w-7 flex items-center justify-center',
                  button_next: 'rounded p-0.5 hover:bg-gray-100 text-text-secondary h-7 w-7 flex items-center justify-center',
                  weekdays: 'flex',
                  weekday: 'flex-1 text-center text-[10px] font-medium uppercase text-text-secondary py-1',
                  week: 'mt-0.5 flex w-full',
                  day: 'flex-1 flex items-center justify-center py-0.5',
                  today: '',
                  selected: '',
                  outside: '',
                }}
                components={{
                  DayButton: (props) => <MiniCalendarDayButton {...props} getHolidayNames={getHolidayNames} />,
                }}
              />
            </div>
          </div>
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
