import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ArchivePanel } from '../../src/components/ArchivePanel'
import { useDoneTodosCache } from '../../src/repositories/caches/doneTodosCache'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import { useToastStore } from '../../src/stores/toastStore'
import { RepositoriesProvider } from '../../src/composition/RepositoriesProvider'
import type { Repositories } from '../../src/composition/container'
import type { DoneTodoRepository } from '../../src/repositories/DoneTodoRepository'

vi.mock('../../src/api/settingApi', () => ({
  settingApi: { getDefaultTagColors: async () => null },
}))

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: async () => [] },
}))

// IntersectionObserver mock (jsdom 미지원)
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(private callback: IntersectionObserverCallback) {}
  trigger() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as any)
  }
}

const makeDone = (id: string) => ({
  uuid: id, name: `완료-${id}`, done_at: 1000, origin_event_id: null,
  event_time: null, event_tag_id: null,
})

function makeFakeDoneTodoRepo(overrides: Partial<DoneTodoRepository> = {}): DoneTodoRepository {
  return {
    fetchNextPage: overrides.fetchNextPage ?? vi.fn(async () => {}),
    revert: overrides.revert ?? vi.fn(async () => { throw new Error('not configured') }),
    remove: overrides.remove ?? vi.fn(async () => { throw new Error('not configured') }),
    getSnapshot: vi.fn(() => []),
  } as unknown as DoneTodoRepository
}

function makeFakeRepos(doneTodoRepo: DoneTodoRepository): Repositories {
  return {
    eventRepo: {} as any,
    eventDetailRepo: {} as any,
    tagRepo: {} as any,
    holidayRepo: {} as any,
    doneTodoRepo,
    foremostEventRepo: {} as any,
    authRepo: {} as any,
    settingsRepo: {} as any,
    localStorageContainer: {} as any,
  }
}

describe('DoneTodosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDoneTodosCache.getState().reset()
    useEventTagListCache.getState().reset()
    useToastStore.setState({ toasts: [] })
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  function renderPage(doneTodoRepo: DoneTodoRepository) {
    return render(
      <RepositoriesProvider value={makeFakeRepos(doneTodoRepo)}>
        <MemoryRouter><ArchivePanel /></MemoryRouter>
      </RepositoriesProvider>
    )
  }

  it('마운트 시 done todos를 불러와 목록을 렌더한다', async () => {
    // given
    const fetchNextPage = vi.fn(async () => {
      useDoneTodosCache.getState().appendPage([makeDone('d1'), makeDone('d2')] as any, null, false)
    })
    const doneTodoRepo = makeFakeDoneTodoRepo({ fetchNextPage })

    // when
    renderPage(doneTodoRepo)

    // then
    await waitFor(() => {
      expect(screen.getByText('완료-d1')).toBeInTheDocument()
      expect(screen.getByText('완료-d2')).toBeInTheDocument()
    })
  })

  it('모든 항목을 불러오면 "모두 표시됨" 텍스트가 나타난다', async () => {
    // given: 1개만 반환 → hasMore = false
    const fetchNextPage = vi.fn(async () => {
      useDoneTodosCache.getState().appendPage([makeDone('d1')] as any, null, false)
    })
    const doneTodoRepo = makeFakeDoneTodoRepo({ fetchNextPage })

    // when
    renderPage(doneTodoRepo)

    // then
    await waitFor(() => {
      expect(screen.getByText('모두 표시됨')).toBeInTheDocument()
    })
  })

  it('삭제 버튼 클릭 → 확인 다이얼로그 → 확인 시 항목이 제거된다', async () => {
    // given
    const fetchNextPage = vi.fn(async () => {
      useDoneTodosCache.getState().appendPage([makeDone('d1')] as any, null, false)
    })
    const remove = vi.fn(async (id: string) => {
      useDoneTodosCache.getState().removeItem(id)
    })
    const doneTodoRepo = makeFakeDoneTodoRepo({ fetchNextPage, remove })

    renderPage(doneTodoRepo)
    await waitFor(() => screen.getByText('완료-d1'))

    // when: 삭제 버튼 → 다이얼로그 확인
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    await waitFor(() => {
      expect(screen.queryByText('완료-d1')).not.toBeInTheDocument()
    })
  })

  it('되돌리기 실패 시 에러 토스트가 표시된다', async () => {
    // given
    const fetchNextPage = vi.fn(async () => {
      useDoneTodosCache.getState().appendPage([makeDone('d1')] as any, null, false)
    })
    const revert = vi.fn(async () => { throw new Error('fail') })
    const doneTodoRepo = makeFakeDoneTodoRepo({ fetchNextPage, revert })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderPage(doneTodoRepo)
    await waitFor(() => screen.getByText('완료-d1'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.key === 'todo.revert_failed' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('삭제 실패 시 에러 토스트가 표시된다', async () => {
    // given
    const fetchNextPage = vi.fn(async () => {
      useDoneTodosCache.getState().appendPage([makeDone('d1')] as any, null, false)
    })
    const remove = vi.fn(async () => { throw new Error('fail') })
    const doneTodoRepo = makeFakeDoneTodoRepo({ fetchNextPage, remove })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderPage(doneTodoRepo)
    await waitFor(() => screen.getByText('완료-d1'))

    // when: 삭제 버튼 → 다이얼로그 확인
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.key === 'todo.delete_failed' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('되돌리기 버튼 클릭 시 항목이 목록에서 제거된다', async () => {
    // given
    const fetchNextPage = vi.fn(async () => {
      useDoneTodosCache.getState().appendPage([makeDone('d1')] as any, null, false)
    })
    const revert = vi.fn(async (id: string) => {
      useDoneTodosCache.getState().removeItem(id)
      return { uuid: 'todo-1', name: '완료-d1', is_current: true } as any
    })
    const doneTodoRepo = makeFakeDoneTodoRepo({ fetchNextPage, revert })

    renderPage(doneTodoRepo)
    await waitFor(() => screen.getByText('완료-d1'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }))

    // then
    await waitFor(() => {
      expect(screen.queryByText('완료-d1')).not.toBeInTheDocument()
    })
  })
})
