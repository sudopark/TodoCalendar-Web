import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

  it('계정 섹션에서 로그아웃 버튼 클릭 시 signOut이 호출된다', async () => {
    // given
    renderPage('/settings/account')
    await waitFor(() => screen.getByText('test@example.com'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    // then: authRepo.signOut이 실행되어 mockSignOut이 호출됨
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
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
