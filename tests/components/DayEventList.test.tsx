import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DayEventList, type DayEventListProps } from '../../src/components/DayEventList'
import type { CalendarEvent } from '../../src/domain/functions/eventTime'

vi.mock('../../src/repositories/caches/calendarEventsCache', () => ({
  useCalendarEventsCache: { getState: vi.fn(() => ({ removeEvent: vi.fn() })) },
}))
vi.mock('../../src/repositories/caches/eventTagListCache', () => ({
  useEventTagListCache: vi.fn((selector: any) => selector({ tags: new Map(), defaultTagColors: null })),
  DEFAULT_TAG_ID: 'default',
  HOLIDAY_TAG_ID: 'holiday',
}))
vi.mock('../../src/repositories/caches/settingsCache', () => ({
  useSettingsCache: vi.fn((selector: any) => selector({
    calendarAppearance: {
      weekStartDay: 0, accentDays: { holiday: true, saturday: false, sunday: true },
      eventDisplayLevel: 'medium', rowHeight: 70, eventFontSizeWeight: 0, showEventNames: true,
      eventListFontSizeWeight: 0, showHolidayInEventList: true, showLunarCalendar: false, showUncompletedTodos: true,
    },
    eventDefaults: { defaultTagId: null, defaultNotificationSeconds: null, defaultAllDayNotificationSeconds: null },
    timezone: { timezone: 'UTC', systemTimezone: 'UTC', isCustom: false },
    notification: { permission: 'default', fcmToken: null },
    setAppearance: vi.fn(), resetAppearanceToDefaults: vi.fn(),
    setEventDefaults: vi.fn(), setTimezone: vi.fn(),
    setNotificationPermission: vi.fn(), setFcmToken: vi.fn(),
    requestNotificationPermission: vi.fn(), reset: vi.fn(),
  })),
}))
vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})), db: {} }))
vi.mock('../../src/api/todoApi', () => ({
  todoApi: { completeTodo: vi.fn(), patchTodo: vi.fn() },
}))

const mockOnEventClick = vi.fn()

function defaultProps(overrides: Partial<DayEventListProps> = {}): DayEventListProps {
  return {
    selectedDate: null,
    eventsByDate: new Map(),
    isTagHidden: () => false,
    onEventClick: mockOnEventClick,
    ...overrides,
  }
}

function renderComponent(props: Partial<DayEventListProps> = {}) {
  return render(<DayEventList {...defaultProps(props)} />)
}

describe('DayEventList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnEventClick.mockReset()
  })

  it('날짜가 선택되지 않으면 아무것도 표시하지 않는다', () => {
    // given: selectedDate = null
    const { container } = renderComponent({ selectedDate: null })

    expect(container.firstChild).toBeNull()
  })

  it('선택된 날짜에 이벤트가 없으면 안내 메시지를 표시한다', () => {
    // given: eventsByDate가 비어 있음
    renderComponent({ selectedDate: new Date(2024, 2, 15), eventsByDate: new Map() })

    expect(screen.getByText('이벤트가 없습니다')).toBeInTheDocument()
  })

  it('이벤트를 시간순으로 혼합 정렬하여 표시한다', () => {
    // given: todo, schedule, todo가 시간순이 아닌 순서로 주어짐
    const todoEarly = { uuid: 't1', name: '아침 할 일', is_current: false, event_time: { time_type: 'at' as const, timestamp: 1710468000 } }
    const scheduleMid = { uuid: 's1', name: '점심 일정', event_time: { time_type: 'at' as const, timestamp: 1710480600 } }
    const todoLate = { uuid: 't2', name: '저녁 할 일', is_current: false, event_time: { time_type: 'at' as const, timestamp: 1710504000 } }
    const eventsByDate = new Map([
      ['2024-03-15', [
        { type: 'todo' as const, event: todoLate },
        { type: 'schedule' as const, event: scheduleMid },
        { type: 'todo' as const, event: todoEarly },
      ]],
    ])

    // when: 컴포넌트를 렌더링
    renderComponent({ selectedDate: new Date(2024, 2, 15), eventsByDate })

    // then: 화면에 표시되는 순서가 시간 오름차순 (아침 → 점심 → 저녁)
    const items = screen.getAllByText(/할 일|일정/)
    const names = items.map(el => el.textContent)
    expect(names).toEqual(['아침 할 일', '점심 일정', '저녁 할 일'])
  })

  it('시간이 없는 이벤트는 목록 끝에 표시한다', () => {
    // given: 시간 없는 todo와 시간 있는 schedule
    const todoNoTime = { uuid: 't1', name: '시간 없는 할 일', is_current: false, event_time: null }
    const scheduleWithTime = { uuid: 's1', name: '시간 있는 일정', event_time: { time_type: 'at' as const, timestamp: 1710480600 } }
    const eventsByDate = new Map([
      ['2024-03-15', [
        { type: 'todo' as const, event: todoNoTime },
        { type: 'schedule' as const, event: scheduleWithTime },
      ]],
    ])

    renderComponent({ selectedDate: new Date(2024, 2, 15), eventsByDate })

    expect(screen.getByText('시간 있는 일정')).toBeInTheDocument()
    expect(screen.getByText('시간 없는 할 일')).toBeInTheDocument()
  })

  it('이벤트를 클릭하면 onEventClick 콜백을 calEvent와 anchorRect와 함께 호출한다', async () => {
    // given: 이벤트가 있고 onEventClick 콜백 전달됨
    const todo = { uuid: 'todo-abc', name: '상세 확인 할 일', is_current: false, event_time: null }
    const eventsByDate = new Map([
      ['2024-03-15', [{ type: 'todo' as const, event: todo }]],
    ])

    renderComponent({ selectedDate: new Date(2024, 2, 15), eventsByDate })
    await userEvent.click(screen.getByText('상세 확인 할 일'))

    expect(mockOnEventClick).toHaveBeenCalledOnce()
    const [calEvent, anchorRect] = mockOnEventClick.mock.calls[0] as [CalendarEvent, DOMRect]
    expect(calEvent.type).toBe('todo')
    expect(calEvent.event.uuid).toBe('todo-abc')
    expect(typeof anchorRect).toBe('object')
  })
})
