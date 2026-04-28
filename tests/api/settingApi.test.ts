import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('settingApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })
    )
  })

  it('getDefaultTagColors()가 /v1/setting/event/tag/default/color로 GET 호출한다', async () => {
    const { settingApi } = await import('../../src/api/settingApi')
    await settingApi.getDefaultTagColors()

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/setting/event/tag/default/color')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('updateDefaultTagColors(body)가 /v1/setting/event/tag/default/color로 PATCH 호출한다', async () => {
    const { settingApi } = await import('../../src/api/settingApi')
    const body = { holiday: '#FF0000', schedule: '#00FF00' }
    await settingApi.updateDefaultTagColors(body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/setting/event/tag/default/color')
    expect((options as RequestInit).method).toBe('PATCH')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })
})
