import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { EventDetailPopover } from '../../src/components/EventDetailPopover'
import { useEventTagStore } from '../../src/stores/eventTagStore'
import type { CalendarEvent } from '../../src/utils/eventTimeUtils'
import { eventDetailApi } from '../../src/api/eventDetailApi'

vi.mock('../../src/api/eventDetailApi', () => ({
  eventDetailApi: { getEventDetail: vi.fn() },
}))

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: vi.fn(async () => []) },
}))

const mockAnchorRect: DOMRect = {
  top: 100,
  bottom: 120,
  left: 50,
  right: 200,
  width: 150,
  height: 20,
  x: 50,
  y: 100,
  toJSON: () => ({}),
}

function makeTodoEvent(overrides: {
  name?: string
  tagId?: string | null
  eventTime?: any
  repeating?: any
  notifications?: any[]
} = {}): CalendarEvent {
  return {
    type: 'todo',
    event: {
      uuid: 'todo-123',
      name: overrides.name ?? '테스트 할 일',
      is_current: false,
      event_tag_id: overrides.tagId ?? null,
      event_time: overrides.eventTime ?? { time_type: 'at', timestamp: 1710480600 },
      repeating: overrides.repeating ?? null,
      notification_options: overrides.notifications ?? null,
    },
  }
}

function makeScheduleEvent(overrides: {
  name?: string
  tagId?: string | null
  eventTime?: any
  repeating?: any
  notifications?: any[]
} = {}): CalendarEvent {
  return {
    type: 'schedule',
    event: {
      uuid: 'schedule-456',
      name: overrides.name ?? '테스트 일정',
      event_tag_id: overrides.tagId ?? null,
      event_time: overrides.eventTime ?? { time_type: 'at', timestamp: 1710480600 },
      repeating: overrides.repeating ?? null,
      notification_options: overrides.notifications ?? null,
    },
  }
}

function renderPopover(
  calEvent: CalendarEvent,
  handlers: { onClose?: () => void; onEdit?: () => void; onDelete?: () => void } = {},
) {
  const onClose = handlers.onClose ?? vi.fn()
  const onEdit = handlers.onEdit ?? vi.fn()
  const onDelete = handlers.onDelete ?? vi.fn()
  return render(
    <MemoryRouter>
      <EventDetailPopover
        calEvent={calEvent}
        anchorRect={mockAnchorRect}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </MemoryRouter>,
  )
}

