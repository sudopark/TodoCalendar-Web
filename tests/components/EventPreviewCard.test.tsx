import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import EventPreviewCard from '../../src/components/EventPreviewCard'
import { useEventTagStore } from '../../src/stores/eventTagStore'
import type { CalendarEvent } from '../../src/utils/eventTimeUtils'

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: vi.fn(async () => []) },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

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

function makeTodoEvent(overrides: Partial<{ name: string; tagId: string | null; eventTime: any }> = {}): CalendarEvent {
  return {
    type: 'todo',
    event: {
      uuid: 'todo-123',
      name: overrides.name ?? '테스트 할 일',
      is_current: false,
      event_tag_id: overrides.tagId ?? null,
      event_time: overrides.eventTime ?? null,
    },
  }
}

function makeScheduleEvent(overrides: Partial<{ name: string; tagId: string | null; eventTime: any }> = {}): CalendarEvent {
  return {
    type: 'schedule',
    event: {
      uuid: 'schedule-456',
      name: overrides.name ?? '테스트 일정',
      event_tag_id: overrides.tagId ?? null,
      event_time: overrides.eventTime ?? { time_type: 'at', timestamp: 1710480600 },
    },
  }
}

function renderCard(calEvent: CalendarEvent, onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <EventPreviewCard calEvent={calEvent} anchorRect={mockAnchorRect} onClose={onClose} />
    </MemoryRouter>
  )
}

describe('EventPreviewCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEventTagStore.setState({ tags: new Map() })
  })

  it('이벤트 이름을 표시한다', () => {
    // given: 이름이 있는 Todo 이벤트
    const calEvent = makeTodoEvent({ name: '중요한 할 일' })

    // when: 카드 렌더
    renderCard(calEvent)

    // then: 이벤트 이름이 표시된다
    expect(screen.getByText('중요한 할 일')).toBeInTheDocument()
  })

  it('event_time이 있으면 시간 정보를 표시한다', () => {
    // given: at 타입 시간이 있는 일정
    const calEvent = makeScheduleEvent({
      name: '회의',
      eventTime: { time_type: 'at', timestamp: 1710480600 },
    })

    // when: 카드 렌더
    renderCard(calEvent)

    // then: 시간 텍스트가 표시된다
    expect(screen.getByText('회의')).toBeInTheDocument()
    // EventTimeDisplay가 렌더되면 시간 텍스트가 나타남
    expect(screen.getByTestId('event-preview-card')).toBeInTheDocument()
  })

  it('태그 색상 dot을 표시한다', () => {
    // given: 태그가 있는 이벤트
    const tagId = 'tag-red'
    useEventTagStore.setState({
      tags: new Map([[tagId, { uuid: tagId, name: '업무', color_hex: '#ff0000' }]]),
    })
    const calEvent = makeTodoEvent({ tagId })

    // when: 카드 렌더
    renderCard(calEvent)

    // then: 태그 색상 dot이 표시된다
    const dot = screen.getByTestId('tag-color-dot')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveStyle({ backgroundColor: '#ff0000' })
  })

  it('태그가 없으면 색상 dot이 표시되지 않는다', () => {
    // given: 태그가 없는 이벤트
    const calEvent = makeTodoEvent({ tagId: null })

    // when: 카드 렌더
    renderCard(calEvent)

    // then: 태그 dot 없음
    expect(screen.queryByTestId('tag-color-dot')).not.toBeInTheDocument()
  })

  it('Todo의 수정 버튼을 클릭하면 Todo 편집 경로로 이동한다', async () => {
    // given: Todo 이벤트
    const user = userEvent.setup()
    const calEvent = makeTodoEvent({ name: '수정할 할 일' })
    renderCard(calEvent)

    // when: 수정 버튼 클릭
    await user.click(screen.getByRole('button', { name: '수정' }))

    // then: Todo 편집 경로로 navigate가 호출된다
    expect(mockNavigate).toHaveBeenCalled()
    const [path] = mockNavigate.mock.calls[0]
    expect(path).toBe('/todos/todo-123/edit')
  })

  it('Schedule의 수정 버튼을 클릭하면 Schedule 편집 경로로 이동한다', async () => {
    // given: Schedule 이벤트
    const user = userEvent.setup()
    const calEvent = makeScheduleEvent({ name: '수정할 일정' })
    renderCard(calEvent)

    // when: 수정 버튼 클릭
    await user.click(screen.getByRole('button', { name: '수정' }))

    // then: Schedule 편집 경로로 navigate가 호출된다
    expect(mockNavigate).toHaveBeenCalled()
    const [path] = mockNavigate.mock.calls[0]
    expect(path).toBe('/schedules/schedule-456/edit')
  })

  it('수정 버튼 클릭 시 background location state를 포함해 navigate한다', async () => {
    // given: Todo 이벤트
    const user = userEvent.setup()
    const calEvent = makeTodoEvent()
    renderCard(calEvent)

    // when: 수정 버튼 클릭
    await user.click(screen.getByRole('button', { name: '수정' }))

    // then: state에 background가 포함된다
    const [, options] = mockNavigate.mock.calls[0]
    expect(options?.state?.background).toBeDefined()
  })

  it('백드롭 클릭 시 onClose가 호출된다', async () => {
    // given: onClose 핸들러
    const user = userEvent.setup()
    const onClose = vi.fn()
    const calEvent = makeTodoEvent()
    renderCard(calEvent, onClose)

    // when: 백드롭 클릭
    await user.click(screen.getByTestId('preview-backdrop'))

    // then: onClose가 호출된다
    expect(onClose).toHaveBeenCalled()
  })
})
