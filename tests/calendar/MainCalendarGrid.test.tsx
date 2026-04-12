import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MainCalendarGrid from '../../src/calendar/MainCalendarGrid'
import { buildCalendarGrid } from '../../src/calendar/calendarUtils'
import { useUiStore } from '../../src/stores/uiStore'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import { useHolidayStore } from '../../src/stores/holidayStore'
import { useEventTagStore } from '../../src/stores/eventTagStore'
import type { CalendarEvent } from '../../src/utils/eventTimeUtils'

vi.mock('../../src/firebase', () => ({ auth: {} }))
vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodos: vi.fn(async () => []) },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn(async () => []) },
}))

const today = new Date(2026, 2, 15) // March 15, 2026
const marchDays = buildCalendarGrid(2026, 2, today)

describe('MainCalendarGrid', () => {
  beforeEach(() => {
    useUiStore.setState({ selectedDate: null })
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false })
    useHolidayStore.setState({ holidays: new Map(), loadedYears: new Set() })
    useEventTagStore.setState({ tags: new Map() })
  })

  it('7개의 요일 헤더를 렌더링한다', () => {
    // given: 3월 그리드
    // when: MainCalendarGrid 렌더
    render(<MainCalendarGrid days={marchDays} />)

    // then: 요일 헤더 7개 표시
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    weekdays.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it('올바른 수의 날짜 셀을 렌더링한다', () => {
    // given: 3월 그리드
    // when: MainCalendarGrid 렌더
    render(<MainCalendarGrid days={marchDays} />)

    // then: 날짜 셀 수가 그리드 days와 일치
    const cells = screen.getAllByTestId('day-cell')
    expect(cells.length).toBe(marchDays.length)
  })

  it('날짜 셀 클릭 시 selectedDate가 설정된다', async () => {
    // given: 아무것도 선택되지 않은 캘린더
    const user = userEvent.setup()
    render(<MainCalendarGrid days={marchDays} />)

    // when: 3월 10일 셀 클릭
    const cells = screen.getAllByTestId('day-cell')
    const march10Index = marchDays.findIndex(d => d.isCurrentMonth && d.dayOfMonth === 10)
    await user.click(cells[march10Index])

    // then: selectedDate가 3월 10일로 설정된다
    const selected = useUiStore.getState().selectedDate
    expect(selected?.getDate()).toBe(10)
    expect(selected?.getMonth()).toBe(2)
  })

  it('이벤트 바가 있는 날짜에 이벤트 바를 렌더링한다', () => {
    // given: 3월 10일에 이벤트가 있는 상태
    const eventsMap = new Map<string, CalendarEvent[]>()
    eventsMap.set('2026-03-10', [
      {
        type: 'todo',
        event: {
          uuid: 't1',
          name: '테스트 할 일',
          is_current: false,
          event_tag_id: null,
          event_time: { time_type: 'at', timestamp: 0 },
        },
      },
    ])
    useCalendarEventsStore.setState({ eventsByDate: eventsMap, loading: false })

    // when: MainCalendarGrid 렌더
    render(<MainCalendarGrid days={marchDays} />)

    // then: 이벤트 바가 표시된다 (desktop에서는 event-bar, mobile에서는 event-dots)
    const dots = screen.getAllByTestId('event-dots')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('이벤트 바 클릭 시 onEventClick이 호출되고 날짜 셀 클릭이 차단된다', async () => {
    // given: 이벤트가 있는 날짜와 onEventClick 핸들러
    const user = userEvent.setup()
    const onEventClick = vi.fn()
    const todoEvent: CalendarEvent = {
      type: 'todo',
      event: {
        uuid: 't1',
        name: '클릭할 할 일',
        is_current: false,
        event_tag_id: null,
        event_time: { time_type: 'at', timestamp: 0 },
      },
    }
    const eventsMap = new Map<string, CalendarEvent[]>()
    eventsMap.set('2026-03-10', [todoEvent])
    useCalendarEventsStore.setState({ eventsByDate: eventsMap, loading: false })
    useEventTagStore.setState({ tags: new Map() })

    render(<MainCalendarGrid days={marchDays} onEventClick={onEventClick} />)

    // when: 이벤트 바 클릭 (desktop 뷰 — event-bar testid)
    const eventBars = screen.getAllByTestId('event-bar')
    await user.click(eventBars[0])

    // then: onEventClick이 호출되고 이벤트 객체가 전달된다
    expect(onEventClick).toHaveBeenCalled()
    const [calledEvent] = onEventClick.mock.calls[0]
    expect(calledEvent.event.uuid).toBe('t1')
  })

  it('이벤트 바 클릭 후에도 날짜 선택 상태가 바뀌지 않는다', async () => {
    // given: 이벤트가 있는 날짜, 초기 selectedDate = null
    const user = userEvent.setup()
    const todoEvent: CalendarEvent = {
      type: 'todo',
      event: {
        uuid: 't2',
        name: '전파 차단 할 일',
        is_current: false,
        event_tag_id: null,
        event_time: { time_type: 'at', timestamp: 0 },
      },
    }
    const eventsMap = new Map<string, CalendarEvent[]>()
    eventsMap.set('2026-03-10', [todoEvent])
    useCalendarEventsStore.setState({ eventsByDate: eventsMap, loading: false })

    render(<MainCalendarGrid days={marchDays} onEventClick={vi.fn()} />)

    // when: 이벤트 바 클릭
    const eventBars = screen.getAllByTestId('event-bar')
    await user.click(eventBars[0])

    // then: selectedDate가 변경되지 않는다 (stopPropagation으로 day 클릭 차단)
    const selected = useUiStore.getState().selectedDate
    expect(selected).toBeNull()
  })

  describe('셀 배경 강조 디자인', () => {
    it('선택된 날 셀 전체에 선택 배경색(#303646)이 적용된다', () => {
      // given: 3월 10일을 선택된 날로 설정
      const march10 = marchDays.find(d => d.isCurrentMonth && d.dayOfMonth === 10)!
      useUiStore.setState({ selectedDate: march10.date })

      // when: MainCalendarGrid 렌더
      render(<MainCalendarGrid days={marchDays} />)

      // then: 선택된 날 셀에 선택 배경색이 적용된다
      const cells = screen.getAllByTestId('day-cell')
      const march10Index = marchDays.findIndex(d => d.isCurrentMonth && d.dayOfMonth === 10)
      const selectedCell = cells[march10Index]
      expect(selectedCell).toHaveStyle({ backgroundColor: '#303646' })
    })

    it('오늘 셀 전체에 오늘 배경색(#f4f4f4)이 적용된다', () => {
      // given: 오늘(2026-03-15)이 포함된 캘린더, 아무것도 선택 안 됨
      useUiStore.setState({ selectedDate: null })

      // when: MainCalendarGrid 렌더
      render(<MainCalendarGrid days={marchDays} />)

      // then: 오늘 셀에 오늘 배경색이 적용된다
      const cells = screen.getAllByTestId('day-cell')
      const todayIndex = marchDays.findIndex(d => d.isToday)
      const todayCell = cells[todayIndex]
      expect(todayCell).toHaveStyle({ backgroundColor: '#f4f4f4' })
    })

    it('선택되지 않은 일반 날 셀에는 강조 배경색이 없다', () => {
      // given: 아무것도 선택되지 않은 상태
      useUiStore.setState({ selectedDate: null })

      // when: MainCalendarGrid 렌더
      render(<MainCalendarGrid days={marchDays} />)

      // then: 3월 10일(일반 날) 셀에는 선택/오늘 배경색이 없다
      const cells = screen.getAllByTestId('day-cell')
      const march10Index = marchDays.findIndex(d => d.isCurrentMonth && d.dayOfMonth === 10)
      const normalCell = cells[march10Index]
      expect(normalCell).not.toHaveStyle({ backgroundColor: '#303646' })
      expect(normalCell).not.toHaveStyle({ backgroundColor: '#f4f4f4' })
    })
  })
})
