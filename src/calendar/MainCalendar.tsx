import { useMemo, useEffect } from 'react'
import { buildCalendarGrid } from './calendarUtils'
import MainCalendarGrid from './MainCalendarGrid'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import type { CalendarEvent } from '../utils/eventTimeUtils'

interface MainCalendarProps {
  today?: Date
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export default function MainCalendar({ today: todayProp, onEventClick }: MainCalendarProps) {
  const todayKey = todayProp
    ? `${todayProp.getFullYear()}-${todayProp.getMonth()}-${todayProp.getDate()}`
    : ''
  const today = useMemo(() => {
    if (!todayProp) return new Date()
    return new Date(todayProp.getFullYear(), todayProp.getMonth(), todayProp.getDate())
  }, [todayKey])

  const currentMonth = useUiStore(s => s.currentMonth)
  const fetchEventsForYear = useCalendarEventsStore(s => s.fetchEventsForYear)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = useMemo(() => buildCalendarGrid(year, month, today), [year, month, today])

  useEffect(() => {
    if (days.length === 0) return
    const years = new Set(days.map(d => d.date.getFullYear()))
    years.forEach(y => fetchEventsForYear(y))
    years.forEach(y => fetchHolidays(y))
  }, [days, fetchEventsForYear, fetchHolidays])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white px-2 pt-2 pb-4">
      <MainCalendarGrid days={days} onEventClick={onEventClick} />
    </div>
  )
}
