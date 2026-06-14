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

  it('getForemostEvent()가 /v2/foremost/event로 GET 호출한다', async () => {
    const { foremostApi } = await import('../../src/api/foremostApi')
    await foremostApi.getForemostEvent()

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v2/foremost/event')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('setForemostEvent(body)가 /v2/foremost/event로 PUT 호출한다', async () => {
    const { foremostApi } = await import('../../src/api/foremostApi')
    const body = { event_id: 'todo-1', is_todo: true }
    await foremostApi.setForemostEvent(body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v2/foremost/event')
    expect((options as RequestInit).method).toBe('PUT')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  // #191 후속: foremost 의 embedded event(Todo|Schedule)도 repeating 을 가질 수 있으므로
  // scheduleApi/todoApi 와 동일하게 weekday 를 web 인코딩(getDay 0=일)으로 변환해야 한다.
  // 미변환 시 배너 클릭 → EventDetailPopover 의 describeRepeating 이 요일을 한 칸 밀어 표기한다.
  describe('weekday 인코딩 변환 (서버 1=일 ↔ web getDay 0=일)', () => {
    const serverForemost = {
      event_id: 'sch-rep',
      is_todo: false,
      event: {
        uuid: 'sch-rep',
        name: '매주 일요일',
        event_time: { time_type: 'at', timestamp: 1770267600 },
        repeating: {
          start: 1770267600,
          option: { optionType: 'every_week', interval: 1, dayOfWeek: [1], timeZone: 'Asia/Seoul' },
        },
      },
    }

    it('getForemostEvent 응답의 서버 요일(일=1)을 web getDay(일=0)로 변환한다', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(serverForemost), { status: 200, headers: { 'content-type': 'application/json' } })
      )
      const { foremostApi } = await import('../../src/api/foremostApi')
      const result = await foremostApi.getForemostEvent()
      expect((result.event as any).repeating.option.dayOfWeek).toEqual([0])
    })

    it('setForemostEvent 응답도 web getDay 로 변환한다', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(serverForemost), { status: 200, headers: { 'content-type': 'application/json' } })
      )
      const { foremostApi } = await import('../../src/api/foremostApi')
      const result = await foremostApi.setForemostEvent({ event_id: 'sch-rep', is_todo: false })
      expect((result.event as any).repeating.option.dayOfWeek).toEqual([0])
    })
  })

  it('removeForemostEvent()가 /v2/foremost/event로 DELETE 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { foremostApi } = await import('../../src/api/foremostApi')
    await foremostApi.removeForemostEvent()

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v2/foremost/event')
    expect((options as RequestInit).method).toBe('DELETE')
  })
})
