import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('accountApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )
  })

  it('deleteAccount()가 /v1/accounts/account로 DELETE 호출한다', async () => {
    const { accountApi } = await import('../../src/api/accountApi')
    await accountApi.deleteAccount()

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/accounts/account')
    expect((options as RequestInit).method).toBe('DELETE')
  })
})
