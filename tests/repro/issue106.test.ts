import { describe, it, expect } from 'vitest'
import { groupEventsByDate, dateToTimestamp } from '../../src/domain/functions/eventTime'
import { buildWeekEventStack } from '../../src/calendar/weekEventStackBuilder'
import type { CalendarDay } from '../../src/calendar/calendarUtils'
import type { Todo } from '../../src/models/Todo'

function makeWeekDays(startDate: Date): CalendarDay[] {
  const days: CalendarDay[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    days.push({ date, dayOfMonth: date.getDate(), dateKey: `${y}-${m}-${d}`, isCurrentMonth: true, isToday: false })
  }
  return days
}

describe('issue #106 실데이터 재현', () => {
  it('미중 정상회담 (2일 종일 KST 5/14~5/15) 캘린더 그리드 표시', () => {
    const todo: Todo = {
      uuid: 'B77A3369-AD3A-47E2-98D4-B70344C6038A',
      name: '미중 정상회담',
      event_tag_id: 'DTB3xvdpHE977FYhOcih',
      event_time: { time_type: 'allday', period_start: 1778684400, period_end: 1778857199, seconds_from_gmt: 32400 } as never,
      is_current: false,
    }

    const lower = dateToTimestamp(new Date(2026, 0, 1))
    const upper = dateToTimestamp(new Date(2026, 11, 31, 23, 59, 59))
    const map = groupEventsByDate([todo], [], lower, upper)

    console.log('keys with event:', [...map.keys()].sort())
    expect(map.get('2026-05-14')?.length ?? 0).toBe(1)
    expect(map.get('2026-05-15')?.length ?? 0).toBe(1)

    const weekDays = makeWeekDays(new Date(2026, 4, 10))
    const stack = buildWeekEventStack(weekDays, map)
    console.log('stack rows:', JSON.stringify(stack.rows.map(r => r.map(e => ({ startCol: e.startCol, endCol: e.endCol }))), null, 2))
    expect(stack.rows.length).toBe(1)
    expect(stack.rows[0][0].startCol).toBe(5)
    expect(stack.rows[0][0].endCol).toBe(6)
  })
})
