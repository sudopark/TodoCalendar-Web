import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthGuard } from '../../src/components/AuthGuard'
import { RepositoriesProvider } from '../../src/composition/RepositoriesProvider'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import { useCurrentTodosCache } from '../../src/repositories/caches/currentTodosCache'
import { EventRepository } from '../../src/repositories/EventRepository'
import { TagRepository } from '../../src/repositories/TagRepository'
import { ForemostEventRepository } from '../../src/repositories/ForemostEventRepository'

const accountSubject: { account: { uid: string } | null } = { account: null }

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    const state = { account: accountSubject.account, loading: false }
    return selector ? selector(state) : state
  },
}))

describe('AuthGuard — Repository 기반 prefetch', () => {
  beforeEach(() => { accountSubject.account = null })

  it('account 가 set 되면 EventRepository / TagRepository / ForemostEventRepository 의 fetch 가 호출된다', async () => {
    const container = new LocalStorageContainer()
    accountSubject.account = { uid: 'u' }

    const eventRepo = {
      fetchCurrentTodos: vi.fn().mockResolvedValue(undefined),
      fetchUncompletedTodos: vi.fn().mockResolvedValue(undefined),
    }
    const tagRepo = { fetchAll: vi.fn().mockResolvedValue(undefined) }
    const foremostEventRepo = { fetch: vi.fn().mockResolvedValue(undefined) }

    const fakeRepos = {
      eventRepo, tagRepo, foremostEventRepo,
      localStorageContainer: container,
    } as any

    render(
      <MemoryRouter>
        <RepositoriesProvider value={fakeRepos}>
          <AuthGuard><div data-testid="ok">ok</div></AuthGuard>
        </RepositoriesProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(eventRepo.fetchCurrentTodos).toHaveBeenCalled())
    await waitFor(() => expect(eventRepo.fetchUncompletedTodos).toHaveBeenCalled())
    await waitFor(() => expect(tagRepo.fetchAll).toHaveBeenCalled())
    await waitFor(() => expect(foremostEventRepo.fetch).toHaveBeenCalled())

    await container.dispose()
  })
})

describe('AuthGuard — Repository cache-first 통합', () => {
  it('account 인증 후 AuthGuard 가 init 후 cache-first 로 LocalStorage 데이터를 children 에 노출한다', async () => {
    // given: 별도 컨테이너에 데이터 미리 저장 (이전 세션 잔여 시뮬레이트)
    // — 현재 테스트 컨테이너 init 대신 같은 uid 의 DB 에 직접 데이터 시드
    const seedContainer = new LocalStorageContainer()
    await seedContainer.init('integration-uid')
    await seedContainer.todo().saveTodos([
      { uuid: 'preloaded', name: 'P', is_current: true, event_tag_id: null,
        event_time: { time_type: 'at', timestamp: 100 }, repeating: null, notification_options: null } as any,
    ])
    await seedContainer.dispose()  // close — AuthGuard 가 다시 init 함

    // 이제 AuthGuard 의 production flow: account set → AuthGuard 가 init → prefetch
    accountSubject.account = { uid: 'integration-uid' }
    const container = new LocalStorageContainer()  // un-init 상태로 주입

    const eventRepo = new EventRepository({
      todoApi: {
        getTodos: vi.fn().mockResolvedValue([]),
        getCurrentTodos: () => new Promise(() => {}),
        getUncompletedTodos: vi.fn().mockResolvedValue([]),
      } as any,
      scheduleApi: { getSchedules: vi.fn().mockResolvedValue([]) } as any,
      localStorageContainer: container,
    })
    const tagRepo = new TagRepository({
      eventTagApi: { getAllTags: vi.fn().mockResolvedValue([]) } as any,
      settingApi: { getDefaultTagColors: vi.fn().mockResolvedValue(null) } as any,
      localStorageContainer: container,
    })
    const foremostEventRepo = new ForemostEventRepository({
      api: { getForemostEvent: () => new Promise(() => {}) } as any,
      localStorageContainer: container,
    })

    const fakeRepos = {
      eventRepo, tagRepo, foremostEventRepo,
      localStorageContainer: container,
    } as any

    function Probe() {
      const todos = useCurrentTodosCache((s) => s.todos)
      return <div data-testid="probe">{todos.map(t => t.uuid).join(',')}</div>
    }

    const { getByTestId } = render(
      <MemoryRouter>
        <RepositoriesProvider value={fakeRepos}>
          <AuthGuard><Probe /></AuthGuard>
        </RepositoriesProvider>
      </MemoryRouter>
    )

    // then: AuthGuard 의 init 이 끝나고 prefetch 가 trigger 되면, fetchCurrentTodos 의 cache-first 단계가
    // LocalStorage 의 'preloaded' 를 메모리 store 에 set → Probe 에 노출
    await waitFor(() => expect(getByTestId('probe').textContent).toContain('preloaded'))

    // 정리
    await container.dispose()
    accountSubject.account = null
  })
})
