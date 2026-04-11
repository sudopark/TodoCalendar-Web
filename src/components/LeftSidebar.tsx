import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DayButton } from 'react-day-picker'
import { useUiStore } from '../stores/uiStore'
import { useHolidayStore } from '../stores/holidayStore'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import CalendarList from './CalendarList'
import { Separator } from '@/components/ui/separator'
import { formatDateKey } from '../utils/eventTimeUtils'
import { cn } from '@/lib/utils'

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

function MiniCalendarDayButton({
  day,
  modifiers,
  className,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const isSunday = day.date.getDay() === 0
  const getHolidayNames = useHolidayStore(s => s.getHolidayNames)
  const isHoliday = getHolidayNames(formatDateKey(day.date)).length > 0

  const isOutside = modifiers.outside
  const isToday = modifiers.today
  const isSelected = modifiers.selected && !isToday

  const textColor = isToday
    ? 'text-white font-semibold'
    : isOutside
      ? 'text-gray-400'
      : isSunday || isHoliday
        ? 'text-red-500'
        : 'text-gray-900'

  return (
    <button
      {...props}
      className={cn(
        'flex h-6 w-6 items-center justify-center text-[11px] mx-auto cursor-pointer bg-transparent border-0 p-0',
        textColor,
        isToday && 'bg-brand-dark rounded-full',
        isSelected && 'ring-2 ring-brand-dark rounded-full',
        className
      )}
    />
  )
}

export default function LeftSidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sidebarOpen = useUiStore(s => s.sidebarOpen)
  const currentMonth = useUiStore(s => s.currentMonth)
  const selectedDate = useUiStore(s => s.selectedDate)
  const setSelectedDate = useUiStore(s => s.setSelectedDate)
  const setCurrentMonth = useUiStore(s => s.setCurrentMonth)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)

  // 월 변경 시 해당 연도 공휴일 로드 (이전·다음 달 경계 연도 포함)
  useEffect(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const years = new Set([year])
    if (month === 0) years.add(year - 1)
    if (month === 11) years.add(year + 1)
    years.forEach(y => fetchHolidays(y))
  }, [currentMonth, fetchHolidays])

  const isSundayModifier = useMemo(() => (date: Date) => date.getDay() === 0, [])

  const formatWeekdayName = (date: Date) => {
    const dayIndex = date.getDay()
    return t(WEEKDAY_KEYS[dayIndex], WEEKDAY_FALLBACKS[dayIndex])
  }

  return (
    <div
      className={`hidden md:flex flex-col transition-all duration-200 bg-slate-50 border-r border-border-light overflow-hidden shrink-0 ${
        sidebarOpen ? 'w-64' : 'w-0'
      }`}
    >
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="px-3 pt-4">
          <Card className="border-border-calendar shadow-sm">
            <CardContent className="p-3">
              <Calendar
                mode="single"
                selected={selectedDate ?? undefined}
                onSelect={(date) => date && setSelectedDate(date)}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                formatters={{ formatWeekdayName }}
                modifiers={{ sunday: isSundayModifier }}
                classNames={{
                  root: 'w-full',
                  months: 'flex flex-col gap-0',
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
                  DayButton: MiniCalendarDayButton,
                }}
              />
            </CardContent>
          </Card>
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
