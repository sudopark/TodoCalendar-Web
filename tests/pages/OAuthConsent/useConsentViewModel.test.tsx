import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useConsentViewModel } from '../../../src/pages/OAuthConsent/useConsentViewModel'
import { InvalidChallengeError, OAuthAsTransientError } from '../../../src/domain/errors/OAuthConsentError'
import type { ConsentClientInfo } from '../../../src/models/oauthConsent'

const sampleInfo: ConsentClientInfo = {
  clientName: 'Claude Desktop',
  redirectUriOrigin: 'https://claude.ai',
  scopes: ['read:calendar'],
  resource: 'https://mcp.todo-calendar.com/mcp',
  expiresAt: 0,
}

vi.mock('../../../src/composition/RepositoriesProvider', () => ({
  useRepositories: () => ({
    oauthConsentRepo: { fetchClientInfo: mockFetch },
  }),
}))

vi.mock('../../../src/stores/authStore', () => ({
  useAuthStore: (selector: (s: { account: { uid: string; email: string } | null; loading: boolean }) => unknown) =>
    selector(authStateMock),
}))

let mockFetch: (challenge: string) => Promise<ConsentClientInfo>
let authStateMock: { account: { uid: string; email: string } | null; loading: boolean }

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('useConsentViewModel', () => {
  it('challenge 형식 위반(빈 값) → state = invalid_query', async () => {
    mockFetch = vi.fn()
    authStateMock = { account: { uid: 'u', email: 'a@b.c' }, loading: false }

    const { result } = renderHook(() => useConsentViewModel(''), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('invalid_query'))
  })

  it('challenge 형식 위반(특수문자) → invalid_query', async () => {
    mockFetch = vi.fn()
    authStateMock = { account: { uid: 'u', email: 'a@b.c' }, loading: false }
    const { result } = renderHook(() => useConsentViewModel('!!!bad!!!'), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('invalid_query'))
  })

  it('account 가 null 이면 state = redirect_to_login (challenge 형식은 OK)', async () => {
    mockFetch = vi.fn()
    authStateMock = { account: null, loading: false }
    const { result } = renderHook(() => useConsentViewModel('valid-challenge-123'), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('redirect_to_login'))
  })

  it('auth loading 중이면 state = loading', async () => {
    mockFetch = vi.fn()
    authStateMock = { account: null, loading: true }
    const { result } = renderHook(() => useConsentViewModel('valid-challenge-123'), { wrapper })
    expect(result.current.state).toBe('loading')
  })

  it('fetch 성공 → state = ready + clientInfo', async () => {
    mockFetch = vi.fn(async () => sampleInfo)
    authStateMock = { account: { uid: 'u', email: 'a@b.c' }, loading: false }
    const { result } = renderHook(() => useConsentViewModel('valid-challenge-123'), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('ready'))
    expect(result.current.clientInfo).toEqual(sampleInfo)
  })

  it('fetch InvalidChallengeError → state = redirect_to_error', async () => {
    mockFetch = vi.fn(async () => { throw new InvalidChallengeError() })
    authStateMock = { account: { uid: 'u', email: 'a@b.c' }, loading: false }
    const { result } = renderHook(() => useConsentViewModel('valid-challenge-123'), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('redirect_to_error'))
  })

  it('fetch OAuthAsTransientError → state = transient_error + retry 가능', async () => {
    let attempt = 0
    mockFetch = vi.fn(async () => {
      attempt++
      if (attempt === 1) throw new OAuthAsTransientError(503)
      return sampleInfo
    })
    authStateMock = { account: { uid: 'u', email: 'a@b.c' }, loading: false }
    const { result } = renderHook(() => useConsentViewModel('valid-challenge-123'), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('transient_error'))
    result.current.retry?.()
    await waitFor(() => expect(result.current.state).toBe('ready'))
  })

  it('fetch 응답의 redirect_uri_origin 이 origin 형식 위반(path 포함) → state = redirect_to_error', async () => {
    mockFetch = vi.fn(async () => ({
      ...sampleInfo,
      redirectUriOrigin: 'https://claude.ai/some/path',
    }))
    authStateMock = { account: { uid: 'u', email: 'a@b.c' }, loading: false }
    const { result } = renderHook(() => useConsentViewModel('valid-challenge-123'), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('redirect_to_error'))
  })

  it('loopback origin (http://127.0.0.1:5173) 은 통과', async () => {
    mockFetch = vi.fn(async () => ({
      ...sampleInfo,
      redirectUriOrigin: 'http://127.0.0.1:5173',
    }))
    authStateMock = { account: { uid: 'u', email: 'a@b.c' }, loading: false }
    const { result } = renderHook(() => useConsentViewModel('valid-challenge-123'), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('ready'))
  })
})
