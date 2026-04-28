import { useMemo, useEffect } from 'react'
import { buildCalendarGrid } from './calendarUtils'
import MainCalendarGrid from './MainCalendarGrid'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsCache } from '../repositories/caches/calendarEventsCache'
import { useHolidayCache } from '../repositories/caches/holidayCache'
import { useCalendarAppearanceStore } from '../stores/calendarAppearanceStore'
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
  const fetchEventsForYear = useCalendarEventsCache(s => s.fetchEventsForYear)
  const fetchHolidays = useHolidayCache(s => s.fetchHolidays)
  const weekStartDay = useCalendarAppearanceStore(s => s.weekStartDay)
  const eventDisplayLevel = useCalendarAppearanceStore(s => s.eventDisplayLevel)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = useMemo(() => buildCalendarGrid(year, month, today, weekStartDay), [year, month, today, weekStartDay])

  useEffect(() => {
    if (days.length === 0) return
    const years = new Set(days.map(d => d.date.getFullYear()))
    years.forEach(y => fetchEventsForYear(y))
    years.forEach(y => fetchHolidays(y))
  }, [days, fetchEventsForYear, fetchHolidays])

  // full 모드는 콘텐츠가 자라는 만큼 페이지 스크롤이 발생해야 함
  const overflowClass = eventDisplayLevel === 'full' ? 'overflow-y-auto' : 'overflow-hidden'

  return (
    <div className={`flex-1 flex flex-col bg-white px-2 pt-2 pb-4 ${overflowClass}`}>
      <MainCalendarGrid days={days} onEventClick={onEventClick} />
    </div>
  )
}
