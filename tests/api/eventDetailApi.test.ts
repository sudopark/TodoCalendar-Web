import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EventDetail } from '../../src/models'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('eventDetailApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })
    )
  })

  it('getEventDetail(id)가 /v1/event_details/:id로 GET 호출한다', async () => {
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    await eventDetailApi.getEventDetail('detail-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/event_details/detail-1')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('updateEventDetail(id, body)가 /v1/event_details/:id로 PUT 호출한다', async () => {
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    const body: EventDetail = { memo: 'Updated memo', url: 'https://example.com' }
    await eventDetailApi.updateEventDetail('detail-1', body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/event_details/detail-1')
    expect((options as RequestInit).method).toBe('PUT')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('deleteEventDetail(id)가 /v1/event_details/:id로 DELETE 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    await eventDetailApi.deleteEventDetail('detail-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/event_details/detail-1')
    expect((options as RequestInit).method).toBe('DELETE')
  })
})
