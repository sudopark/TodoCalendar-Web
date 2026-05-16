import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from '../../src/components/AuthGuard'
import { RepositoriesProvider } from '../../src/composition/RepositoriesProvider'
import { useAuthStore } from '../../src/stores/authStore'
import { useToastStore } from '../../src/stores/toastStore'

vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const fakeLocalStorageContainer = {
  init: vi.fn().mockResolvedValue(undefined),
  dispose: vi.fn().mockResolvedValue(undefined),
} as any

const fakeEventRepo = {
  fetchCurrentTodos: vi.fn().mockResolvedValue(undefined),
  fetchUncompletedTodos: vi.fn().mockResolvedValue(undefined),
} as any

const fakeTagRepo = {
  fetchAll: vi.fn().mockResolvedValue(undefined),
} as any

const fakeForemostEventRepo = {
  fetch: vi.fn().mockResolvedValue(undefined),
} as any

const fakeRepos = {
  localStorageContainer: fakeLocalStorageContainer,
  eventRepo: fakeEventRepo,
  tagRepo: fakeTagRepo,
  foremostEventRepo: fakeForemostEventRepo,
} as any

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <RepositoriesProvider value={fakeRepos}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/login" element={<div>로그인 페이지</div>} />
        </Routes>
      </RepositoriesProvider>
    </MemoryRouter>
  )
}

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // clearAllMocks 이후 fakeRepo 기본 구현 복원
    fakeEventRepo.fetchCurrentTodos.mockResolvedValue(undefined)
    fakeEventRepo.fetchUncompletedTodos.mockResolvedValue(undefined)
    fakeTagRepo.fetchAll.mockResolvedValue(undefined)
    fakeForemostEventRepo.fetch.mockResolvedValue(undefined)
    useToastStore.setState({ toasts: [] })
  })

  it('인증 확인 중에는 보호된 컨텐츠도 로그인 페이지도 보이지 않는다', () => {
    vi.mocked(useAuthStore).mockReturnValue({ account: null, loading: true } as any)
    renderWithRouter(<AuthGuard><div>보호된 페이지</div></AuthGuard>)

    expect(screen.queryByText('보호된 페이지')).toBeNull()
    expect(screen.queryByText('로그인 페이지')).toBeNull()
  })

  it('로그인하지 않은 사용자는 로그인 페이지로 이동한다', () => {
    vi.mocked(useAuthStore).mockReturnValue({ account: null, loading: false } as any)
    renderWithRouter(<AuthGuard><div>보호된 페이지</div></AuthGuard>)

    expect(screen.queryByText('보호된 페이지')).toBeNull()
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument()
  })

  it('로그인한 사용자는 요청한 페이지를 볼 수 있다', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      account: { uid: 'user-123' },
      loading: false,
    } as any)
    renderWithRouter(<AuthGuard><div>보호된 페이지</div></AuthGuard>)

    expect(screen.getByText('보호된 페이지')).toBeInTheDocument()
    expect(screen.queryByText('로그인 페이지')).toBeNull()
  })

  it('로그인 후 일부 데이터 로드에 실패해도 앱은 계속 표시된다', async () => {
    // given: 태그 Repository fetch 가 실패하도록 설정 (부분 실패)
    fakeTagRepo.fetchAll.mockRejectedValue(new Error('network'))

    // when: 로그인 상태로 렌더링
    vi.mocked(useAuthStore).mockReturnValue({
      account: { uid: 'user-123' },
      loading: false,
    } as any)
    renderWithRouter(<AuthGuard><div>보호된 페이지</div></AuthGuard>)

    // then: 부분 실패해도 앱은 계속 표시되고, 에러 토스트는 없다
    await waitFor(() => {
      expect(screen.getByText('보호된 페이지')).toBeInTheDocument()
    })
    const toasts = useToastStore.getState().toasts
    expect(toasts.some(t => t.type === 'error')).toBe(false)
  })
})
