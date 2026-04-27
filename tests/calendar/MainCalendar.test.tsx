import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import MainCalendar from '../../src/calendar/MainCalendar'
import { useUiStore } from '../../src/stores/uiStore'
import { useCalendarEventsCache } from '../../src/repositories/caches/calendarEventsCache'
import { useHolidayStore } from '../../src/stores/holidayStore'
import { useEventTagStore } from '../../src/stores/eventTagStore'
import { todoApi } from '../../src/api/todoApi'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodos: vi.fn(async () => []) },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn(async () => []) },
}))
vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: { getHolidays: vi.fn(async () => ({ items: [] })) },
}))

const today = new Date(2026, 2, 15) // March 15, 2026

function renderCalendar(todayProp = today, onEventClick?: (calEvent: unknown, anchorRect: DOMRect) => void) {
  return render(
    <MemoryRouter>
      <MainCalendar today={todayProp} onEventClick={onEventClick as never} />
    </MemoryRouter>
  )
}

describe('MainCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiStore.setState({
      selectedDate: null,
      currentMonth: new Date(2026, 2, 1), // March 2026
    })
    useCalendarEventsCache.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
    useHolidayStore.setState({ holidays: new Map(), loadedYears: new Set() })
    useEventTagStore.setState({ tags: new Map() })
  })

  it('현재 달의 요일 헤더와 날짜 셀을 렌더링한다', () => {
    // given: currentMonth가 2026년 3월
    // when: MainCalendar 렌더
    renderCalendar()

    // then: 요일 헤더가 표시된다
    expect(screen.getByText('일')).toBeInTheDocument()
    expect(screen.getByText('월')).toBeInTheDocument()
    const cells = screen.getAllByTestId('day-cell')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('uiStore의 currentMonth가 변경되면 해당 달 캘린더를 표시한다', () => {
    // given: currentMonth가 4월로 변경된 상태
    useUiStore.setState({ currentMonth: new Date(2026, 3, 1) }) // April 2026

    // when: MainCalendar 렌더
    renderCalendar()

    // then: 날짜 셀이 4월 기준으로 표시된다 (4월 1일 포함)
    const cells = screen.getAllByTestId('day-cell')
    const dayNumbers = Array.from(cells).map(c => c.querySelector('div')?.textContent)
    // April has 30 days, so 30 should appear in the grid
    expect(dayNumbers).toContain('30')
  })

  it('이벤트가 있는 날짜에 이벤트 dot이 표시된다', async () => {
    // given: 3월 15일에 이벤트가 있는 상태 (API가 해당 todo를 반환)
    // March 15, 2026 00:00 KST = 1742216400 seconds (approx), event_time.at makes it show on that day
    const march15Timestamp = Math.floor(new Date(2026, 2, 15, 9, 0, 0).getTime() / 1000)
    vi.mocked(todoApi.getTodos).mockResolvedValueOnce([
      {
        uuid: 't1',
        name: '오늘의 할 일',
        is_current: false,
        event_tag_id: null,
        event_time: { time_type: 'at', timestamp: march15Timestamp },
      },
    ])

    // when: MainCalendar 렌더
    renderCalendar()

    // then: 이벤트 dot이 표시된다 (fetch 완료 후)
    await waitFor(() => {
      const dots = screen.getAllByTestId('event-dots')
      expect(dots.length).toBeGreaterThan(0)
    })
  })

  it('이벤트 바 클릭 시 onEventClick 콜백이 호출된다', async () => {
    // given: 3월 10일에 이벤트가 있는 상태, onEventClick 콜백이 전달된 상태
    const user = userEvent.setup()
    const onEventClick = vi.fn()
    const march10Timestamp = Math.floor(new Date(2026, 2, 10, 9, 0, 0).getTime() / 1000)
    vi.mocked(todoApi.getTodos).mockResolvedValueOnce([
      {
        uuid: 'preview-todo',
        name: '미리보기 할 일',
        is_current: false,
        event_tag_id: null,
        event_time: { time_type: 'at', timestamp: march10Timestamp },
      },
    ])

    renderCalendar(today, onEventClick)

    // when: 이벤트 바 클릭 (fetch 완료 후 event-bar 나타남)
    await waitFor(() => {
      expect(screen.getAllByTestId('event-bar').length).toBeGreaterThan(0)
    })
    const eventBars = screen.getAllByTestId('event-bar')
    await user.click(eventBars[0])

    // then: onEventClick 콜백이 호출된다
    await waitFor(() => {
      expect(onEventClick).toHaveBeenCalled()
    })
  })
})
