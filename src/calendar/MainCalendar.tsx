import { useMemo, useEffect, useState } from 'react'
import { buildCalendarGrid } from './calendarUtils'
import MainCalendarGrid from './MainCalendarGrid'
import EventPreviewCard from '../components/EventPreviewCard'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import { dayRange } from '../utils/eventTimeUtils'
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
  const fetchEventsForRange = useCalendarEventsStore(s => s.fetchEventsForRange)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = useMemo(() => buildCalendarGrid(year, month, today), [year, month, today])

  const [previewEvent, setPreviewEvent] = useState<PreviewState | null>(null)

  useEffect(() => {
    if (days.length === 0) return
    const lower = dayRange(days[0].date).lower
    const upper = dayRange(days[days.length - 1].date).upper
    fetchEventsForRange(lower, upper)
    const years = new Set(days.map(d => d.date.getFullYear()))
    years.forEach(y => fetchHolidays(y))
  }, [days, fetchEventsForRange, fetchHolidays])

  function handleEventClick(calEvent: CalendarEvent, anchorRect: DOMRect) {
    setPreviewEvent({ calEvent, anchorRect })
  }

  function handleClosePreview() {
    setPreviewEvent(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
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
