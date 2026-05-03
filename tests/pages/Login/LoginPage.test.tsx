import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../../../src/pages/Login/LoginPage'
import { useAuthStore } from '../../../src/stores/authStore'
import { useRepositories } from '../../../src/composition/RepositoriesProvider'

vi.mock('../../../src/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../../src/composition/RepositoriesProvider', () => ({
  useRepositories: vi.fn(),
}))

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  const mockSignInWithGoogle = vi.fn()
  const mockSignInWithApple = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // LoginPage는 useAuthStore(s => s.account) 셀렉터 형태로 호출한다
    vi.mocked(useAuthStore).mockImplementation((selector: any) =>
      selector({ account: null, loading: false })
    )
    vi.mocked(useRepositories).mockReturnValue({
      authRepo: {
        signInWithGoogle: mockSignInWithGoogle,
        signInWithApple: mockSignInWithApple,
      },
    } as any)
  })

  it('Google 로그인 버튼이 표시된다', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
  })

  it('Apple 로그인 버튼이 표시된다', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument()
  })

  it('Google 버튼 클릭 시 Google 로그인을 시도한다', async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined)
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: /google/i }))

    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalledOnce())
  })

  it('Apple 버튼 클릭 시 Apple 로그인을 시도한다', async () => {
    mockSignInWithApple.mockResolvedValue(undefined)
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: /apple/i }))

    await waitFor(() => expect(mockSignInWithApple).toHaveBeenCalledOnce())
  })

  it('로그인 실패 시 에러 메시지가 표시된다', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('로그인 실패'))
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: /google/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('팝업을 닫으면 에러 메시지가 표시되지 않는다', async () => {
    const popupClosedError = Object.assign(new Error('auth/popup-closed-by-user'), {
      code: 'auth/popup-closed-by-user',
    })
    mockSignInWithGoogle.mockRejectedValue(popupClosedError)
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: /google/i }))

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  // #109: 로그인 → 메인화면 진입 사이 시간 텀 동안 사용자에게 진행 중 상태를 보여준다.
  // useLoginViewModel 은 성공 시 loading=true 를 유지해 LoginPage 가 unmount(account 세팅 → Navigate)
  // 될 때까지 전환 로딩 화면을 그릴 수 있게 한다.
  describe('#109 로그인 전환 로딩 표시', () => {
    it('로그인 시도 중에는 status 역할의 로딩 인디케이터가 표시된다', async () => {
      mockSignInWithGoogle.mockReturnValue(new Promise(() => {})) // never resolves
      renderLoginPage()

      fireEvent.click(screen.getByRole('button', { name: /google/i }))

      // 로딩 상태로 들어가면 status (role=status) 인디케이터가 노출
      const status = await screen.findByRole('status')
      expect(status).toBeInTheDocument()
    })

    it('로그인 시도 중에는 google/apple 버튼이 DOM 에서 사라진다 (전환 화면)', async () => {
      mockSignInWithGoogle.mockReturnValue(new Promise(() => {})) // never resolves
      renderLoginPage()

      fireEvent.click(screen.getByRole('button', { name: /google/i }))

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /google/i })).toBeNull()
        expect(screen.queryByRole('button', { name: /apple/i })).toBeNull()
      })
    })

    it('로그인 시도 실패(cancelled) 후에는 로그인 버튼이 다시 노출된다', async () => {
      // 팝업 닫힘 — 에러 메시지는 안 표시되지만 다시 시도할 수 있어야 함
      const cancelledError = Object.assign(new Error('popup closed'), {
        code: 'auth/popup-closed-by-user',
      })
      mockSignInWithGoogle.mockRejectedValue(cancelledError)
      renderLoginPage()

      fireEvent.click(screen.getByRole('button', { name: /google/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument()
      })
    })
  })
})
