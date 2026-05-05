import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { UncompletedTodoList, type UncompletedTodoListProps } from '../../src/components/UncompletedTodoList'
import type { Todo } from '../../src/models'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: {
    completeTodo: vi.fn(),
    patchTodo: vi.fn(),
    getTodos: vi.fn().mockResolvedValue([]),
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

const mockOnReload = vi.fn()
const mockOnEventClick = vi.fn()

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
    <MemoryRouter>
      <UncompletedTodoList {...defaultProps(props)} />
    </MemoryRouter>
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
