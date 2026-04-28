import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useForemostEventCache } from '../../src/repositories/caches/foremostEventCache'
import { foremostApi } from '../../src/api/foremostApi'

vi.mock('../../src/api/foremostApi', () => ({
  foremostApi: {
    getForemostEvent: vi.fn(),
    setForemostEvent: vi.fn(),
    removeForemostEvent: vi.fn(),
  },
}))

describe('useForemostEventCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useForemostEventCache.setState({ foremostEvent: null })
  })

  it('fetch 성공 시 foremostEvent가 세팅된다', async () => {
    // given: API가 foremost 이벤트를 반환
    const event = {
      event_id: 'fe1',
      is_todo: true,
      event: { uuid: 'fe1', name: '중요 할 일', is_current: false, event_time: null },
    }
    vi.mocked(foremostApi.getForemostEvent).mockResolvedValue(event as any)

    // when: fetch 실행
    await useForemostEventCache.getState().fetch()

    // then: foremostEvent가 세팅됨
    expect(useForemostEventCache.getState().foremostEvent).toEqual(event)
  })

  it('fetch 실패 시 foremostEvent는 null이 되고 경고 로그를 남긴다', async () => {
    // given: API가 실패하고 스토어에 기존 이벤트가 있음
    useForemostEventCache.setState({ foremostEvent: { event_id: 'fe1', is_todo: true } as any })
    vi.mocked(foremostApi.getForemostEvent).mockRejectedValue(new Error('network error'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // when: fetch 실행
    await useForemostEventCache.getState().fetch().catch(() => {})

    // then: foremostEvent가 null로 초기화됨
    expect(useForemostEventCache.getState().foremostEvent).toBeNull()

    warnSpy.mockRestore()
  })

  it('setForemost 호출 시 foremostEvent가 API 응답으로 갱신된다', async () => {
    // given
    const event = { event_id: 'e1', is_todo: true, event: { uuid: 'e1', name: '할 일', is_current: false } }
    vi.mocked(foremostApi.setForemostEvent).mockResolvedValue(event as any)

    // when
    await useForemostEventCache.getState().setForemost('e1', true)

    // then
    expect(useForemostEventCache.getState().foremostEvent).toEqual(event)
  })

  it('reset 호출 시 foremostEvent가 null이 된다', () => {
    // given: foremostEvent가 설정된 상태
    useForemostEventCache.setState({ foremostEvent: { event_id: 'e1', is_todo: true } as any })
    // when: reset 호출
    useForemostEventCache.getState().reset()
    // then: null
    expect(useForemostEventCache.getState().foremostEvent).toBeNull()
  })

  it('removeForemost 호출 시 foremostEvent가 null이 된다', async () => {
    // given
    useForemostEventCache.setState({ foremostEvent: { event_id: 'e1', is_todo: true } as any })
    vi.mocked(foremostApi.removeForemostEvent).mockResolvedValue({ status: 'ok' })

    // when
    await useForemostEventCache.getState().removeForemost()

    // then
    expect(useForemostEventCache.getState().foremostEvent).toBeNull()
  })
})
