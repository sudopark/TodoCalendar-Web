import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CurrentTodoList, type CurrentTodoListProps } from '../../src/components/CurrentTodoList'
import { useCurrentTodosCache } from '../../src/repositories/caches/currentTodosCache'
import { useCalendarEventsCache } from '../../src/repositories/caches/calendarEventsCache'
import { RepositoriesProvider } from '../../src/composition/RepositoriesProvider'
import type { Repositories } from '../../src/composition/container'
import type { Todo } from '../../src/models'
import type { EventRepository } from '../../src/repositories/EventRepository'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: {
    getCurrentTodos: vi.fn(),
    completeTodo: vi.fn(),
    getTodos: vi.fn().mockResolvedValue([]),
  },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedules: vi.fn().mockResolvedValue([]),
  },
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
vi.mock('../../src/firebase', () => ({
  getAuthInstance: vi.fn(() => ({})),
  db: {},
}))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))
vi.mock('../../src/api/firebaseAuthApi', () => ({ firebaseAuthApi: {} }))
vi.mock('../../src/api/eventTagApi', () => ({ eventTagApi: { getAllTags: vi.fn(async () => []) } }))
vi.mock('../../src/api/settingApi', () => ({ settingApi: {} }))
vi.mock('../../src/api/doneTodoApi', () => ({ doneTodoApi: {} }))
vi.mock('../../src/api/foremostApi', () => ({ foremostApi: {} }))
vi.mock('../../src/api/holidayApi', () => ({ holidayApi: {} }))
vi.mock('../../src/api/eventDetailApi', () => ({ eventDetailApi: {} }))

const mockOnEventClick = vi.fn()

function makeFakeEventRepo(completeTodoImpl?: (todo: Todo) => Promise<any>): EventRepository {
  return {
    completeTodo: completeTodoImpl ?? vi.fn(async () => ({ uuid: 'done', done_at: 0 })),
  } as unknown as EventRepository
}

function makeFakeRepos(eventRepo: EventRepository): Repositories {
  return {
    eventRepo,
    eventDetailRepo: {} as any,
    tagRepo: {} as any,
    holidayRepo: {} as any,
    doneTodoRepo: {} as any,
    foremostEventRepo: {} as any,
    authRepo: {} as any,
    settingsRepo: {} as any,
  }
}

function defaultProps(overrides: Partial<CurrentTodoListProps> = {}): CurrentTodoListProps {
  return {
    todos: [],
    isTagHidden: () => false,
    onEventClick: mockOnEventClick,
    ...overrides,
  }
}

function renderComponent(props: Partial<CurrentTodoListProps> = {}, eventRepo?: EventRepository) {
  const repo = eventRepo ?? makeFakeEventRepo()
  return render(
    <RepositoriesProvider value={makeFakeRepos(repo)}>
      <MemoryRouter>
        <CurrentTodoList {...defaultProps(props)} />
      </MemoryRouter>
    </RepositoriesProvider>
  )
}

describe('CurrentTodoList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnEventClick.mockReset()
  })

  it('current todo가 없으면 아무것도 렌더링하지 않는다', () => {
    // given: todos = []
    const { container } = renderComponent({ todos: [] })

    expect(container.firstChild).toBeNull()
  })

  it('current todo 목록을 표시한다', () => {
    // given: todos에 두 항목
    const todos = [
      { uuid: 'ct1', name: '시간 없는 할 일 A', is_current: true, event_time: null },
      { uuid: 'ct2', name: '시간 없는 할 일 B', is_current: true, event_time: null },
    ] as Todo[]

    renderComponent({ todos })

    expect(screen.getByText('시간 없는 할 일 A')).toBeInTheDocument()
    expect(screen.getByText('시간 없는 할 일 B')).toBeInTheDocument()
  })

  it('event_time이 있는 current todo는 시간 정보가 함께 표시된다', () => {
    // given: event_time(at)이 있는 todo (KST 오후 2:30 = UTC timestamp 1710480600)
    const todo: Todo = {
      uuid: 'ct-at',
      name: '시간 있는 현재 할 일',
      is_current: true,
      event_time: { time_type: 'at', timestamp: 1710480600 },
    } as unknown as Todo

    // when: 렌더링
    renderComponent({ todos: [todo] })

    // then: 할 일 이름과 시간 텍스트가 모두 표시된다
    expect(screen.getByText('시간 있는 현재 할 일')).toBeInTheDocument()
    expect(screen.getByText(/오후 2:30/)).toBeInTheDocument()
  })

  it('event_time이 null인 current todo는 시간 정보가 표시되지 않는다', () => {
    // given: event_time이 null인 todo
    const todo: Todo = {
      uuid: 'ct-notime',
      name: '시간 없는 현재 할 일',
      is_current: true,
      event_time: null,
    } as Todo

    // when: 렌더링
    renderComponent({ todos: [todo] })

    // then: 할 일 이름은 표시되지만, 시간 관련 텍스트(오전/오후)는 없다
    expect(screen.getByText('시간 없는 현재 할 일')).toBeInTheDocument()
    expect(screen.queryByText(/오전|오후/)).not.toBeInTheDocument()
  })

  it('event_time이 period 타입이면 시작~종료 시간 범위가 표시된다', () => {
    // given: period 타입 event_time (KST 오후 2:30 ~ 오후 4:30)
    const todo: Todo = {
      uuid: 'ct-period',
      name: '구간 시간 현재 할 일',
      is_current: true,
      event_time: {
        time_type: 'period',
        period_start: 1710480600,
        period_end: 1710487800,
      },
    } as unknown as Todo

    // when: 렌더링
    renderComponent({ todos: [todo] })

    // then: 시간 범위가 표시된다
    expect(screen.getByText(/오후 2:30 – 오후 4:30/)).toBeInTheDocument()
  })

  it('항목을 클릭하면 onEventClick 콜백을 calEvent와 anchorRect와 함께 호출한다', async () => {
    // given: todo 1개, onEventClick mock
    const todos = [{ uuid: 'ct-nav', name: '이동 테스트', is_current: true, event_time: null }] as Todo[]

    renderComponent({ todos })
    await userEvent.click(screen.getByText('이동 테스트'))

    expect(mockOnEventClick).toHaveBeenCalledOnce()
    const [calEvent] = mockOnEventClick.mock.calls[0]
    expect(calEvent.type).toBe('todo')
    expect(calEvent.event.uuid).toBe('ct-nav')
  })
})

