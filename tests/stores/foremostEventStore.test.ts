import { describe, it, expect, beforeEach } from 'vitest'
import { useForemostEventCache } from '../../src/repositories/caches/foremostEventCache'
import type { ForemostEvent } from '../../src/models'

describe('useForemostEventCache', () => {
  beforeEach(() => {
    useForemostEventCache.setState({ foremostEvent: null })
  })

  it('setEvent 호출 시 foremostEvent가 세팅된다', () => {
    // given
    const event: ForemostEvent = {
      event_id: 'fe1',
      is_todo: true,
      event: { uuid: 'fe1', name: '중요 할 일', is_current: false, event_time: null },
    }

    // when
    useForemostEventCache.getState().setEvent(event)

    // then
    expect(useForemostEventCache.getState().foremostEvent).toEqual(event)
  })

  it('setEvent(null) 호출 시 foremostEvent가 null이 된다', () => {
    // given
    useForemostEventCache.setState({ foremostEvent: { event_id: 'fe1', is_todo: true } as ForemostEvent })

    // when
    useForemostEventCache.getState().setEvent(null)

    // then
    expect(useForemostEventCache.getState().foremostEvent).toBeNull()
  })

  it('reset 호출 시 foremostEvent가 null이 된다', () => {
    // given: foremostEvent가 설정된 상태
    useForemostEventCache.setState({ foremostEvent: { event_id: 'e1', is_todo: true } as ForemostEvent })

    // when
    useForemostEventCache.getState().reset()

    // then
    expect(useForemostEventCache.getState().foremostEvent).toBeNull()
  })
})
