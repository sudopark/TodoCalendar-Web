import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MainCalendarGrid from '../../src/calendar/MainCalendarGrid'
import { buildCalendarGrid } from '../../src/calendar/calendarUtils'
import { useCalendarEventsCache } from '../../src/repositories/caches/calendarEventsCache'
import { useHolidayCache } from '../../src/repositories/caches/holidayCache'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import { groupEventsByDate, monthRange } from '../../src/domain/functions/eventTime'
import type { Schedule } from '../../src/models/Schedule'

vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))

const augDays = buildCalendarGrid(2026, 7, new Date(2026, 7, 1), 0)

// #192: iOS 가 만든 태그 color_hex 는 8자리(#RRGGBBAA). EventBar 가 `${color}88` 로 alpha 를
// 덧붙일 때 base 가 6자리로 정규화돼 있지 않으면 무효 hex 가 되어 배경이 통째로 투명해진다
// (멀티데이 일정이 span 영역은 차지하나 색이 안 칠해지는 증상).
describe('#192 EventBar 태그 색상 — 8자리 hex 도 배경이 채워진다', () => {
  beforeEach(() => {
    useHolidayCache.setState({ holidays: new Map(), loadedYears: new Set() })
  })

  function renderMultiDayWithTagColor(colorHex: string): HTMLElement {
    useEventTagListCache.setState({
      tags: new Map([['t-invest', { uuid: 't-invest', name: '투자', color_hex: colorHex }]]),
    } as never)
    const ps = Math.floor(new Date('2026-07-31T00:00:00+09:00').getTime() / 1000)
    const pe = Math.floor(new Date('2026-08-14T23:59:59+09:00').getTime() / 1000)
    const sch = {
      uuid: 'sp',
      name: '멀티데이',
      event_tag_id: 't-invest',
      event_time: { time_type: 'allday', period_start: ps, period_end: pe, seconds_from_gmt: 32400 },
    } as Schedule
    const range = monthRange(2026, 7)
    useCalendarEventsCache.setState({ eventsByDate: groupEventsByDate([], [sch], range.lower, range.upper), loading: false })
    render(<MainCalendarGrid days={augDays} />)
    return screen.getAllByTestId('event-bar')[0] as HTMLElement
  }

  it('6자리 hex 태그 → 배경 채워짐', () => {
    const bar = renderMultiDayWithTagColor('#1976D2')
    expect(bar.style.backgroundColor).not.toBe('')
  })

  it('8자리 hex(iOS) 태그 → 배경 채워짐 (투명 회귀 차단)', () => {
    const bar = renderMultiDayWithTagColor('#1976D2FF')
    expect(bar.style.backgroundColor).not.toBe('')
  })
})
