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
    expect(String(url)).toContain('/v2/schedules')
    expect(String(url)).toContain('lower=1000000')
    expect(String(url)).toContain('upper=2000000')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('getSchedule(id)가 /v2/schedules/schedule/:id로 GET 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'sched-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { scheduleApi } = await import('../../src/api/scheduleApi')
    await scheduleApi.getSchedule('sched-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v2/schedules/schedule/sched-1')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('createSchedule(body)가 /v2/schedules/schedule로 POST 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'sched-2' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const eventTime: EventTime = { time_type: 'at', timestamp: 1714000000 }
    const body = { name: 'Team Meeting', event_time: eventTime }
    await scheduleApi.createSchedule(body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v2/schedules/schedule')
    expect((options as RequestInit).method).toBe('POST')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('updateSchedule(id, body)가 /v2/schedules/schedule/:id로 PUT 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'sched-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const body = { name: 'Updated Meeting' }
    await scheduleApi.updateSchedule('sched-1', body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v2/schedules/schedule/sched-1')
    expect((options as RequestInit).method).toBe('PUT')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('excludeRepeating(id, body)가 /v2/schedules/schedule/:id/exclude로 PATCH 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'sched-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const body = { exclude_repeatings: [1714000000] }
    await scheduleApi.excludeRepeating('sched-1', body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v2/schedules/schedule/sched-1/exclude')
    expect((options as RequestInit).method).toBe('PATCH')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  describe('weekday 인코딩 변환 (서버 1=일..7=토 ↔ web getDay 0=일..6=토)', () => {
    const serverSchedule = {
      uuid: 'sched-rep',
      name: '정기청소',
      event_time: { time_type: 'period', period_start: 1770267600, period_end: 1770282000 },
      repeating: {
        start: 1770267600,
        option: { optionType: 'every_week', interval: 2, dayOfWeek: [5], timeZone: 'Asia/Seoul' },
      },
    }

    it('getSchedules 응답의 서버 요일(목=5)을 web getDay(목=4)로 변환해 돌려준다', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify([serverSchedule]), { status: 200, headers: { 'content-type': 'application/json' } })
      )
      const { scheduleApi } = await import('../../src/api/scheduleApi')
      const [schedule] = await scheduleApi.getSchedules(0, 2_000_000_000)
      expect((schedule.repeating!.option as any).dayOfWeek).toEqual([4])
    })

    it('getSchedule 응답도 web getDay 로 변환한다', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(serverSchedule), { status: 200, headers: { 'content-type': 'application/json' } })
      )
      const { scheduleApi } = await import('../../src/api/scheduleApi')
      const schedule = await scheduleApi.getSchedule('sched-rep')
      expect((schedule.repeating!.option as any).dayOfWeek).toEqual([4])
    })

    it('createSchedule 은 web getDay(목=4)를 서버 요일(목=5)로 변환해 전송하고, 응답은 다시 web 으로 변환한다', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(serverSchedule), { status: 200, headers: { 'content-type': 'application/json' } })
      )
      const { scheduleApi } = await import('../../src/api/scheduleApi')
      const created = await scheduleApi.createSchedule({
        name: '정기청소',
        event_time: { time_type: 'period', period_start: 1770267600, period_end: 1770282000 },
        repeating: {
          start: 1770267600,
          option: { optionType: 'every_week', interval: 2, dayOfWeek: [4], timeZone: 'Asia/Seoul' },
        },
      })
      const sentBody = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
      expect(sentBody.repeating.option.dayOfWeek).toEqual([5])
      expect((created.repeating!.option as any).dayOfWeek).toEqual([4])
    })

    it('updateSchedule 도 요청 body 의 요일을 서버 인코딩으로 변환해 전송한다', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(serverSchedule), { status: 200, headers: { 'content-type': 'application/json' } })
      )
      const { scheduleApi } = await import('../../src/api/scheduleApi')
      await scheduleApi.updateSchedule('sched-rep', {
        repeating: {
          start: 1770267600,
          option: { optionType: 'every_week', interval: 2, dayOfWeek: [4], timeZone: 'Asia/Seoul' },
        },
      })
      const sentBody = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
      expect(sentBody.repeating.option.dayOfWeek).toEqual([5])
    })

    it('excludeRepeating 응답도 web getDay 로 변환한다', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(serverSchedule), { status: 200, headers: { 'content-type': 'application/json' } })
      )
      const { scheduleApi } = await import('../../src/api/scheduleApi')
      const updated = await scheduleApi.excludeRepeating('sched-rep', { exclude_repeatings: [2] })
      expect((updated.repeating!.option as any).dayOfWeek).toEqual([4])
    })
  })

  it('deleteSchedule(id)가 /v2/schedules/schedule/:id로 DELETE 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { scheduleApi } = await import('../../src/api/scheduleApi')
    await scheduleApi.deleteSchedule('sched-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v2/schedules/schedule/sched-1')
    expect((options as RequestInit).method).toBe('DELETE')
  })
})
