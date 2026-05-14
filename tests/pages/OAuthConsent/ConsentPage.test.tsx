import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ConsentPage } from '../../../src/pages/OAuthConsent/ConsentPage'
import type { ConsentClientInfo } from '../../../src/models/oauthConsent'
import '../../../src/i18n'

const sampleInfo: ConsentClientInfo = {
  clientName: 'Claude Desktop',
  redirectUriOrigin: 'https://claude.ai',
  scopes: ['read:calendar', 'write:calendar'],
  resource: 'https://mcp.todo-calendar.com/mcp',
  expiresAt: 0,
}

let mockFetch: (challenge: string) => Promise<ConsentClientInfo>
let authStateMock: { account: { uid: string; email: string } | null; loading: boolean }

vi.mock('../../../src/composition/RepositoriesProvider', () => ({
  useRepositories: () => ({
    oauthConsentRepo: { fetchClientInfo: (c: string) => mockFetch(c) },
  }),
}))

vi.mock('../../../src/stores/authStore', () => ({
  useAuthStore: (selector: (s: typeof authStateMock) => unknown) => selector(authStateMock),
}))

vi.mock('../../../src/firebase', () => ({
  getAuthInstance: () => ({ currentUser: { getIdToken: async () => 'fresh-token' } }),
}))

vi.stubEnv('VITE_OAUTH_AS_BASE_URL', 'http://as.test')

function Loc() {
  const loc = useLocation()
  return <div data-testid="loc">{`${loc.pathname}${loc.search}`}</div>
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/oauth/consent" element={<ConsentPage />} />
        <Route path="/login" element={<Loc />} />
        <Route path="/oauth/consent/error" element={<Loc />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ConsentPage', () => {
  it('정상 fetch → client_name + scope 라벨 + Allow/Deny 버튼 표시', async () => {
    mockFetch = vi.fn(async () => sampleInfo)
    authStateMock = { account: { uid: 'u', email: 'me@x.com' }, loading: false }

    renderAt('/oauth/consent?challenge=valid-challenge-1234')

    await waitFor(() => expect(screen.getByText(/Claude Desktop/)).toBeInTheDocument())
    expect(screen.getByText(/캘린더 데이터 조회/)).toBeInTheDocument()
    expect(screen.getByText(/캘린더 작성·수정·삭제/)).toBeInTheDocument()
    expect(screen.getByText(/me@x\.com/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /허용/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /거부/ })).toBeInTheDocument()
  })

  it('account null → /login 으로 navigate (state.from 에 consent URL 보존)', async () => {
    mockFetch = vi.fn()
    authStateMock = { account: null, loading: false }

    renderAt('/oauth/consent?challenge=valid-challenge-1234')

    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/login'))
  })

  it('challenge 형식 위반 → /oauth/consent/error 로 navigate', async () => {
    mockFetch = vi.fn()
    authStateMock = { account: { uid: 'u', email: 'a' }, loading: false }

    renderAt('/oauth/consent?challenge=bad')

    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/oauth/consent/error'))
  })

  it('fetch InvalidChallengeError → /oauth/consent/error 로 navigate', async () => {
    const { InvalidChallengeError } = await import('../../../src/domain/errors/OAuthConsentError')
    mockFetch = vi.fn(async () => { throw new InvalidChallengeError() })
    authStateMock = { account: { uid: 'u', email: 'a' }, loading: false }

    renderAt('/oauth/consent?challenge=valid-challenge-1234')

    await waitFor(() =>
      expect(screen.getByTestId('loc')).toHaveTextContent('/oauth/consent/error?reason=invalid_challenge')
    )
  })

  it('fetch transient → 일시 오류 안내 + 다시 시도 버튼', async () => {
    const { OAuthAsTransientError } = await import('../../../src/domain/errors/OAuthConsentError')
    mockFetch = vi.fn(async () => { throw new OAuthAsTransientError(503) })
    authStateMock = { account: { uid: 'u', email: 'a' }, loading: false }

    renderAt('/oauth/consent?challenge=valid-challenge-1234')

    await waitFor(() => expect(screen.getByText(/일시적 오류/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument()
  })
})
