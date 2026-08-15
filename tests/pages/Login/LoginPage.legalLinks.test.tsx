import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../../../src/pages/Login/LoginPage'
import '../../../src/i18n'

vi.mock('../../../src/stores/authStore', () => ({
  useAuthStore: (selector: (s: { account: null }) => unknown) => selector({ account: null }),
}))

vi.mock('../../../src/pages/Login/useLoginViewModel', () => ({
  useLoginViewModel: () => ({
    loading: false,
    errorKey: null,
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
  }),
}))

describe('LoginPage 법적 고지 링크', () => {
  it('미로그인 화면 하단에서 약관과 개인정보처리방침으로 갈 수 있다', () => {
    // given / when
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    // then
    expect(screen.getByTestId('login-terms-link')).toHaveAttribute('href', '/terms')
    expect(screen.getByTestId('login-privacy-link')).toHaveAttribute('href', '/privacy')
  })
})
