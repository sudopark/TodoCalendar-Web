import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { RepositoriesProvider } from '../../../src/composition/RepositoriesProvider'
import { useScheduleFormViewModel } from '../../../src/pages/ScheduleForm/useScheduleFormViewModel'
import type { EventRepository } from '../../../src/repositories/EventRepository'
import type { EventDetailRepository } from '../../../src/repositories/EventDetailRepository'
import type { Repositories } from '../../../src/composition/container'
import type { Schedule } from '../../../src/models/Schedule'
import type { EventDetail } from '../../../src/models/EventDetail'

// ── 캐시 / api 부수 초기화 차단 ─────────────────────────────────────
vi.mock('../../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../../src/api/scheduleApi', () => ({ scheduleApi: {} }))
vi.mock('../../../src/api/eventDetailApi', () => ({ eventDetailApi: {} }))
vi.mock('../../../src/api/settingApi', () => ({ settingApi: {} }))
vi.mock('../../../src/api/eventTagApi', () => ({ eventTagApi: {} }))
vi.mock('../../../src/api/doneTodoApi', () => ({ doneTodoApi: {} }))
vi.mock('../../../src/api/foremostApi', () => ({ foremostApi: {} }))
vi.mock('../../../src/api/holidayApi', () => ({ holidayApi: {} }))
vi.mock('../../../src/api/firebaseAuthApi', () => ({ firebaseAuthApi: {} }))
vi.mock('../../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))

// ── i18n stub (settingsCache 가 import 하는 의존) ────────────────────
vi.mock('../../../src/i18n', () => ({ default: { language: 'ko', on: vi.fn() } }))

// ── settingsCache: 기본값 stub ────────────────────────────────────────
interface SettingsCacheState {
  eventDefaults: { defaultTagId: string | null; defaultNotificationSeconds: number | null; defaultAllDayNotificationSeconds: number | null }
}
const settingsCacheState: SettingsCacheState = { eventDefaults: { defaultTagId: null, defaultNotificationSeconds: null, defaultAllDayNotificationSeconds: null } }
vi.mock('../../../src/repositories/caches/settingsCache', () => {
  const hook = (sel: (s: SettingsCacheState) => unknown) => sel(settingsCacheState)
  hook.getState = () => settingsCacheState
  return { useSettingsCache: hook }
})

// ── Fake Repositories ─────────────────────────────────────────────────

function makeSchedule(override: Partial<Schedule> & { uuid: string }): Schedule {
  return {
    uuid: override.uuid,
    name: override.name ?? '일정',
    event_time: override.event_time ?? { time_type: 'at', timestamp: 1743375600 },
    ...override,
  }
}

function createFakeEventRepo(schedules: Map<string, Schedule> = new Map()): Pick<EventRepository,
  'getSchedule' | 'createSchedule' | 'updateSchedule' | 'deleteSchedule' | 'excludeScheduleRepeating'
> {
  return {
    getSchedule: vi.fn(async (id: string) => {
      const s = schedules.get(id)
      if (!s) throw new Error(`schedule not found: ${id}`)
      return s
    }),
    createSchedule: vi.fn(async (input) => {
      const created = makeSchedule({ uuid: 'created-1', name: input.name, event_time: input.event_time })
      schedules.set(created.uuid, created)
      return created
    }),
    updateSchedule: vi.fn(async (id: string) => {
      const existing = schedules.get(id) ?? makeSchedule({ uuid: id })
      const updated = { ...existing }
      schedules.set(id, updated)
      return updated
    }),
    deleteSchedule: vi.fn(async () => {}),
    excludeScheduleRepeating: vi.fn(async (id: string) => {
      return schedules.get(id) ?? makeSchedule({ uuid: id })
    }),
  }
}

function createFakeDetailRepo(details: Map<string, EventDetail> = new Map()): Pick<EventDetailRepository,
  'get' | 'save' | 'invalidate'
> {
  return {
    get: vi.fn(async (id: string) => details.get(id) ?? null),
    save: vi.fn(async (id: string, detail: EventDetail) => {
      details.set(id, detail)
      return detail
    }),
    invalidate: vi.fn(),
  }
}

function createFakeRepos(
  schedules?: Map<string, Schedule>,
  details?: Map<string, EventDetail>,
): Repositories {
  return {
    eventRepo: createFakeEventRepo(schedules) as unknown as EventRepository,
    eventDetailRepo: createFakeDetailRepo(details) as unknown as EventDetailRepository,
    tagRepo: {} as unknown as Repositories['tagRepo'],
    holidayRepo: {} as unknown as Repositories['holidayRepo'],
    doneTodoRepo: {} as unknown as Repositories['doneTodoRepo'],
    foremostEventRepo: {} as unknown as Repositories['foremostEventRepo'],
    authRepo: {} as unknown as Repositories['authRepo'],
    settingsRepo: {} as unknown as Repositories['settingsRepo'],
  }
}

function wrap(repos: Repositories) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <RepositoriesProvider value={repos}>{children}</RepositoriesProvider>
  }
}

