import { useMemo, useEffect } from 'react'
import { buildCalendarGrid } from './calendarUtils'
import MiniCalendarGrid from './MiniCalendarGrid'
import { useUiStore } from '../stores/uiStore'
import { useHolidayStore } from '../stores/holidayStore'

export default function MiniCalendar() {
  const currentMonth = useUiStore(s => s.currentMonth)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)

  const today = useMemo(() => new Date(), [])
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const days = useMemo(
    () => buildCalendarGrid(year, month, today),
    [year, month, today]
  )

  useEffect(() => {
    const years = new Set(days.map(d => d.date.getFullYear()))
    years.forEach(y => fetchHolidays(y))
  }, [days, fetchHolidays])

  return (
    <div className="p-2">
      <MiniCalendarGrid days={days} />
    </div>
  )
}
