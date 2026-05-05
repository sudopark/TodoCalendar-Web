import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { UncompletedTodoList, type UncompletedTodoListProps } from '../../src/components/UncompletedTodoList'
import { RepositoriesProvider } from '../../src/composition/RepositoriesProvider'
import type { Repositories } from '../../src/composition/container'
import type { EventRepository } from '../../src/repositories/EventRepository'
import type { Todo } from '../../src/models'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: {
    completeTodo: vi.fn(),
    patchTodo: vi.fn(),
    getTodos: vi.fn().mockResolvedValue([]),
  },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn().mockResolvedValue([]) },
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
vi.mock('../../src/repositories/caches/uncompletedTodosCache', () => ({
  useUncompletedTodosCache: {
    getState: vi.fn(() => ({ removeTodo: vi.fn(), fetch: vi.fn().mockResolvedValue(undefined) })),
  },
}))
vi.mock('../../src/repositories/caches/currentTodosCache', () => ({
  useCurrentTodosCache: {
    getState: vi.fn(() => ({ fetch: vi.fn().mockResolvedValue(undefined) })),
  },
}))
vi.mock('../../src/repositories/caches/calendarEventsCache', () => ({
  useCalendarEventsCache: {
    getState: vi.fn(() => ({ removeEvent: vi.fn(), eventsByDate: new Map() })),
  },
}))
vi.mock('../../src/firebase', () => ({
  getAuthInstance: vi.fn(() => ({})),
  db: {},
}))

const mockOnReload = vi.fn()
const mockOnEventClick = vi.fn()

function makeFakeRepos(): Repositories {
  return {
    eventRepo: { completeTodo: vi.fn(async () => ({ uuid: 'done', done_at: 0 })) } as unknown as EventRepository,
    eventDetailRepo: {} as any,
    tagRepo: {} as any,
    holidayRepo: {} as any,
    doneTodoRepo: {} as any,
    foremostEventRepo: {} as any,
    authRepo: {} as any,
    settingsRepo: {} as any,
  }
}

function defaultProps(overrides: Partial<UncompletedTodoListProps> = {}): UncompletedTodoListProps {
  return {
    todos: [],
    isTagHidden: () => false,
    onReload: mockOnReload,
    onEventClick: mockOnEventClick,
    ...overrides,
  }
}

function renderComponent(props: Partial<UncompletedTodoListProps> = {}) {
  return render(
    <RepositoriesProvider value={makeFakeRepos()}>
      <MemoryRouter>
        <UncompletedTodoList {...defaultProps(props)} />
      </MemoryRouter>
    </RepositoriesProvider>
  )
}

const sampleTodos: Todo[] = [
  { uuid: 'u1', name: '미완료 할 일 A', is_current: false, event_time: null } as Todo,
  { uuid: 'u2', name: '미완료 할 일 B', is_current: false, event_time: null } as Todo,
]

describe('UncompletedTodoList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnReload.mockReset()
    mockOnEventClick.mockReset()
  })

  it('todos가 비어있을 때 → 렌더 시 → 섹션이 렌더되지 않는다', () => {
    // given: todos = []
    const { container } = renderComponent({ todos: [] })

    // then
    expect(container.firstChild).toBeNull()
  })

  it('todos가 있을 때 → 렌더 시 → 새로고침 버튼이 보인다', () => {
    // given: todos에 항목이 있음
    renderComponent({ todos: sampleTodos })

    // then
    expect(screen.getByRole('button', { name: 'refresh' })).toBeInTheDocument()
  })

  it('onReload가 진행 중일 때 → 새로고침 클릭 직후 → 버튼이 aria-busy=true 이고 disabled 이다', async () => {
    // given: onReload는 수동으로 resolve할 수 있는 promise
    let resolve!: () => void
    const controlledReload = () => new Promise<void>(r => { resolve = r })
    mockOnReload.mockImplementation(controlledReload)
    renderComponent({ todos: sampleTodos })
    const button = screen.getByRole('button', { name: 'refresh' })

    // when: 새로고침 버튼 클릭 (resolve 전)
    await userEvent.click(button)

    // then: 로딩 중 상태
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()

    // cleanup: promise resolve
    act(() => { resolve() })
  })

  it('onReload가 resolve된 후 → 완료 대기 → 버튼이 다시 활성화되고 aria-busy=false 이다', async () => {
    // given: onReload를 수동 제어
    let resolve!: () => void
    const controlledReload = () => new Promise<void>(r => { resolve = r })
    mockOnReload.mockImplementation(controlledReload)
    renderComponent({ todos: sampleTodos })
    const button = screen.getByRole('button', { name: 'refresh' })

    // when: 클릭 후 resolve
    await userEvent.click(button)
    act(() => { resolve() })

    // then: 로딩 해제
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-busy', 'false')
      expect(button).not.toBeDisabled()
    })
  })
})

describe('UncompletedTodoList — 시간 표시', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('event_time이 있는 미완료 todo는 시간 정보가 함께 표시된다', () => {
    // given: event_time이 있는 todo (KST 오후 2:30 = UTC timestamp 1710480600)
    const todo: Todo = {
      uuid: 'ut1',
      name: '시간 있는 할 일',
      is_current: false,
      event_time: { time_type: 'at', timestamp: 1710480600 },
    }

    // when: 렌더링
    renderComponent({ todos: [todo] })

    // then: 할 일 이름과 시간 텍스트가 모두 표시된다
    expect(screen.getByText('시간 있는 할 일')).toBeInTheDocument()
    expect(screen.getByText(/오후 2:30/)).toBeInTheDocument()
  })

  it('event_time이 null인 미완료 todo는 시간 정보가 표시되지 않는다', () => {
    // given: event_time이 null인 todo
    const todo: Todo = {
      uuid: 'ut2',
      name: '시간 없는 할 일',
      is_current: false,
      event_time: null,
    }

    // when: 렌더링
    renderComponent({ todos: [todo] })

    // then: 할 일 이름은 표시되지만, 시간 관련 텍스트(오전/오후)는 없다
    expect(screen.getByText('시간 없는 할 일')).toBeInTheDocument()
    expect(screen.queryByText(/오전|오후/)).not.toBeInTheDocument()
  })

  it('event_time이 period 타입이면 시작~종료 시간 범위가 표시된다', () => {
    // given: period 타입 event_time (KST 오후 2:30 ~ 오후 4:30)
    const todo: Todo = {
      uuid: 'ut3',
      name: '구간 시간 할 일',
      is_current: false,
      event_time: {
        time_type: 'period',
        period_start: 1710480600,
        period_end: 1710487800,
      },
    }

    // when: 렌더링
    renderComponent({ todos: [todo] })

    // then: 시간 범위가 표시된다
    expect(screen.getByText(/오후 2:30 – 오후 4:30/)).toBeInTheDocument()
  })
})
