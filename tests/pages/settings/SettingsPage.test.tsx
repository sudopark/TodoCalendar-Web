import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SettingsPage } from '../../../src/pages/settings/SettingsPage'
import { accountApi } from '../../../src/api/accountApi'
import { useAuthStore } from '../../../src/stores/authStore'
import { useRepositories } from '../../../src/composition/RepositoriesProvider'
import { useToastStore } from '../../../src/stores/toastStore'

vi.mock('../../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))

vi.mock('../../../src/api/accountApi', () => ({
  accountApi: { deleteAccount: vi.fn() },
}))

vi.mock('../../../src/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../../src/composition/RepositoriesProvider', () => ({
  useRepositories: vi.fn(),
}))

describe('SettingsPage', () => {
  const mockSignOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useToastStore.setState({ toasts: [] })
    vi.mocked(useAuthStore).mockImplementation((selector: any) =>
      selector({ account: { uid: 'u1', email: 'test@example.com' } })
    )
    vi.mocked(useRepositories).mockReturnValue({
      authRepo: { signOut: mockSignOut },
    } as any)
  })

  function renderPage(initialPath = '/settings') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<div data-testid="main-page">main</div>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:categoryId" element={<SettingsPage />} />
          <Route path="/settings/:categoryId/:subView" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('좌측 메뉴에 모든 카테고리가 노출된다', () => {
    // given / when
    renderPage()

    // then: nav 메뉴 안에 각 카테고리 버튼이 존재한다
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
    const withinNav = (name: string) =>
      Array.from(nav.querySelectorAll('button')).some(btn => btn.textContent?.trim() === name)
    expect(withinNav('외형')).toBe(true)
    expect(withinNav('공휴일')).toBe(true)
    expect(withinNav('타임존')).toBe(true)
    expect(withinNav('언어')).toBe(true)
    expect(withinNav('알림')).toBe(true)
    expect(withinNav('계정')).toBe(true)
  })

  it('기본 경로(/settings)로 진입 시 외형 섹션이 우측에 노출된다', async () => {
    // given / when
    renderPage('/settings')

    // then: 외형 섹션의 특징적 요소(테마 "시스템" 버튼)가 보인다
    await waitFor(() => expect(screen.getByRole('button', { name: '시스템' })).toBeInTheDocument())
  })

  it('계정 카테고리 클릭 시 계정 정보가 우측에 노출된다', async () => {
    // given
    renderPage('/settings')

    // when
    await userEvent.click(screen.getByRole('button', { name: '계정' }))

    // then
    await waitFor(() => expect(screen.getByText('test@example.com')).toBeInTheDocument())
  })

  it('계정 섹션에서 로그아웃 버튼 클릭 시 확인 다이얼로그가 노출된다', async () => {
    // given
    renderPage('/settings/account')
    await waitFor(() => screen.getByText('test@example.com'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    // then: 확인 다이얼로그가 표시되고 signOut은 아직 호출되지 않는다
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('로그아웃 확인 다이얼로그에서 확인 클릭 시 로그아웃 실행 후 메인 경로로 이동한다', async () => {
    // given
    mockSignOut.mockResolvedValue(undefined)
    renderPage('/settings/account')
    await waitFor(() => screen.getByText('test@example.com'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))
    const dialog = await waitFor(() => screen.getByRole('dialog'))
    await userEvent.click(within(dialog).getByRole('button', { name: '로그아웃' }))

    // then: signOut이 실행되고 메인 페이지로 이동한다
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('main-page')).toBeInTheDocument())
  })

  it('로그아웃 확인 다이얼로그에서 취소 클릭 시 로그아웃이 실행되지 않는다', async () => {
    // given
    renderPage('/settings/account')
    await waitFor(() => screen.getByText('test@example.com'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))
    await waitFor(() => screen.getByRole('dialog'))
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then: 다이얼로그가 닫히고 signOut은 호출되지 않는다
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('계정 삭제 실패 시 에러 토스트가 표시된다', async () => {
    // given
    vi.mocked(accountApi.deleteAccount).mockRejectedValue(new Error('fail'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderPage('/settings/account')
    await waitFor(() => screen.getByRole('button', { name: '계정 삭제' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '계정 삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some(t => t.key === 'settings.account_delete_failed' && t.type === 'error')).toBe(true)
    })
    warnSpy.mockRestore()
  })

  it('계정 삭제 버튼 클릭 → 확인 다이얼로그 → 확인 시 signOut이 호출된다', async () => {
    // given
    vi.mocked(accountApi.deleteAccount).mockResolvedValue({ status: 'ok' })
    renderPage('/settings/account')
    await waitFor(() => screen.getByRole('button', { name: '계정 삭제' }))

    // when
    await userEvent.click(screen.getByRole('button', { name: '계정 삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '확인' }))

    // then: authRepo.signOut이 실행됨
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })
})
