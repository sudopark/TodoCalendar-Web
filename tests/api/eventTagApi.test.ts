import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('eventTagApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    )
  })

  it('getAllTags()가 /v1/tags/all로 GET 호출한다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    await eventTagApi.getAllTags()

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/tags/all')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('createTag(body)가 /v1/tags/tag로 POST 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'tag-1', name: 'Work' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { eventTagApi } = await import('../../src/api/eventTagApi')
    const body = { name: 'Work', color_hex: '#FF0000' }
    await eventTagApi.createTag(body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/tags/tag')
    expect((options as RequestInit).method).toBe('POST')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('updateTag(id, body)가 /v1/tags/tag/:id로 PUT 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'tag-1', name: 'Personal' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { eventTagApi } = await import('../../src/api/eventTagApi')
    const body = { name: 'Personal', color_hex: '#00FF00' }
    await eventTagApi.updateTag('tag-1', body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/tags/tag/tag-1')
    expect((options as RequestInit).method).toBe('PUT')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('deleteTag(id)가 /v1/tags/tag/:id로 DELETE 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { eventTagApi } = await import('../../src/api/eventTagApi')
    await eventTagApi.deleteTag('tag-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/tags/tag/tag-1')
    expect((options as RequestInit).method).toBe('DELETE')
  })

  it('deleteTagAndEvents(id)가 /v1/tags/tag_and_events/:id로 DELETE 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { eventTagApi } = await import('../../src/api/eventTagApi')
    await eventTagApi.deleteTagAndEvents('tag-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/tags/tag_and_events/tag-1')
    expect((options as RequestInit).method).toBe('DELETE')
  })
})
