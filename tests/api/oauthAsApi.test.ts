import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOAuthAsApi } from '../../src/api/oauthAsApi'
import { InvalidChallengeError, OAuthAsTransientError } from '../../src/domain/errors/OAuthConsentError'

const BASE_URL = 'http://as.test'

describe('oauthAsApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('200 응답이면 ConsentClientInfo 를 camelCase 로 변환해 반환한다', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          client_name: 'Claude Desktop',
          redirect_uri_origin: 'https://claude.ai',
          scope: 'read:calendar write:calendar',
          resource: 'https://mcp.todo-calendar.com/mcp',
          expires_at: 1234567890000,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    const api = createOAuthAsApi(BASE_URL)
    const result = await api.fetchConsentClient('abc-123')

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://as.test/v1/oauth/consent/abc-123',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual({
      clientName: 'Claude Desktop',
      redirectUriOrigin: 'https://claude.ai',
      scopes: ['read:calendar', 'write:calendar'],
      resource: 'https://mcp.todo-calendar.com/mcp',
      expiresAt: 1234567890000,
    })
  })

  it('404 응답이면 InvalidChallengeError 를 throw 한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }))
    const api = createOAuthAsApi(BASE_URL)
    await expect(api.fetchConsentClient('abc')).rejects.toBeInstanceOf(InvalidChallengeError)
  })

  it('5xx 응답이면 OAuthAsTransientError 를 throw 한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))
    const api = createOAuthAsApi(BASE_URL)
    await expect(api.fetchConsentClient('abc')).rejects.toBeInstanceOf(OAuthAsTransientError)
  })

  it('네트워크 오류면 OAuthAsTransientError 를 throw 한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'))
    const api = createOAuthAsApi(BASE_URL)
    await expect(api.fetchConsentClient('abc')).rejects.toBeInstanceOf(OAuthAsTransientError)
  })

  it('Bearer 토큰을 보내지 않는다 (익명 호출)', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ client_name: '', redirect_uri_origin: '', scope: '', resource: '', expires_at: 0 }),
        { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    const api = createOAuthAsApi(BASE_URL)
    await api.fetchConsentClient('abc')
    const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string> | undefined
    expect(headers?.Authorization).toBeUndefined()
    expect(headers?.authorization).toBeUndefined()
  })
})
