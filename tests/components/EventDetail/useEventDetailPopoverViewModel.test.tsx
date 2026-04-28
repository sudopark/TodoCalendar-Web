import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { RepositoriesProvider } from '../../../src/composition/RepositoriesProvider'
import { useEventDetailPopoverViewModel } from '../../../src/components/EventDetail/useEventDetailPopoverViewModel'
import type { EventDetailRepository } from '../../../src/repositories/EventDetailRepository'
import type { Repositories } from '../../../src/composition/container'
import type { CalendarEvent } from '../../../src/domain/functions/eventTime'

// ── API 부수 초기화 차단 ─────────────────────────────────────────────
vi.mock('../../../src/api/eventDetailApi', () => ({ eventDetailApi: {} }))
vi.mock('../../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../../src/api/scheduleApi', () => ({ scheduleApi: {} }))
vi.mock('../../../src/api/eventTagApi', () => ({ eventTagApi: {} }))
vi.mock('../../../src/api/settingApi', () => ({ settingApi: {} }))
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

// ── Helpers ──────────────────────────────────────────────────────────

function makeTodoCalEvent(uuid: string = 'todo-1'): CalendarEvent {
  return {
    type: 'todo',
    event: {
      uuid,
      name: '테스트 할 일',
      is_current: false,
      event_tag_id: null,
      event_time: null,
      repeating: null,
      notification_options: null,
    },
  }
}

function createFakeDetailRepo(detail: { place?: string | null; url?: string | null; memo?: string | null } | null = null): EventDetailRepository {
  return {
    get: vi.fn(async () => detail ? { place: detail.place ?? null, url: detail.url ?? null, memo: detail.memo ?? null } : null),
    save: vi.fn(async (_, d) => d),
    invalidate: vi.fn(),
  } as unknown as EventDetailRepository
}

function createFakeRepos(detailRepo: EventDetailRepository): Repositories {
  return {
    eventRepo: {} as unknown as Repositories['eventRepo'],
    eventDetailRepo: detailRepo,
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

describe('useEventDetailPopoverViewModel — eventDetail 로드', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('마운트 시 eventDetailRepo.get을 호출하여 eventDetail을 로드한다', async () => {
    // given
    const detailRepo = createFakeDetailRepo({ place: '서울 카페', url: null, memo: null })
    const repos = createFakeRepos(detailRepo)
    const calEvent = makeTodoCalEvent('todo-1')

    // when
    const { result } = renderHook(() => useEventDetailPopoverViewModel(calEvent), { wrapper: wrap(repos) })

    // then: 로드 완료 후 eventDetail 반영
    await waitFor(() => expect(result.current.eventDetail).not.toBeNull())
    expect(result.current.eventDetail?.place).toBe('서울 카페')
  })

  it('eventDetail이 없으면 null을 반환한다', async () => {
    // given: repo가 null 반환
    const detailRepo = createFakeDetailRepo(null)
    const repos = createFakeRepos(detailRepo)
    const calEvent = makeTodoCalEvent('todo-2')

    // when
    const { result } = renderHook(() => useEventDetailPopoverViewModel(calEvent), { wrapper: wrap(repos) })

    // then: 초기값 null 유지 (get이 null 반환)
    await waitFor(() => {
      // repo.get resolves to null — hook sets eventDetail to null
      expect(vi.mocked(detailRepo.get)).toHaveReturnedWith(expect.any(Promise))
    })
    expect(result.current.eventDetail).toBeNull()
  })

  it('place, url, memo가 모두 있는 eventDetail을 올바르게 반환한다', async () => {
    // given
    const detailRepo = createFakeDetailRepo({ place: '강남역', url: 'https://example.com', memo: '중요한 메모' })
    const repos = createFakeRepos(detailRepo)
    const calEvent = makeTodoCalEvent('todo-3')

    // when
    const { result } = renderHook(() => useEventDetailPopoverViewModel(calEvent), { wrapper: wrap(repos) })

    // then
    await waitFor(() => expect(result.current.eventDetail).not.toBeNull())
    expect(result.current.eventDetail?.place).toBe('강남역')
    expect(result.current.eventDetail?.url).toBe('https://example.com')
    expect(result.current.eventDetail?.memo).toBe('중요한 메모')
  })
})