describe('EventDetailPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEventTagStore.setState({ tags: new Map() })
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({
      place: null,
      url: null,
      memo: null,
    })
  })

  it('이벤트 이름과 시간을 표시한다', async () => {
    // given: 이름과 시간이 있는 Todo 이벤트
    const calEvent = makeTodoEvent({
      name: '중요한 할 일',
      eventTime: { time_type: 'at', timestamp: 1710480600 },
    })

    // when: 팝오버 렌더
    renderPopover(calEvent)

    // then: 이벤트 이름이 표시된다
    expect(screen.getByText('중요한 할 일')).toBeInTheDocument()
    // EventTimeDisplay가 렌더됨
    expect(screen.getByTestId('event-detail-popover')).toBeInTheDocument()
  })

  it('반복 정보를 표시한다', async () => {
    // given: 매일 반복 설정이 있는 일정
    const calEvent = makeTodoEvent({
      name: '매일 운동',
      repeating: { start: 1710480600, option: { optionType: 'every_day', interval: 1 } },
    })

    // when: 팝오버 렌더
    renderPopover(calEvent)

    // then: 반복 정보가 표시된다
    const repeatingInfo = screen.getByTestId('repeating-info')
    expect(repeatingInfo).toBeInTheDocument()
    expect(repeatingInfo).toHaveTextContent('매 1일')
  })

  it('알림 설정을 표시한다', async () => {
    // given: 알림 설정이 있는 이벤트
    const calEvent = makeTodoEvent({
      name: '알림 있는 할 일',
      notifications: [{ type: 'time', seconds: -300 }],
    })

    // when: 팝오버 렌더
    renderPopover(calEvent)

    // then: 알림 정보가 표시된다
    const notifInfo = screen.getByTestId('notification-info')
    expect(notifInfo).toBeInTheDocument()
    expect(notifInfo).toHaveTextContent('5분 전')
  })

  it('eventDetail API로 장소, URL, 메모를 로드하여 표시한다', async () => {
    // given: 추가 정보가 있는 이벤트
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({
      place: '서울 카페',
      url: 'https://example.com',
      memo: '미팅 메모',
    })
    const calEvent = makeTodoEvent({ name: '미팅' })

    // when: 팝오버 렌더 및 API 응답 대기
    renderPopover(calEvent)

    // then: 장소, URL, 메모가 표시된다
    await waitFor(() => {
      expect(screen.getByText('서울 카페')).toBeInTheDocument()
      expect(screen.getByText('https://example.com')).toBeInTheDocument()
      expect(screen.getByText('미팅 메모')).toBeInTheDocument()
    })
  })

  it('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onClose = vi.fn()
    const calEvent = makeTodoEvent()

    // when: 팝오버 렌더 후 닫기 버튼 클릭
    renderPopover(calEvent, { onClose })
    await user.click(screen.getByTestId('popover-close-btn'))

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('수정 버튼 클릭 시 onEdit이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const calEvent = makeTodoEvent()

    // when: 팝오버 렌더 후 수정 버튼 클릭
    renderPopover(calEvent, { onEdit })
    await user.click(screen.getByTestId('popover-edit-btn'))

    // then
    expect(onEdit).toHaveBeenCalled()
  })

  it('삭제 버튼 클릭 시 onDelete가 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const calEvent = makeTodoEvent()

    // when: 팝오버 렌더 후 삭제 버튼 클릭
    renderPopover(calEvent, { onDelete })
    await user.click(screen.getByTestId('popover-delete-btn'))

    // then
    expect(onDelete).toHaveBeenCalled()
  })

  it('backdrop 클릭 시 onClose가 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onClose = vi.fn()
    const calEvent = makeTodoEvent()

    // when: 팝오버 렌더 후 backdrop 클릭
    renderPopover(calEvent, { onClose })
    await user.click(screen.getByTestId('popover-backdrop'))

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('반복 정보가 없으면 반복 섹션을 표시하지 않는다', () => {
    // given: 반복 없는 이벤트
    const calEvent = makeTodoEvent({ repeating: null })

    // when
    renderPopover(calEvent)

    // then
    expect(screen.queryByTestId('repeating-info')).not.toBeInTheDocument()
  })

  it('알림 설정이 없으면 알림 섹션을 표시하지 않는다', () => {
    // given: 알림 없는 이벤트
    const calEvent = makeTodoEvent({ notifications: null })

    // when
    renderPopover(calEvent)

    // then
    expect(screen.queryByTestId('notification-info')).not.toBeInTheDocument()
  })

  it('태그가 있으면 태그 색상 dot을 이벤트 이름 옆에 표시한다', () => {
    // given: 태그가 있는 이벤트
    const tagId = 'tag-blue'
    useEventTagStore.setState({
      tags: new Map([[tagId, { uuid: tagId, name: '업무', color_hex: '#0000ff' }]]),
    })
    const calEvent = makeTodoEvent({ tagId })

    // when
    renderPopover(calEvent)

    // then: 태그 색상 dot이 표시된다
    const dot = screen.getByTestId('tag-color-dot')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveStyle({ backgroundColor: '#0000ff' })
  })

  it('Schedule 이벤트의 이름과 시간을 표시한다', async () => {
    // given: Schedule 이벤트
    const calEvent = makeScheduleEvent({
      name: '팀 미팅',
      eventTime: { time_type: 'period', period_start: 1710480600, period_end: 1710484200 },
    })

    // when
    renderPopover(calEvent)

    // then
    expect(screen.getByText('팀 미팅')).toBeInTheDocument()
    expect(screen.getByTestId('event-detail-popover')).toBeInTheDocument()
  })
})
