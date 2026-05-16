import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArchivePanel } from '../../src/components/ArchivePanel'
import { useDoneTodosCache } from '../../src/repositories/caches/doneTodosCache'
import { RepositoriesProvider } from '../../src/composition/RepositoriesProvider'
import type { Repositories } from '../../src/composition/container'
import type { DoneTodoRepository } from '../../src/repositories/DoneTodoRepository'

const sampleItems = [
  { uuid: 'd-1', name: '완료된 일 A', done_at: 1714000000, event_tag_id: null },
]

vi.mock('../../src/api/doneTodoApi', () => ({
  doneTodoApi: {
    getDoneTodos: vi.fn(async () => sampleItems),
    deleteDoneTodo: vi.fn(async () => ({ status: 'ok' })),
    revertDoneTodo: vi.fn(async () => ({})),
    getDoneTodoDetail: vi.fn(async () => null),
  },
}))

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: vi.fn(async () => []) },
}))

// jsdom 미지원 IntersectionObserver 모킹 — ArchivePanel 의 무한스크롤 sentinel 용
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  takeRecords = vi.fn(() => [])
  root = null
  rootMargin = ''
  thresholds = []
  constructor(_cb: IntersectionObserverCallback) {}
}

function makeFakeDoneTodoRepo(overrides: Partial<DoneTodoRepository> = {}): DoneTodoRepository {
  return {
    fetchNextPage: overrides.fetchNextPage ?? vi.fn(async () => {
      // mount 시 fetchNextPage 가 실제로 cache 를 채우도록 appendPage 호출
      useDoneTodosCache.getState().appendPage(sampleItems as any, null, false)
    }),
    revert: overrides.revert ?? vi.fn(async () => ({ uuid: 'd-1', name: 't-1', is_current: true })),
    remove: overrides.remove ?? vi.fn(async () => {}),
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

function renderArchivePanel(overrides: Partial<{
  doneTodoRepo: DoneTodoRepository
  onDoneTodoClick: (...args: any[]) => void
}> = {}) {
  const doneTodoRepo = overrides.doneTodoRepo ?? makeFakeDoneTodoRepo()
  return render(
    <RepositoriesProvider value={makeFakeRepos(doneTodoRepo)}>
      <ArchivePanel onDoneTodoClick={overrides.onDoneTodoClick} />
    </RepositoriesProvider>
  )
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  useDoneTodosCache.getState().reset()
})

describe('ArchivePanel', () => {
  it('done todo 행을 클릭하면 onDoneTodoClick 이 done todo 와 anchorRect 와 함께 호출된다', async () => {
    const onDoneTodoClick = vi.fn()
    const user = userEvent.setup()
    renderArchivePanel({ onDoneTodoClick })

    // mount 시 fetchNextPage 가 흘러 들어와 행이 노출될 때까지 대기
    const row = await screen.findByText('완료된 일 A')
    await user.click(row)

    expect(onDoneTodoClick).toHaveBeenCalled()
    const [doneTodo, rect] = onDoneTodoClick.mock.calls[0]
    expect(doneTodo.uuid).toBe('d-1')
    expect(rect).toBeDefined()
  })

  it('되돌리기 아이콘 버튼 클릭은 행 onClick 과 분리되어 onDoneTodoClick 이 호출되지 않는다', async () => {
    const onDoneTodoClick = vi.fn()
    const user = userEvent.setup()
    renderArchivePanel({ onDoneTodoClick })

    await screen.findByText('완료된 일 A')
    await user.click(screen.getByRole('button', { name: '되돌리기' }))
    expect(onDoneTodoClick).not.toHaveBeenCalled()
  })

  it('삭제 아이콘 버튼 클릭은 행 onClick 과 분리되어 onDoneTodoClick 이 호출되지 않는다', async () => {
    const onDoneTodoClick = vi.fn()
    const user = userEvent.setup()
    renderArchivePanel({ onDoneTodoClick })

    await screen.findByText('완료된 일 A')
    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(onDoneTodoClick).not.toHaveBeenCalled()
  })

  it('onDoneTodoClick prop 없이도 정상 렌더된다 (콜백 미주입 호환)', async () => {
    renderArchivePanel()
    await waitFor(() => expect(screen.getByText('완료된 일 A')).toBeInTheDocument())
  })
})