// ── 테스트 ────────────────────────────────────────────────────────────

describe('useScheduleFormViewModel — 신규 생성', () => {
  let repos: Repositories

  beforeEach(() => {
    repos = createFakeRepos()
  })

  it('빈 이름으로 저장하면 errorKey 에 invalid_name 키가 세팅된다', async () => {
    // given
    const { result } = renderHook(() => useScheduleFormViewModel(undefined), { wrapper: wrap(repos) })

    // when
    act(() => result.current.setName(''))
    await act(async () => { await result.current.save() })

    // then
    expect(result.current.errorKey).toBe('error.eventSave.invalid_name')
    expect(result.current.successKey).toBeNull()
  })

  it('eventTime 이 null 이면 errorKey 에 invalid_time 키가 세팅된다', async () => {
    // given
    const { result } = renderHook(() => useScheduleFormViewModel(undefined), { wrapper: wrap(repos) })

    // when
    act(() => {
      result.current.setName('새 일정')
      result.current.setEventTime(null)
    })
    await act(async () => { await result.current.save() })

    // then
    expect(result.current.errorKey).toBe('error.eventSave.invalid_time')
    expect(result.current.successKey).toBeNull()
  })

  it('유효한 이름과 eventTime 으로 저장하면 successKey 에 event.created.schedule 이 세팅된다', async () => {
    // given
    const { result } = renderHook(
      () => useScheduleFormViewModel(undefined, undefined, new Date('2025-03-31')),
      { wrapper: wrap(repos) },
    )

    // when
    act(() => result.current.setName('새 일정'))
    await act(async () => { await result.current.save() })

    // then
    expect(result.current.successKey).toBe('event.created.schedule')
    expect(result.current.errorKey).toBeNull()
  })

  it('저장 중에는 saving 이 true 이다', async () => {
    // given: createSchedule 이 pending 인 경우
    let resolveCreate!: (v: Schedule) => void
    const pendingRepos = createFakeRepos()
    vi.mocked(pendingRepos.eventRepo.createSchedule).mockImplementation(
      () => new Promise(r => { resolveCreate = r }),
    )
    const { result } = renderHook(
      () => useScheduleFormViewModel(undefined, undefined, new Date('2025-03-31')),
      { wrapper: wrap(pendingRepos) },
    )
    act(() => result.current.setName('테스트'))

    // when
    act(() => { result.current.save() })

    // then: saving 상태
    await waitFor(() => expect(result.current.saving).toBe(true))

    // cleanup
    act(() => resolveCreate(makeSchedule({ uuid: 'x' })))
  })

  it('dismissMessage 호출 후 successKey/errorKey 가 null 로 초기화된다', async () => {
    // given
    const { result } = renderHook(
      () => useScheduleFormViewModel(undefined, undefined, new Date('2025-03-31')),
      { wrapper: wrap(repos) },
    )
    act(() => result.current.setName('일정'))
    await act(async () => { await result.current.save() })
    expect(result.current.successKey).toBe('event.created.schedule')

    // when
    act(() => result.current.dismissMessage())

    // then
    expect(result.current.successKey).toBeNull()
    expect(result.current.errorKey).toBeNull()
  })
})

