import { useMemo } from 'react'
import { buildCalendarGrid } from './calendarUtils'
import MainCalendarGrid from './MainCalendarGrid'
import type { WeekStartDay, EventDisplayLevel } from '../repositories/caches/settingsCache'
import type { CalendarEvent } from '../domain/functions/eventTime'

export interface MainCalendarProps {
  currentMonth: Date
  weekStartDay: WeekStartDay
  eventDisplayLevel: EventDisplayLevel
  today?: Date
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export default function MainCalendar({
  currentMonth,
  weekStartDay,
  eventDisplayLevel,
  today: todayProp,
  onEventClick,
}: MainCalendarProps) {
  const todayKey = todayProp
    ? `${todayProp.getFullYear()}-${todayProp.getMonth()}-${todayProp.getDate()}`
    : ''
  const today = useMemo(() => {
    if (!todayProp) return new Date()
    return new Date(todayProp.getFullYear(), todayProp.getMonth(), todayProp.getDate())
  }, [todayKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = useMemo(() => buildCalendarGrid(year, month, today, weekStartDay), [year, month, today, weekStartDay])

  // full 모드는 콘텐츠가 자라는 만큼 페이지 스크롤이 발생해야 함
  const overflowClass = eventDisplayLevel === 'full' ? 'overflow-y-auto' : 'overflow-hidden'

  return (
    <div className={`flex-1 flex flex-col bg-surface px-2 pt-2 pb-4 ${overflowClass}`}>
      <MainCalendarGrid days={days} onEventClick={onEventClick} />
    </div>
  )
}
