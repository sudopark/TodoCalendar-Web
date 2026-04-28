import { useShallow } from 'zustand/react/shallow'
import { useCalendarEventsCache } from '../caches/calendarEventsCache'
import { monthRange } from '../../domain/functions/eventTime'
import type { CalendarEvent } from '../../domain/functions/eventTime'

/**
 * 특정 월의 캘린더 이벤트를 React 컴포넌트에서 구독한다.
 * 캐시 변경 시 자동 리렌더. 반환 배열은 useShallow 로 안정 참조 유지.
 *
 * @param year  연도(4자리)
 * @param month 0-indexed 월 (JS Date 규약, 0=January)
 */
export function useMonthEvents(year: number, month: number): CalendarEvent[] {
  const range = monthRange(year, month)
  const lowerDate = new Date(range.lower * 1000)
  lowerDate.setHours(0, 0, 0, 0)
  const upperDate = new Date(range.upper * 1000)
  upperDate.setHours(23, 59, 59, 999)

  return useCalendarEventsCache(
    useShallow(state => {
      const result: CalendarEvent[] = []
      for (const [key, events] of state.eventsByDate) {
        const d = new Date(key)
        if (d >= lowerDate && d <= upperDate) {
          result.push(...events)
        }
      }
      return result
    }),
  )
}
