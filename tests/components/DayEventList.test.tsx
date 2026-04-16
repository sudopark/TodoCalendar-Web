import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DayEventList } from '../../src/components/DayEventList'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import { useEventTagStore } from '../../src/stores/eventTagStore'
import type { CalendarEvent } from '../../src/utils/eventTimeUtils'

vi.mock('../../src/stores/calendarEventsStore', () => ({ useCalendarEventsStore: vi.fn() }))
vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))
vi.mock('../../src/firebase', () => ({ auth: {}, db: {} }))

const mockOnEventClick = vi.fn()

function renderComponent(selectedDate: Date | null = null, onEventClick = mockOnEventClick) {
  return render(
    <DayEventList selectedDate={selectedDate} onEventClick={onEventClick} />
  )
}

function mockCalendarEventsStore(eventsByDate: Map<string, any[]>) {
  vi.mocked(useCalendarEventsStore).mockImplementation((selector: any) => selector({ eventsByDate }))
}

function mockEventTagStore(colorMap: Record<string, string> = {}) {
  vi.mocked(useEventTagStore).mockImplementation((selector: any) =>
    selector({ getColorForTagId: (id: string) => colorMap[id] ?? null })
  )
}

describe('DayEventList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnEventClick.mockReset()
    mockEventTagStore()
  })

  it('날짜가 선택되지 않으면 아무것도 표시하지 않는다', () => {
    mockCalendarEventsStore(new Map())

    const { container } = renderComponent(null)

    expect(container.firstChild).toBeNull()
  })

  it('선택된 날짜에 이벤트가 없으면 안내 메시지를 표시한다', () => {
    mockCalendarEventsStore(new Map())

    renderComponent(new Date(2024, 2, 15))

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

    mockCalendarEventsStore(eventsByDate)

    // when: 컴포넌트를 렌더링
    renderComponent(new Date(2024, 2, 15))

    // then: 화면에 표시되는 순서가 시간 오름차순 (아침 → 점심 → 저녁)
    const items = screen.getAllByText(/할 일|일정/)
    const names = items.map(el => el.textContent)
    expect(names).toEqual(['아침 할 일', '점심 일정', '저녁 할 일'])
  })

  it('시간이 없는 이벤트는 목록 끝에 표시한다', () => {
    const todoNoTime = { uuid: 't1', name: '시간 없는 할 일', is_current: false, event_time: null }
    const scheduleWithTime = { uuid: 's1', name: '시간 있는 일정', event_time: { time_type: 'at' as const, timestamp: 1710480600 } }
    const eventsByDate = new Map([
      ['2024-03-15', [
        { type: 'todo' as const, event: todoNoTime },
        { type: 'schedule' as const, event: scheduleWithTime },
      ]],
    ])

    mockCalendarEventsStore(eventsByDate)

    renderComponent(new Date(2024, 2, 15))

    expect(screen.getByText('시간 있는 일정')).toBeInTheDocument()
    expect(screen.getByText('시간 없는 할 일')).toBeInTheDocument()
  })

  it('이벤트를 클릭하면 onEventClick 콜백을 calEvent와 anchorRect와 함께 호출한다', async () => {
    const todo = { uuid: 'todo-abc', name: '상세 확인 할 일', is_current: false, event_time: null }
    const eventsByDate = new Map([
      ['2024-03-15', [{ type: 'todo' as const, event: todo }]],
    ])

    mockCalendarEventsStore(eventsByDate)

    renderComponent(new Date(2024, 2, 15))
    await userEvent.click(screen.getByText('상세 확인 할 일'))

    expect(mockOnEventClick).toHaveBeenCalledOnce()
    const [calEvent, anchorRect] = mockOnEventClick.mock.calls[0] as [CalendarEvent, DOMRect]
    expect(calEvent.type).toBe('todo')
    expect(calEvent.event.uuid).toBe('todo-abc')
    expect(typeof anchorRect).toBe('object')
  })

})
