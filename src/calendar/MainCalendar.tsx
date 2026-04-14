import { useMemo, useEffect, useState } from 'react'
import { buildCalendarGrid } from './calendarUtils'
import MainCalendarGrid from './MainCalendarGrid'
import EventPreviewCard from '../components/EventPreviewCard'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import type { CalendarEvent } from '../utils/eventTimeUtils'

interface PreviewState {
  calEvent: CalendarEvent
  anchorRect: DOMRect
}

interface MainCalendarProps {
  today?: Date
}

export default function MainCalendar({ today: todayProp }: MainCalendarProps) {
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

  const [previewEvent, setPreviewEvent] = useState<PreviewState | null>(null)

  useEffect(() => {
    if (days.length === 0) return
    const years = new Set(days.map(d => d.date.getFullYear()))
    years.forEach(y => fetchEventsForYear(y))
    years.forEach(y => fetchHolidays(y))
  }, [days, fetchEventsForYear, fetchHolidays])

  function handleEventClick(calEvent: CalendarEvent, anchorRect: DOMRect) {
    setPreviewEvent({ calEvent, anchorRect })
  }

  function handleClosePreview() {
    setPreviewEvent(null)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden border border-border-calendar rounded-lg shadow-sm bg-white m-4">
      <MainCalendarGrid days={days} onEventClick={handleEventClick} />
      {previewEvent && (
        <EventPreviewCard
          calEvent={previewEvent.calEvent}
          anchorRect={previewEvent.anchorRect}
          onClose={handleClosePreview}
        />
      )}
    </div>
  )
}
