import { useMemo, useEffect } from 'react'
import { buildCalendarGrid, formatMonthTitle } from './calendarUtils'
import MiniCalendarGrid from './MiniCalendarGrid'
import { useUiStore } from '../stores/uiStore'
import { useHolidayStore } from '../stores/holidayStore'
import { Card, CardContent } from '@/components/ui/card'

export default function MiniCalendar() {
  const currentMonth = useUiStore(s => s.currentMonth)
  const goToPrevMonth = useUiStore(s => s.goToPrevMonth)
  const goToNextMonth = useUiStore(s => s.goToNextMonth)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)

  const today = useMemo(() => new Date(), [])
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const title = formatMonthTitle(year, month)

  const days = useMemo(
    () => buildCalendarGrid(year, month, today),
    [year, month, today]
  )

  useEffect(() => {
    const years = new Set(days.map(d => d.date.getFullYear()))
    years.forEach(y => fetchHolidays(y))
  }, [days, fetchHolidays])

  return (
    <Card className="border-border-calendar shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          <div className="flex items-center">
            <button
              onClick={goToPrevMonth}
              aria-label="Previous month"
              className="rounded p-0.5 hover:bg-gray-100 text-text-secondary"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextMonth}
              aria-label="Next month"
              className="rounded p-0.5 hover:bg-gray-100 text-text-secondary"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <MiniCalendarGrid days={days} />
      </CardContent>
    </Card>
  )
}