describe('CurrentTodoList — 완료', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCurrentTodosCache.setState({ todos: [] })
    useCalendarEventsCache.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
  })

  it('비반복 Todo 체크박스 클릭 시 eventRepo.completeTodo 완료 후 해당 Todo가 목록에서 사라진다', async () => {
    // given: todo가 currentTodosCache에 있는 상태, fake eventRepo가 removeTodo를 실행
    const todo = { uuid: 't1', name: '완료 할 일', is_current: true, event_time: null } as Todo
    useCurrentTodosCache.setState({ todos: [todo] })

    const fakeEventRepo = makeFakeEventRepo(async (t) => {
      useCurrentTodosCache.getState().removeTodo(t.uuid)
      return { uuid: 'done-1', done_at: 1000 }
    })

    render(
      <RepositoriesProvider value={makeFakeRepos(fakeEventRepo)}>
        <MemoryRouter>
          <CurrentTodoList todos={[todo]} isTagHidden={() => false} />
        </MemoryRouter>
      </RepositoriesProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: '완료 할 일' }))

    await waitFor(() => {
      expect(useCurrentTodosCache.getState().todos.some(t => t.uuid === 't1')).toBe(false)
    })
  })

  it('반복 Todo 체크박스 클릭 시 에러 없이 처리된다', async () => {
    // given: 반복 todo
    const repeatingTodo = {
      uuid: 't2',
      name: '반복 할 일',
      is_current: true,
      event_time: { time_type: 'at' as const, timestamp: 1743375600 },
      repeating: { start: 1743375600, option: { optionType: 'every_day' as const, interval: 1 } },
    } as unknown as Todo

    render(
      <RepositoriesProvider value={makeFakeRepos(makeFakeEventRepo())}>
        <MemoryRouter>
          <CurrentTodoList todos={[repeatingTodo]} isTagHidden={() => false} />
        </MemoryRouter>
      </RepositoriesProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: '반복 할 일' }))

    // 반복 Todo 완료 후 에러 없이 처리됨을 확인
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  it('반복 Todo 체크박스 클릭 시 RepeatingScopeDialog가 표시되지 않는다', async () => {
    // given: 반복 todo (사용자에게 차수 선택을 묻지 않아야 함)
    const repeatingTodo = {
      uuid: 't3',
      name: '매일 반복',
      is_current: true,
      event_time: { time_type: 'at' as const, timestamp: 1743375600 },
      repeating: { start: 1743375600, option: { optionType: 'every_day' as const, interval: 1 } },
    } as unknown as Todo
    useCalendarEventsCache.setState({ eventsByDate: new Map(), loading: false, lastRange: { lower: 0, upper: 9999999999 } } as any)

    render(
      <RepositoriesProvider value={makeFakeRepos(makeFakeEventRepo())}>
        <MemoryRouter>
          <CurrentTodoList todos={[repeatingTodo]} isTagHidden={() => false} />
        </MemoryRouter>
      </RepositoriesProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: '매일 반복' }))

    // then: 반복 차수 선택 다이얼로그(RepeatingScopeDialog)가 화면에 뜨지 않아야 한다
    await waitFor(() => {
      expect(screen.queryByTestId('repeating-scope-dialog')).toBeNull()
    })
  })
})
