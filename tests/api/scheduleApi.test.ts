import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EventTime } from '../../src/models'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('scheduleApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    )
  })

  it('getSchedules(lower, upper)가 올바른 URL로 GET 호출한다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    await scheduleApi.getSchedules(1000000, 2000000)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/schedules')
    expect(String(url)).toContain('lower=1000000')
    expect(String(url)).toContain('upper=2000000')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('getSchedule(id)가 /v1/schedules/schedule/:id로 GET 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'sched-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { scheduleApi } = await import('../../src/api/scheduleApi')
    await scheduleApi.getSchedule('sched-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/schedules/schedule/sched-1')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('createSchedule(body)가 /v1/schedules/schedule로 POST 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'sched-2' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const eventTime: EventTime = { time_type: 'at', timestamp: 1714000000 }
    const body = { name: 'Team Meeting', event_time: eventTime }
    await scheduleApi.createSchedule(body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/schedules/schedule')
    expect((options as RequestInit).method).toBe('POST')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('updateSchedule(id, body)가 /v1/schedules/schedule/:id로 PUT 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'sched-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const body = { name: 'Updated Meeting' }
    await scheduleApi.updateSchedule('sched-1', body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/schedules/schedule/sched-1')
    expect((options as RequestInit).method).toBe('PUT')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('excludeRepeating(id, body)가 /v1/schedules/schedule/:id/exclude로 PATCH 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'sched-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const body = { exclude_repeatings: [1714000000] }
    await scheduleApi.excludeRepeating('sched-1', body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/schedules/schedule/sched-1/exclude')
    expect((options as RequestInit).method).toBe('PATCH')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('deleteSchedule(id)가 /v1/schedules/schedule/:id로 DELETE 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { scheduleApi } = await import('../../src/api/scheduleApi')
    await scheduleApi.deleteSchedule('sched-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/schedules/schedule/sched-1')
    expect((options as RequestInit).method).toBe('DELETE')
  })
})
