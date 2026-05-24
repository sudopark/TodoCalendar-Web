import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { RepositoriesProvider } from '../../../src/composition/RepositoriesProvider'
import { useScheduleFormViewModel } from '../../../src/pages/ScheduleForm/useScheduleFormViewModel'
import type { EventRepository } from '../../../src/repositories/EventRepository'
import type { EventDetailRepository } from '../../../src/repositories/EventDetailRepository'
import type { Repositories } from '../../../src/composition/container'
import { LocalStorageContainer } from '../../../src/repositories/local-storage/LocalStorageContainer'
import type { Schedule } from '../../../src/models/Schedule'
import type { EventDetail } from '../../../src/models/EventDetail'
import type { EventTime, Repeating } from '../../../src/models'

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
      const created = makeSchedule({
        uuid: 'created-1',
        name: input.name,
        event_time: input.event_time,
        repeating: input.repeating ?? null,
      })
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
    localStorageContainer: new LocalStorageContainer(),
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

describe('useScheduleFormViewModel — 반복 일정의 특정 차수(occurrence) 진입', () => {
  const SERIES_START = 1770267600 // 시리즈 첫 turn (생성 시점)
  const SERIES_END = SERIES_START + 14400
  const OCC_START = SERIES_START + 1209600 // 2주 뒤 차수
  const OCC_END = OCC_START + 14400
  const repeating: Repeating = {
    start: SERIES_START,
    option: { optionType: 'every_week', interval: 2, dayOfWeek: [4], timeZone: 'Asia/Seoul' },
  }
  const seriesEventTime: EventTime = { time_type: 'period', period_start: SERIES_START, period_end: SERIES_END }
  const occurrence = {
    eventTime: { time_type: 'period', period_start: OCC_START, period_end: OCC_END } as EventTime,
    turn: 2,
  }

  function setup() {
    const schedules = new Map<string, Schedule>([
      ['sched-rep', makeSchedule({ uuid: 'sched-rep', name: '정기청소', event_time: seriesEventTime, repeating })],
    ])
    const repos = createFakeRepos(schedules)
    // 저장 결과를 store 에 실제로 반영해 outcome 으로 검증한다
    vi.mocked(repos.eventRepo.updateSchedule).mockImplementation(async (id, patch) => {
      const existing = schedules.get(id)!
      const updated = { ...existing, ...patch } as Schedule
      schedules.set(id, updated)
      return updated
    })
    vi.mocked(repos.eventRepo.excludeScheduleRepeating).mockImplementation(async (id: string, excludeTs: number) => {
      const existing = schedules.get(id)!
      const updated = { ...existing, exclude_repeatings: [...(existing.exclude_repeatings ?? []), excludeTs] } as Schedule
      schedules.set(id, updated)
      return updated
    })
    return { schedules, repos }
  }

  it('차수 진입 시 eventTime 은 시리즈 첫 turn 이 아니라 선택한 차수의 시간으로 표시된다', async () => {
    // given / when
    const { repos } = setup()
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, occurrence),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // then
    expect(result.current.eventTime).toEqual(occurrence.eventTime)
  })

  it('차수 진입 직후에는 isDirty 가 false 다 (차수 시간이 기준선이 됨)', async () => {
    // given / when
    const { repos } = setup()
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, occurrence),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // then
    expect(result.current.isDirty).toBe(false)
  })

  it("'all' scope 로 시간을 안 건드리고 저장하면 시리즈 앵커(첫 turn 시간)가 보존된다", async () => {
    // given
    const { schedules, repos } = setup()
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, occurrence),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when: 이름만 바꾸고 전체 저장
    act(() => result.current.setName('정기청소(수정)'))
    await act(async () => { await result.current.save('all') })

    // then: 저장된 시리즈 event_time 은 occurrence 가 아니라 원래 시리즈 시작
    expect(schedules.get('sched-rep')!.event_time).toEqual(seriesEventTime)
  })

  it("'all' scope 에서 차수 시간을 +30분 옮기면 시리즈 시작도 +30분 옮겨 저장된다", async () => {
    // given
    const { schedules, repos } = setup()
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, occurrence),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when: 차수 시간을 30분 뒤로
    act(() => result.current.setEventTime({ time_type: 'period', period_start: OCC_START + 1800, period_end: OCC_END + 1800 }))
    await act(async () => { await result.current.save('all') })

    // then: 시리즈 시작도 동일하게 +1800
    expect(schedules.get('sched-rep')!.event_time).toEqual({
      time_type: 'period', period_start: SERIES_START + 1800, period_end: SERIES_END + 1800,
    })
  })

  it("'all' scope 에서 사용자가 time_type 을 바꾸면 시리즈 앵커는 변경 없이 보존된다", async () => {
    // given: occurrence(period) 진입
    const { schedules, repos } = setup()
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, occurrence),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when: time_type 을 period → allday 로 바꾸고 'all' 저장
    act(() => result.current.setEventTime({
      time_type: 'allday', period_start: OCC_START, period_end: OCC_END, seconds_from_gmt: 32400,
    }))
    await act(async () => { await result.current.save('all') })

    // then: 시리즈 앵커는 occurrence 시간으로 점프하지 않고 원본 그대로 보존
    expect(schedules.get('sched-rep')!.event_time).toEqual(seriesEventTime)
  })

  it("'future' scope 저장 시 cutoff 는 차수 시간 기준이고 새 시리즈는 그 차수에서 시작한다", async () => {
    // given
    const { schedules, repos } = setup()
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, occurrence),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    act(() => result.current.setName('이후 전체'))
    await act(async () => { await result.current.save('future') })

    // then: 원본 시리즈는 occurrence 직전에서 끝남
    expect(schedules.get('sched-rep')!.repeating!.end).toBe(OCC_START - 1)
    // 새 시리즈는 occurrence 시간부터 시작 (event_time + repeating.start 모두 rebase)
    const newSeries = schedules.get('created-1')!
    expect(newSeries.event_time).toEqual(occurrence.eventTime)
    expect(newSeries.repeating!.start).toBe(OCC_START)
  })

  it("'this' scope 저장 시 클릭한 차수 occurrence 의 시작 timestamp 가 제외되고 새 단건이 그 차수 시간으로 생성된다", async () => {
    // given
    const { schedules, repos } = setup()
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, occurrence),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    act(() => result.current.setName('이 회차만'))
    await act(async () => { await result.current.save('this') })

    // then: 원본의 exclude_repeatings 에 occurrence 의 시작 timestamp 가 추가됨
    expect(schedules.get('sched-rep')!.exclude_repeatings).toContain(OCC_START)
    // 새 단건은 차수 시간으로 생성
    expect(schedules.get('created-1')!.event_time).toEqual(occurrence.eventTime)
  })

  it("'this' scope 인데 occurrence 컨텍스트가 없으면 invalid_scope 에러로 차단된다 (첫 회차 silent 손상 방지)", async () => {
    // given: occurrence 미주입 (직접 URL 진입 등 비정상 경로)
    const { schedules, repos } = setup()
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, undefined),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    act(() => result.current.setName('이 회차만'))
    await act(async () => { await result.current.save('this') })

    // then: 에러 키 설정 + 원본 exclude_repeatings 안 변함
    expect(result.current.errorKey).toBe('error.eventSave.invalid_scope')
    expect(schedules.get('sched-rep')!.exclude_repeatings).toBeUndefined()
  })

  it("'future' scope 에서 원본의 end_count(반복 횟수 한정) 는 새 시리즈에도 그대로 보존된다", async () => {
    // given: end_count 가 있는 시리즈
    const { schedules, repos } = setup()
    const seriesWithCount = schedules.get('sched-rep')!
    schedules.set('sched-rep', { ...seriesWithCount, repeating: { ...seriesWithCount.repeating!, end_count: 10 } })
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, occurrence),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    act(() => result.current.setName('이후 전체'))
    await act(async () => { await result.current.save('future') })

    // then: 새 시리즈가 end_count 를 그대로 따라감 (분리 후에도 종료 조건 유지)
    expect(schedules.get('created-1')!.repeating!.end_count).toBe(10)
  })

  it("'this' scope 삭제도 occurrence 의 시작 timestamp 가 exclude 되고, 시리즈 첫 회차는 건드리지 않는다", async () => {
    // given: 폼 진입(vm.original.event_time 은 시리즈 첫 회차)
    const { schedules, repos } = setup()
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, occurrence),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    await act(async () => { await result.current.delete('this') })

    // then: 첫 회차(SERIES_START) 가 아닌 occurrence(OCC_START) 가 exclude
    const excluded = schedules.get('sched-rep')!.exclude_repeatings ?? []
    expect(excluded).toContain(OCC_START)
    expect(excluded).not.toContain(SERIES_START)
  })

  it("'this' scope 삭제 시 occurrence 컨텍스트가 없으면 invalid_scope 로 차단된다", async () => {
    // given: occurrence 미주입
    const { schedules, repos } = setup()
    const { result } = renderHook(
      () => useScheduleFormViewModel('sched-rep', undefined, undefined, undefined),
      { wrapper: wrap(repos) },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    // when
    await act(async () => { await result.current.delete('this') })

    // then
    expect(result.current.errorKey).toBe('error.eventDelete.invalid_scope')
    expect(schedules.get('sched-rep')!.exclude_repeatings).toBeUndefined()
  })
})
