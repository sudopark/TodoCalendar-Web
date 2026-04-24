import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DayButton } from 'react-day-picker'
import { useUiStore } from '../stores/uiStore'
import { useHolidayStore } from '../stores/holidayStore'
import { useEventFormStore } from '../stores/eventFormStore'
import { Calendar } from '@/components/ui/calendar'
import CalendarList from './CalendarList'
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

  // 선택된 날: text-primary 톤 배경(soft slate) + 흰색 텍스트
  // 오늘(미선택): surface-sunken 배경
  // 이전/다음 달: tertiary gray
  // 일/공휴일(미선택): danger-soft (탁한 red)
  // 일반: text-primary
  const bgStyle = isSelected
    ? 'bg-text-primary rounded-full'
    : isToday
      ? 'bg-surface-sunken rounded-full'
      : 'hover:bg-surface-sunken hover:rounded-full'

  const textColor = isSelected
    ? 'text-white font-semibold'
    : isOutside
      ? 'text-text-tertiary'
      : isSunday || isHoliday
        ? 'text-danger-soft'
        : 'text-text-primary'

  return (
    <button
      {...props}
      className={cn(
        'flex h-7 w-7 items-center justify-center text-[12px] mx-auto cursor-pointer bg-transparent border-0 p-0 transition-colors',
        bgStyle,
        textColor,
        className
      )}
    />
  )
}

export default function LeftSidebar() {
  const { t } = useTranslation()
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const openForm = useEventFormStore(s => s.openForm)
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
          {/* 이벤트 추가 버튼 + 타입 선택 드롭다운 */}
          <div className="relative">
            <button
              ref={createButtonRef}
              data-testid="sidebar-create-event"
              aria-haspopup="menu"
              aria-expanded={showCreateMenu}
              className="flex w-full items-center justify-between rounded-full bg-white border border-border-light px-4 py-2.5 shadow-sm hover:shadow transition-shadow"
              onClick={() => setShowCreateMenu(!showCreateMenu)}
            >
              <span className="flex items-center gap-2 text-text-primary">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium">{t('main.create_event', 'Create')}</span>
              </span>
              <svg
                className={cn('h-3.5 w-3.5 text-text-tertiary transition-transform', showCreateMenu && 'rotate-180')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCreateMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
                <div
                  role="menu"
                  className="absolute top-full left-0 mt-1.5 z-50 w-full overflow-hidden rounded-xl bg-white dark:bg-gray-800 border border-border-light shadow-lg"
                >
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-surface-sunken dark:hover:bg-gray-700 transition-colors"
                    onClick={() => {
                      setShowCreateMenu(false)
                      const rect = createButtonRef.current?.getBoundingClientRect() ?? null
                      openForm(rect, 'todo')
                    }}
                  >
                    <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Todo
                  </button>
                  <div className="border-t border-border-light dark:border-gray-700" />
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-surface-sunken dark:hover:bg-gray-700 transition-colors"
                    onClick={() => {
                      setShowCreateMenu(false)
                      const rect = createButtonRef.current?.getBoundingClientRect() ?? null
                      openForm(rect, 'schedule')
                    }}
                  >
                    <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Schedule
                  </button>
                </div>
              </>
            )}
          </div>
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
                  button_previous: 'rounded p-0.5 hover:bg-surface-sunken text-text-secondary h-7 w-7 flex items-center justify-center transition-colors',
                  button_next: 'rounded p-0.5 hover:bg-surface-sunken text-text-secondary h-7 w-7 flex items-center justify-center transition-colors',
                  weekdays: 'flex',
                  weekday: 'flex-1 text-center text-[10px] font-normal uppercase tracking-wide text-text-tertiary py-1',
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
    </div>
  )
}