describe('useScheduleFormViewModel — 편집 로드', () => {
  it('id 가 주어지면 마운트 시 schedule 이 로드되어 폼에 반영된다', async () => {
    // given
    const schedules = new Map([['sch-1', makeSchedule({ uuid: 'sch-1', name: '기존 이름' })]])
    const repos = createFakeRepos(schedules)

    // when
    const { result } = renderHook(() => useScheduleFormViewModel('sch-1'), { wrapper: wrap(repos) })

    // then: 로드 완료 후 이름이 반영됨
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.name).toBe('기존 이름')
  })

  it('로드 완료 후 변경 없으면 isDirty 가 false 이다', async () => {
    // given
    const schedules = new Map([['sch-2', makeSchedule({ uuid: 'sch-2', name: '일정' })]])
    const repos = createFakeRepos(schedules)

    // when
    const { result } = renderHook(() => useScheduleFormViewModel('sch-2'), { wrapper: wrap(repos) })

    // then
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isDirty).toBe(false)
  })

  it('로드 후 이름을 변경하면 isDirty 가 true 이다', async () => {
    // given
    const schedules = new Map([['sch-3', makeSchedule({ uuid: 'sch-3', name: '기존' })]])
    const repos = createFakeRepos(schedules)
    const { result } = renderHook(() => useScheduleFormViewModel('sch-3'), { wrapper: wrap(repos) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    act(() => result.current.setName('수정됨'))

    // then
    expect(result.current.isDirty).toBe(true)
  })

  it('로드 실패해도 loading 이 false 로 전환된다', async () => {
    // given: getSchedule 이 throw
    const repos = createFakeRepos()
    vi.mocked(repos.eventRepo.getSchedule).mockRejectedValue(new Error('network'))

    // when
    const { result } = renderHook(() => useScheduleFormViewModel('bad-id'), { wrapper: wrap(repos) })

    // then
    await waitFor(() => expect(result.current.loading).toBe(false))
  })
})

describe('useScheduleFormViewModel — 편집 저장', () => {
  it('비반복 schedule 업데이트 성공하면 successKey 가 event.updated.schedule 이다', async () => {
    // given
    const schedules = new Map([['sch-1', makeSchedule({ uuid: 'sch-1', name: '기존' })]])
    const repos = createFakeRepos(schedules)
    const { result } = renderHook(() => useScheduleFormViewModel('sch-1'), { wrapper: wrap(repos) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    act(() => result.current.setName('수정됨'))
    await act(async () => { await result.current.save() })

    // then
    expect(result.current.successKey).toBe('event.updated.schedule')
  })

  it('반복 schedule 의 경우 saveScopeRequired 가 true 이다', async () => {
    // given
    const repeatingSchedule = makeSchedule({
      uuid: 'repeat-1',
      name: '반복',
      repeating: {
        start: 1743375600,
        option: { optionType: 'every_week', interval: 1, dayOfWeek: [1], timeZone: 'UTC' },
      },
    })
    const schedules = new Map([['repeat-1', repeatingSchedule]])
    const repos = createFakeRepos(schedules)
    const { result } = renderHook(() => useScheduleFormViewModel('repeat-1'), { wrapper: wrap(repos) })

    // then
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.saveScopeRequired).toBe(true)
  })
})

describe('useScheduleFormViewModel — 삭제', () => {
  it('비반복 schedule 삭제 성공하면 successKey 가 event.deleted.schedule 이다', async () => {
    // given
    const schedules = new Map([['sch-del', makeSchedule({ uuid: 'sch-del', name: '삭제할 일정' })]])
    const repos = createFakeRepos(schedules)
    const { result } = renderHook(() => useScheduleFormViewModel('sch-del'), { wrapper: wrap(repos) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    await act(async () => { await result.current.delete() })

    // then
    expect(result.current.successKey).toBe('event.deleted.schedule')
  })

  it('삭제 실패 시 errorKey 에 error.eventDelete. prefix 가 붙는다', async () => {
    // given
    const schedules = new Map([['sch-del2', makeSchedule({ uuid: 'sch-del2', name: '삭제 실패' })]])
    const repos = createFakeRepos(schedules)
    vi.mocked(repos.eventRepo.deleteSchedule).mockRejectedValue(new Error('server error'))
    const { result } = renderHook(() => useScheduleFormViewModel('sch-del2'), { wrapper: wrap(repos) })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    await act(async () => { await result.current.delete() })

    // then
    expect(result.current.errorKey).toMatch(/^error\.eventDelete\./)
    expect(result.current.successKey).toBeNull()
  })
})
