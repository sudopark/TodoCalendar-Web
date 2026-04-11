import { useTranslation } from 'react-i18next'
import type { CalendarDay } from './calendarUtils'
import { formatDateKey } from '../utils/eventTimeUtils'
import { useUiStore } from '../stores/uiStore'
import { useHolidayStore } from '../stores/holidayStore'

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

interface MiniCalendarGridProps {
  days: CalendarDay[]
}

export default function MiniCalendarGrid({ days }: MiniCalendarGridProps) {
  const { t } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)
  const setSelectedDate = useUiStore(s => s.setSelectedDate)
  const getHolidayNames = useHolidayStore(s => s.getHolidayNames)

  return (
    <div className="grid grid-cols-7">
      {WEEKDAY_KEYS.map((key, i) => (
        <div
          key={key}
          className={`py-1 text-center text-[10px] font-medium uppercase ${i === 0 ? 'text-red-400' : 'text-text-secondary'}`}
        >
          {t(key, WEEKDAY_FALLBACKS[i])}
        </div>
      ))}

      {days.map((day, i) => {
        const isSelected = selectedDate && formatDateKey(selectedDate) === day.dateKey
        const isHoliday = getHolidayNames(day.dateKey).length > 0
        const isSunday = day.date.getDay() === 0

        const textColor = day.isToday
          ? 'font-semibold text-white'
          : !day.isCurrentMonth
            ? 'text-gray-400'
            : isHoliday || isSunday
              ? 'text-red-500'
              : 'text-gray-900'

        const bgClass = day.isToday ? 'bg-brand-dark rounded-full' : ''
        const ringClass = isSelected && !day.isToday ? 'ring-2 ring-brand-dark rounded-full' : ''

        return (
          <div
            key={i}
            className="flex items-center justify-center py-0.5 cursor-pointer"
            onClick={() => setSelectedDate(day.date)}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center text-[11px] ${textColor} ${bgClass} ${ringClass}`}
            >
              {day.dayOfMonth}
            </div>
          </div>
        )
      })}
    </div>
  )
}
