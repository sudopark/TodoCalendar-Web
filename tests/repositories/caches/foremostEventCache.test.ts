import { describe, it, expect, beforeEach } from 'vitest'
import { useForemostEventCache } from '../../../src/repositories/caches/foremostEventCache'
import type { ForemostEvent } from '../../../src/models'

function makeEvent(id: string): ForemostEvent {
  return {
    event_id: id,
    is_todo: true,
    event: { uuid: id, name: `이벤트-${id}`, is_current: false },
  }
}

describe('useForemostEventCache', () => {
  beforeEach(() => {
    useForemostEventCache.getState().reset()
  })

  it('setEvent 호출 시 foremostEvent가 갱신된다', () => {
    // given
    const event = makeEvent('fe1')

    // when
    useForemostEventCache.getState().setEvent(event)

    // then
    expect(useForemostEventCache.getState().foremostEvent).toEqual(event)
  })

  it('setEvent(null) 호출 시 foremostEvent가 null이 된다', () => {
    // given: 기존 이벤트가 세팅된 상태
    useForemostEventCache.setState({ foremostEvent: makeEvent('fe1') })

    // when
    useForemostEventCache.getState().setEvent(null)

    // then
    expect(useForemostEventCache.getState().foremostEvent).toBeNull()
  })

  it('reset 호출 시 foremostEvent가 null이 된다', () => {
    // given: 이벤트가 세팅된 상태
    useForemostEventCache.setState({ foremostEvent: makeEvent('fe2') })

    // when
    useForemostEventCache.getState().reset()

    // then
    expect(useForemostEventCache.getState().foremostEvent).toBeNull()
  })
})
