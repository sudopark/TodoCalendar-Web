import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TodoFormPage } from '../../src/pages/TodoFormPage'
import { ToastContainer } from '../../src/components/Toast'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: {
    getTodo: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    patchTodo: vi.fn(),
    replaceTodo: vi.fn(),
    deleteTodo: vi.fn(),
  },
}))
vi.mock('../../src/api/eventDetailApi', () => ({
  eventDetailApi: {
    getEventDetail: vi.fn(),
    updateEventDetail: vi.fn(),
    deleteEventDetail: vi.fn(),
  },
}))
vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))
vi.mock('../../src/stores/uiStore', () => ({ useUiStore: vi.fn() }))
vi.mock('../../src/stores/calendarEventsStore', () => ({ useCalendarEventsStore: vi.fn() }))
vi.mock('../../src/stores/currentTodosStore', () => ({ useCurrentTodosStore: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { useEventTagStore } from '../../src/stores/eventTagStore'
import { useUiStore } from '../../src/stores/uiStore'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import { useCurrentTodosStore } from '../../src/stores/currentTodosStore'

const mockAddEvent = vi.fn()
const mockRemoveEvent = vi.fn()
const mockReplaceEvent = vi.fn()
const mockAddTodo = vi.fn()
const mockRemoveTodo = vi.fn()
const mockReplaceTodo = vi.fn()

async function setupMocks() {
  const { eventDetailApi } = await import('../../src/api/eventDetailApi')
  vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({})
  vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})
  vi.mocked(useEventTagStore).mockImplementation((sel: any) => sel({ tags: new Map(), getColorForTagId: () => null }))
  vi.mocked(useUiStore).mockImplementation((sel: any) => sel({ selectedDate: null }))
  const calendarState = { addEvent: mockAddEvent, removeEvent: mockRemoveEvent, replaceEvent: mockReplaceEvent }
  vi.mocked(useCalendarEventsStore).mockImplementation((sel?: any) =>
    sel ? sel(calendarState) : calendarState
  )
  ;(useCalendarEventsStore as any).getState = () => calendarState
  const todosState = { addTodo: mockAddTodo, removeTodo: mockRemoveTodo, replaceTodo: mockReplaceTodo }
  vi.mocked(useCurrentTodosStore).mockImplementation((sel?: any) =>
    sel ? sel(todosState) : todosState
  )
  ;(useCurrentTodosStore as any).getState = () => todosState
}

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/todos/new']}>
      <Routes><Route path="/todos/new" element={<TodoFormPage />} /></Routes>
      <ToastContainer />
    </MemoryRouter>
  )
}

