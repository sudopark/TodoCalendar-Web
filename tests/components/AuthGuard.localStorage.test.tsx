import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthGuard } from '../../src/components/AuthGuard'
import { RepositoriesProvider } from '../../src/composition/RepositoriesProvider'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'

// authStore 모킹 — 기존 AuthGuard 테스트 패턴을 따른다
const accountSubject: { account: { uid: string } | null } = { account: null }

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    const state = { account: accountSubject.account, loading: false }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))

describe('AuthGuard — LocalStorageContainer lifecycle', () => {
  beforeEach(() => {
    accountSubject.account = null
  })

  it('account.uid 가 set 되면 LocalStorageContainer.init(uid) 가 호출된다', async () => {
    // given
    const container = new LocalStorageContainer()
    const initSpy = vi.spyOn(container, 'init')
    accountSubject.account = { uid: 'user-1' }

    const fakeRepos = {
      localStorageContainer: container,
      eventRepo: { fetchCurrentTodos: vi.fn().mockResolvedValue(undefined), fetchUncompletedTodos: vi.fn().mockResolvedValue(undefined) },
      tagRepo: { fetchAll: vi.fn().mockResolvedValue(undefined) },
      foremostEventRepo: { fetch: vi.fn().mockResolvedValue(undefined) },
    } as any

    // when
    render(
      <MemoryRouter>
        <RepositoriesProvider value={fakeRepos}>
          <AuthGuard><div data-testid="ok">ok</div></AuthGuard>
        </RepositoriesProvider>
      </MemoryRouter>
    )

    // then
    await waitFor(() => expect(initSpy).toHaveBeenCalledWith('user-1'))

    await container.dispose()
  })

  it('account 가 null 로 바뀌면 dispose 가 호출된다 — unmount 검증', async () => {
    // given
    const container = new LocalStorageContainer()
    const disposeSpy = vi.spyOn(container, 'dispose')
    accountSubject.account = { uid: 'user-1' }

    const fakeRepos = {
      localStorageContainer: container,
      eventRepo: { fetchCurrentTodos: vi.fn().mockResolvedValue(undefined), fetchUncompletedTodos: vi.fn().mockResolvedValue(undefined) },
      tagRepo: { fetchAll: vi.fn().mockResolvedValue(undefined) },
      foremostEventRepo: { fetch: vi.fn().mockResolvedValue(undefined) },
    } as any

    // when
    const { unmount } = render(
      <MemoryRouter>
        <RepositoriesProvider value={fakeRepos}>
          <AuthGuard><div /></AuthGuard>
        </RepositoriesProvider>
      </MemoryRouter>
    )
    unmount()

    // then
    expect(disposeSpy).toHaveBeenCalled()
  })
})
