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
  it('account 인증 후 LocalStorage 의 데이터가 메모리 store 에 즉시 들어와 children 이 그것을 본다', async () => {
    // given: LocalStorage 에 currentTodo 미리 저장 (이전 세션의 잔여 데이터 simulation)
    accountSubject.account = { uid: 'integration-uid' }
    const container = new LocalStorageContainer()
    await container.init('integration-uid')
    await container.todo().saveTodos([
      { uuid: 'preloaded', name: 'P', is_current: true, event_tag_id: null,
        event_time: { time_type: 'at', timestamp: 100 }, repeating: null, notification_options: null } as any,
    ])

    // 실제 Repository 들 + Remote 가 응답하지 않는 fake API (신선한 데이터가 늦게 와야 cache-first 효과 검증 가능)
    const eventRepo = new EventRepository({
      todoApi: {
        getTodos: vi.fn().mockResolvedValue([]),
        getCurrentTodos: () => new Promise(() => {}),    // never resolves
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

    // children 이 currentTodosCache 를 구독하는 probe 컴포넌트
    function Probe() {
      const todos = useCurrentTodosCache((s) => s.todos)
      return <div data-testid="probe">{todos.map(t => t.uuid).join(',')}</div>
    }

    // when: AuthGuard 렌더 — children 도 함께 렌더되며 cache 구독
    const { getByTestId } = render(
      <MemoryRouter>
        <RepositoriesProvider value={fakeRepos}>
          <AuthGuard><Probe /></AuthGuard>
        </RepositoriesProvider>
      </MemoryRouter>
    )

    // then: Remote 가 끝나지 않아도 (getCurrentTodos 가 never resolve) LocalStorage 의 'preloaded' 가 곧 화면에 보인다
    await waitFor(() => expect(getByTestId('probe').textContent).toContain('preloaded'))

    await container.dispose()
    accountSubject.account = null
  })
})
