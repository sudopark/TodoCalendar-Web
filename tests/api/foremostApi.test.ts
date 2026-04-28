import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('foremostApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })
    )
  })

  it('getForemostEvent()가 /v1/foremost/event로 GET 호출한다', async () => {
    const { foremostApi } = await import('../../src/api/foremostApi')
    await foremostApi.getForemostEvent()

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/foremost/event')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('setForemostEvent(body)가 /v1/foremost/event로 PUT 호출한다', async () => {
    const { foremostApi } = await import('../../src/api/foremostApi')
    const body = { event_id: 'todo-1', is_todo: true }
    await foremostApi.setForemostEvent(body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/foremost/event')
    expect((options as RequestInit).method).toBe('PUT')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('removeForemostEvent()가 /v1/foremost/event로 DELETE 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { foremostApi } = await import('../../src/api/foremostApi')
    await foremostApi.removeForemostEvent()

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/foremost/event')
    expect((options as RequestInit).method).toBe('DELETE')
  })
})
