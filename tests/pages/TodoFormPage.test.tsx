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

  it('편집 모드 진입 후 변경 없이 저장 버튼은 비활성이다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(baseTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })

    // when
    renderEdit('todo-1')
    await waitFor(() => expect(screen.getByDisplayValue('장보기')).toBeInTheDocument())

    // then: 변경 없으면 저장 버튼 비활성
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('편집 모드에서 이름을 변경하면 저장 버튼이 활성화된다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(baseTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    renderEdit('todo-1')
    await waitFor(() => screen.getByDisplayValue('장보기'))

    // when
    await userEvent.type(screen.getByLabelText('이름'), ' 수정')

    // then: 변경 후 저장 버튼 활성
    expect(screen.getByRole('button', { name: '저장' })).not.toBeDisabled()
  })

  it('저장 중에는 저장 버튼이 비활성이다', async () => {
    // given: updateTodo가 pending 상태
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(baseTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    let resolveUpdate!: (v: any) => void
    vi.mocked(todoApi.updateTodo).mockImplementation(
      () => new Promise(r => { resolveUpdate = r })
    )
    vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})
    renderEdit('todo-1')
    await waitFor(() => screen.getByDisplayValue('장보기'))
    await userEvent.type(screen.getByLabelText('이름'), ' 수정')

    // when: 저장 클릭 (updateTodo는 pending 상태)
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then: 저장 중에는 버튼 비활성
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()

    // cleanup
    resolveUpdate({ ...baseTodo, name: '장보기 수정' })
  })

  it('신규 모드에서 이름 입력 후 저장 버튼이 활성화된다', async () => {
    // given
    renderCreate()

    // when
    await userEvent.type(screen.getByLabelText('이름'), '새 할 일')

    // then: 신규 모드에서 이름만 있으면 저장 가능
    expect(screen.getByRole('button', { name: '저장' })).not.toBeDisabled()
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

describe('TodoFormPage — dirty close confirm', () => {
  const baseTodo = {
    uuid: 'todo-1',
    name: '할 일',
    is_current: true,
    event_time: null,
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  it('변경 없이 취소 버튼을 누르면 바로 이전 화면으로 돌아간다', async () => {
    // given: 기존 todo 로드 완료
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(baseTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    renderEdit('todo-1')
    await waitFor(() => expect(screen.getByDisplayValue('할 일')).toBeInTheDocument())

    // when: 변경 없이 취소 버튼 클릭
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then: 바로 이전 화면으로 이동
    expect(mockNavigate).toHaveBeenCalled()
  })

  it('변경 후 취소 버튼을 누르면 확인 다이얼로그가 표시된다', async () => {
    // given: 기존 todo 로드 완료
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(baseTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    renderEdit('todo-1')
    await waitFor(() => expect(screen.getByDisplayValue('할 일')).toBeInTheDocument())

    // when: 이름 변경 후 취소 버튼 클릭
    await userEvent.type(screen.getByLabelText('이름'), ' 수정')
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then: 확인 다이얼로그 표시
    expect(screen.getByText('변경사항이 저장되지 않았어요')).toBeInTheDocument()
    expect(screen.getByText('지금 닫으면 변경사항이 사라져요. 계속하시겠어요?')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('확인 다이얼로그에서 "떠나기"를 누르면 이전 화면으로 돌아간다', async () => {
    // given: 변경 후 취소 → 다이얼로그 표시
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue(baseTodo as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    renderEdit('todo-1')
    await waitFor(() => expect(screen.getByDisplayValue('할 일')).toBeInTheDocument())
    await userEvent.type(screen.getByLabelText('이름'), ' 수정')
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // when: "떠나기" 버튼 클릭
    await userEvent.click(screen.getByRole('button', { name: '떠나기' }))

    // then: 이전 화면으로 이동
    expect(mockNavigate).toHaveBeenCalled()
  })

  it('더보기 > 복제 클릭 시 신규 Form으로 이동한다', async () => {
    // given: 편집 모드 로드
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockResolvedValue({ ...baseTodo, name: '할 일' } as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '강남역', url: '', memo: '' })
    renderEdit('todo-1')
    await waitFor(() => screen.getByDisplayValue('할 일'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '더보기' }))
    await userEvent.click(screen.getByRole('menuitem', { name: '복제' }))

    // then: navigate가 호출됨 (인자 세부 검증은 금지 패턴)
    expect(mockNavigate).toHaveBeenCalled()
  })
})

describe('TodoFormPage — prefilled 신규 모드', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  function renderCreateWithPrefilled(prefilled: Record<string, unknown>) {
    return render(
      <MemoryRouter initialEntries={[{ pathname: '/todos/new', state: { prefilled } }]}>
        <Routes><Route path="/todos/new" element={<TodoFormPage />} /></Routes>
        <ToastContainer />
      </MemoryRouter>
    )
  }

  it('신규 모드에서 prefilled state가 있으면 해당 값으로 초기화된다', () => {
    // given
    const prefilled = {
      name: '복제된 할 일',
      place: '강남역',
      url: '',
      memo: '메모',
      tagId: null,
      eventTime: null,
      repeating: null,
      notifications: [],
    }

    // when
    renderCreateWithPrefilled(prefilled)

    // then
    expect(screen.getByDisplayValue('복제된 할 일')).toBeInTheDocument()
    expect(screen.getByLabelText('장소')).toHaveValue('강남역')
    expect(screen.getByLabelText('메모')).toHaveValue('메모')
  })
})

describe('TodoFormPage — entry UX', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  it('id가 있고 API 응답이 오기 전에도 저장 버튼을 포함한 Form 레이아웃이 즉시 렌더된다', async () => {
    // given: getTodo와 getEventDetail이 영원히 pending (진입 직후 상태)
    const { todoApi } = await import('../../src/api/todoApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(todoApi.getTodo).mockReturnValue(new Promise(() => {}))
    vi.mocked(eventDetailApi.getEventDetail).mockReturnValue(new Promise(() => {}))

    // when
    renderEdit('abc')

    // then: 중앙 스피너만 보이는 게 아니라 Form 상단의 저장 버튼이 즉시 존재
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
  })
})
