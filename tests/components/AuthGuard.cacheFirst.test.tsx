import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthGuard } from '../../src/components/AuthGuard'
import { RepositoriesProvider } from '../../src/composition/RepositoriesProvider'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'

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