function renderEdit(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/todos/${id}/edit`]}>
      <Routes><Route path="/todos/:id/edit" element={<TodoFormPage />} /></Routes>
      <ToastContainer />
    </MemoryRouter>
  )
}

describe('TodoFormPage — create', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  it('"새 Todo" 제목을 표시한다', () => {
    renderCreate()
    expect(screen.getByText('새 Todo')).toBeInTheDocument()
  })

  it('이름을 입력하고 저장하면 createTodo가 호출되고 화면을 닫는다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.createTodo).mockResolvedValue({ uuid: 'new-1', name: '테스트', is_current: false })
    renderCreate()
    await userEvent.type(screen.getByLabelText('이름'), '테스트')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('이름이 비어 있으면 저장 버튼을 클릭해도 API가 호출되지 않는다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    renderCreate()
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(todoApi.createTodo).not.toHaveBeenCalled()
  })
})

describe('TodoFormPage — edit', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  it('기존 todo를 불러와 이름 필드에 표시한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue({ uuid: 'todo-1', name: '기존 이름', is_current: false })
    renderEdit('todo-1')
    await waitFor(() => expect(screen.getByDisplayValue('기존 이름')).toBeInTheDocument())
  })

  it('삭제 버튼 클릭 시 확인 다이얼로그가 표시된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue({ uuid: 'todo-1', name: '할 일', is_current: false })
    renderEdit('todo-1')
    await waitFor(() => screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(screen.getByText(/정말 삭제/)).toBeInTheDocument()
  })

  it('수정 후 navigate가 호출된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue({ uuid: 'todo-1', name: '기존 이름', is_current: false, event_time: null })
    vi.mocked(todoApi.updateTodo).mockResolvedValue({ uuid: 'todo-1', name: '수정됨', is_current: false, event_time: null })
    renderEdit('todo-1')
    await waitFor(() => screen.getByDisplayValue('기존 이름'))
    await userEvent.clear(screen.getByLabelText('이름'))
    await userEvent.type(screen.getByLabelText('이름'), '수정됨')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('삭제 확인 후 navigate가 호출된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue({ uuid: 'todo-1', name: '할 일', is_current: false, event_time: null })
    vi.mocked(todoApi.deleteTodo).mockResolvedValue(undefined as any)
    renderEdit('todo-1')
    await waitFor(() => screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    // ConfirmDialog 열린 후 두 개의 "삭제" 버튼 중 마지막(다이얼로그 확인) 버튼 클릭
    const deleteButtons = screen.getAllByRole('button', { name: '삭제' })
    await userEvent.click(deleteButtons[deleteButtons.length - 1])
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })
})

describe('TodoFormPage — EventDetail (place/url/memo)', () => {
  const baseTodo = {
    uuid: 'todo-1',
    name: '장보기',
    is_current: true,
    event_time: { time_type: 'at' as const, timestamp: 1743375600 },
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  it('편집 모드 진입 시 EventDetail이 입력 필드에 채워진다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(baseTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({
      place: '강남역', url: 'https://example.com', memo: '구매 목록 확인',
    })

    // when
    renderEdit('todo-1')

    // then
    await waitFor(() => {
      expect(screen.getByLabelText('장소')).toHaveValue('강남역')
      expect(screen.getByLabelText('URL')).toHaveValue('https://example.com')
      expect(screen.getByLabelText('메모')).toHaveValue('구매 목록 확인')
    })
  })

  it('EventDetail API가 실패해도 폼은 정상 렌더되고 기본 정보가 표시된다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(baseTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockRejectedValue(new Error('network error'))

    // when
    renderEdit('todo-1')

    // then: 폼이 정상 렌더되고 이름 필드에 기존 값이 표시됨
    await waitFor(() => {
      expect(screen.getByDisplayValue('장보기')).toBeInTheDocument()
    })
    // detail 필드는 빈 값으로 폴백
    expect(screen.getByLabelText('장소')).toHaveValue('')
    expect(screen.getByLabelText('URL')).toHaveValue('')
    expect(screen.getByLabelText('메모')).toHaveValue('')
  })

  it('신규 생성 시 place/url/memo 입력 후 저장하면 화면을 닫는다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.createTodo).mockResolvedValue({
      uuid: 'new-1', name: '마트 가기', is_current: true,
    } as any)
    vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})

    // when
    renderCreate()
    await userEvent.type(screen.getByLabelText('이름'), '마트 가기')
    await userEvent.type(screen.getByLabelText('장소'), '이마트')
    await userEvent.type(screen.getByLabelText('URL'), 'https://emart.com')
    await userEvent.type(screen.getByLabelText('메모'), '우유, 빵 구매')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then: 저장 후 화면을 닫음
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('수정 시 place/url/memo 입력 후 저장하면 화면을 닫는다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(baseTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    vi.mocked(todoApi.updateTodo).mockResolvedValue({ ...baseTodo, name: '장보기 수정' } as any)
    vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})

    // when
    renderEdit('todo-1')
    await waitFor(() => screen.getByDisplayValue('장보기'))
    await userEvent.clear(screen.getByLabelText('장소'))
    await userEvent.type(screen.getByLabelText('장소'), '홈플러스')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('detail 저장이 실패해도 기본 저장은 성공하고 에러 toast가 표시된다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.createTodo).mockResolvedValue({
      uuid: 'new-2', name: '테스트', is_current: false,
    } as any)
    vi.mocked(eventDetailApi.updateEventDetail).mockRejectedValue(new Error('server error'))

    // when
    renderCreate()
    await userEvent.type(screen.getByLabelText('이름'), '테스트')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then: 기본 저장은 성공 → 화면을 닫고, detail 실패 toast가 표시됨
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('추가 정보 저장 실패')).toBeInTheDocument())
  })
})

describe('TodoFormPage — repeating todo with all scope', () => {
  const repeatingTodo = {
    uuid: 'todo-repeat-1',
    name: '주간 회의',
    is_current: true,
    repeating: {
      start: 1743375600,
      option: {
        optionType: 'every_week' as const,
        interval: 1,
        dayOfWeek: [1, 3, 5],
        timeZone: 'UTC',
      },
    },
    repeating_turn: 5,
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  it('반복 todo 수정 시 저장하면 RepeatingScopeDialog가 표시된다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(repeatingTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({})

    // when
    renderEdit('todo-repeat-1')
    await waitFor(() => screen.getByDisplayValue('주간 회의'))
    await userEvent.clear(screen.getByLabelText('이름'))
    await userEvent.type(screen.getByLabelText('이름'), '주간 회의 수정')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then: RepeatingScopeDialog가 표시됨
    await waitFor(() => expect(screen.getByText('반복 할일 수정')).toBeInTheDocument())
  })

  it('반복 todo 수정 시 "모든 이벤트" 옵션이 노출된다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(repeatingTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({})

    // when
    renderEdit('todo-repeat-1')
    await waitFor(() => screen.getByDisplayValue('주간 회의'))
    await userEvent.clear(screen.getByLabelText('이름'))
    await userEvent.type(screen.getByLabelText('이름'), '주간 회의 수정')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => screen.getByText('반복 할일 수정'))

    // then: "모든 이벤트" 버튼이 보임
    expect(screen.getByText('모든 이벤트')).toBeInTheDocument()
  })

  it('반복 todo를 "반복 전체" scope로 수정하면 시리즈 전체가 업데이트되고 화면이 닫힌다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(repeatingTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({})
    vi.mocked(todoApi.updateTodo).mockResolvedValue({
      ...repeatingTodo,
      name: '주간 회의 수정',
    } as any)
    vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})

    // when
    renderEdit('todo-repeat-1')
    await waitFor(() => screen.getByDisplayValue('주간 회의'))
    await userEvent.clear(screen.getByLabelText('이름'))
    await userEvent.type(screen.getByLabelText('이름'), '주간 회의 수정')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => screen.getByText('반복 할일 수정'))
    await userEvent.click(screen.getByText('모든 이벤트'))

    // then: navigate가 호출되어 화면을 닫음
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })
})
