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

  it('동일 년도 동시 호출 시 중복 저장되지 않는다 (StrictMode 대응 #76)', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 't1', name: 'A', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])

    // StrictMode useEffect double-invocation을 시뮬레이션 — 두 호출 모두 loadedYears 등록 전에 시작
    await Promise.all([
      useCalendarEventsStore.getState().fetchEventsForYear(2025),
      useCalendarEventsStore.getState().fetchEventsForYear(2025),
    ])

    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events).toHaveLength(1)
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

  it('년도 경계를 넘는 multi-day 이벤트가 새로고침 시 중복되지 않는다 (#76)', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    // 2025-12-31 ~ 2026-01-02 까지 걸친 schedule
    const crossYear = {
      uuid: 'cross',
      name: 'Cross-year',
      event_time: {
        time_type: 'period' as const,
        period_start: Math.floor(new Date(2025, 11, 31, 10, 0).getTime() / 1000),
        period_end: Math.floor(new Date(2026, 0, 2, 18, 0).getTime() / 1000),
      },
    }
    vi.mocked(todoApi.getTodos).mockResolvedValue([])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([crossYear])

    // 양쪽 년도를 모두 로드한 상태
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)
    await useCalendarEventsStore.getState().fetchEventsForYear(2026)
    expect(useCalendarEventsStore.getState().eventsByDate.get('2025-12-31')).toHaveLength(1)
    expect(useCalendarEventsStore.getState().eventsByDate.get('2026-01-01')).toHaveLength(1)
    expect(useCalendarEventsStore.getState().eventsByDate.get('2026-01-02')).toHaveLength(1)

    // 새로고침해도 동일 이벤트가 한 번씩만 노출되어야 함
    await useCalendarEventsStore.getState().refreshYears([2026])

    expect(useCalendarEventsStore.getState().eventsByDate.get('2025-12-31')).toHaveLength(1)
    expect(useCalendarEventsStore.getState().eventsByDate.get('2026-01-01')).toHaveLength(1)
    expect(useCalendarEventsStore.getState().eventsByDate.get('2026-01-02')).toHaveLength(1)
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

  // 이슈 #60 회귀 방지: 매일 반복 schedule이 매일 표시되는지 검증
  it('매일 반복 schedule이 해당 년도의 모든 날짜에 표시된다 (issue #60)', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')

    // given: 2025-03-31 10:00부터 매일 반복되는 schedule
    const startTs = Math.floor(new Date(2025, 2, 31, 10, 0, 0).getTime() / 1000)
    vi.mocked(todoApi.getTodos).mockResolvedValue([])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([
      {
        uuid: 'daily-meeting',
        name: '매일 10시 미팅',
        event_time: { time_type: 'at' as const, timestamp: startTs },
        repeating: {
          start: startTs,
          option: { optionType: 'every_day', interval: 1 },
        },
      },
    ])

    // when: 2025년 조회
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // then: 3/31뿐만 아니라 이후 모든 날짜에도 표시
    const state = useCalendarEventsStore.getState()
    expect(state.eventsByDate.get('2025-03-31')?.some(e => e.event.uuid === 'daily-meeting')).toBe(true)
    expect(state.eventsByDate.get('2025-04-01')?.some(e => e.event.uuid === 'daily-meeting')).toBe(true)
    expect(state.eventsByDate.get('2025-04-15')?.some(e => e.event.uuid === 'daily-meeting')).toBe(true)
    expect(state.eventsByDate.get('2025-12-31')?.some(e => e.event.uuid === 'daily-meeting')).toBe(true)
  })

  it('매주 반복 schedule이 해당 년도의 모든 해당 요일에 표시된다 (issue #60)', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')

    // given: 2025-04-07 월요일 매주 월요일 반복
    const startTs = Math.floor(new Date(2025, 3, 7, 10, 0, 0).getTime() / 1000)
    vi.mocked(todoApi.getTodos).mockResolvedValue([])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([
      {
        uuid: 'weekly',
        name: '매주 월요일',
        event_time: { time_type: 'at' as const, timestamp: startTs },
        repeating: {
          start: startTs,
          option: { optionType: 'every_week', interval: 1, dayOfWeek: [1], timeZone: 'Asia/Seoul' },
        },
      },
    ])

    // when
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // then: 4/7, 4/14, 4/21, 4/28 모두 표시
    const state = useCalendarEventsStore.getState()
    expect(state.eventsByDate.get('2025-04-07')?.some(e => e.event.uuid === 'weekly')).toBe(true)
    expect(state.eventsByDate.get('2025-04-14')?.some(e => e.event.uuid === 'weekly')).toBe(true)
    expect(state.eventsByDate.get('2025-04-21')?.some(e => e.event.uuid === 'weekly')).toBe(true)
    expect(state.eventsByDate.get('2025-04-28')?.some(e => e.event.uuid === 'weekly')).toBe(true)
    // 화요일/수요일 등에는 없어야 함
    expect(state.eventsByDate.get('2025-04-08')?.some(e => e.event.uuid === 'weekly')).toBeFalsy()
  })

  it('반복 이벤트 각 인스턴스는 show_turns가 해당 턴으로 설정된다 (issue #60)', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')

    // given: 매일 반복, 2025-04-01 시작
    const startTs = Math.floor(new Date(2025, 3, 1, 10, 0, 0).getTime() / 1000)
    vi.mocked(todoApi.getTodos).mockResolvedValue([])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([
      {
        uuid: 'daily',
        name: 'Daily',
        event_time: { time_type: 'at' as const, timestamp: startTs },
        repeating: {
          start: startTs,
          option: { optionType: 'every_day', interval: 1 },
        },
      },
    ])

    // when
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // then: 각 인스턴스가 해당 턴 번호를 가진다
    const state = useCalendarEventsStore.getState()
    const apr01 = state.eventsByDate.get('2025-04-01')?.find(e => e.event.uuid === 'daily')
    const apr02 = state.eventsByDate.get('2025-04-02')?.find(e => e.event.uuid === 'daily')
    const apr03 = state.eventsByDate.get('2025-04-03')?.find(e => e.event.uuid === 'daily')
    expect((apr01?.event as import('../../src/models/Schedule').Schedule).show_turns).toEqual([1])
    expect((apr02?.event as import('../../src/models/Schedule').Schedule).show_turns).toEqual([2])
    expect((apr03?.event as import('../../src/models/Schedule').Schedule).show_turns).toEqual([3])
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
