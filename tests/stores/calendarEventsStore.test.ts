import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodos: vi.fn() },
}))

vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn() },
}))

const MARCH31_TIMESTAMP = 1743375600
const MARCH31_KEY = '2025-03-31'

describe('calendarEventsStore — fetchEventsForYear', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
    vi.clearAllMocks()
  })

  it('년도를 조회하면 해당 년도 이벤트가 날짜별로 저장된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([
      { uuid: 'sch-1', name: 'Meeting', event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])

    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY)
    expect(events?.some(e => e.event.uuid === 'todo-1')).toBe(true)
    expect(events?.some(e => e.event.uuid === 'sch-1')).toBe(true)
    expect(useCalendarEventsStore.getState().loadedYears.has(2025)).toBe(true)
  })

  it('이미 조회한 년도는 다시 API 호출하지 않는다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    vi.mocked(todoApi.getTodos).mockClear()
    vi.mocked(scheduleApi.getSchedules).mockClear()
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    expect(todoApi.getTodos).not.toHaveBeenCalled()
    expect(scheduleApi.getSchedules).not.toHaveBeenCalled()
  })

  it('다른 년도를 조회하면 기존 데이터에 병합된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-2025', name: '2025 Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    const JAN1_2026 = Math.floor(new Date(2026, 0, 1, 12, 0, 0).getTime() / 1000)
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-2026', name: '2026 Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: JAN1_2026 } },
    ])
    await useCalendarEventsStore.getState().fetchEventsForYear(2026)

    expect(useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY)?.some(e => e.event.uuid === 'todo-2025')).toBe(true)
    expect(useCalendarEventsStore.getState().eventsByDate.get('2026-01-01')?.some(e => e.event.uuid === 'todo-2026')).toBe(true)
    expect(useCalendarEventsStore.getState().loadedYears.has(2025)).toBe(true)
    expect(useCalendarEventsStore.getState().loadedYears.has(2026)).toBe(true)
  })

  it('API 실패 시 loadedYears에 추가되지 않는다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockRejectedValue(new Error('network'))
    vi.mocked(scheduleApi.getSchedules).mockRejectedValue(new Error('network'))

    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    expect(useCalendarEventsStore.getState().loadedYears.has(2025)).toBe(false)
  })
})

describe('calendarEventsStore — refreshYears', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
    vi.clearAllMocks()
  })

  it('refreshYears 호출 시 해당 년도 캐시를 무효화하고 다시 조회한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'old', name: 'Old', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'new', name: 'New', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    await useCalendarEventsStore.getState().refreshYears([2025])

    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events.some(e => e.event.uuid === 'new')).toBe(true)
    expect(events.some(e => e.event.uuid === 'old')).toBe(false)
  })
})

describe('calendarEventsStore — mutation', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
    vi.clearAllMocks()
  })

  it('addEvent를 호출하면 해당 이벤트를 날짜별 목록에서 조회할 수 있다', () => {
    const newTodo = { uuid: 'new-1', name: '새 할 일', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } }
    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: newTodo })

    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY)
    expect(events?.some(e => e.event.uuid === 'new-1')).toBe(true)
  })

  it('removeEvent를 호출하면 해당 이벤트를 더 이상 조회할 수 없다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    useCalendarEventsStore.getState().removeEvent('todo-1')

    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events.some(e => e.event.uuid === 'todo-1')).toBe(false)
  })

  it('replaceEvent를 호출하면 기존 이벤트가 새 이벤트로 교체된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: '원래 이름', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    const updated = { uuid: 'todo-1', name: '수정된 이름', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } }
    useCalendarEventsStore.getState().replaceEvent('todo-1', { type: 'todo', event: updated })

    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events.find(e => e.event.uuid === 'todo-1')?.event.name).toBe('수정된 이름')
  })

  it('reset 호출 시 초기 상태로 돌아간다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    useCalendarEventsStore.getState().reset()

    const state = useCalendarEventsStore.getState()
    expect(state.eventsByDate.size).toBe(0)
    expect(state.loadedYears.size).toBe(0)
  })
})
