import { describe, it, expect, beforeEach, vi } from 'vitest'

// Firebase 연쇄 초기화 차단
vi.mock('../../src/firebase', () => ({ auth: {} }))
// foremostApi는 캐시 내부에서 임포트되지 않으므로 차단 불필요하지만
// foremostEventStore가 내부적으로 가져오므로 차단
vi.mock('../../src/api/foremostApi', () => ({ foremostApi: {} }))

import { ForemostEventRepository } from '../../src/repositories/ForemostEventRepository'
import { useForemostEventCache } from '../../src/repositories/caches/foremostEventCache'
import type { ForemostEventApi } from '../../src/repositories/ForemostEventRepository'
import type { ForemostEvent } from '../../src/models'

// ──────────────────────── helpers ────────────────────────

function makeEvent(id: string, isTodo = true): ForemostEvent {
  return {
    event_id: id,
    is_todo: isTodo,
    event: { uuid: id, name: `이벤트-${id}`, is_current: false },
  }
}

function makeFakeApi(overrides: Partial<ForemostEventApi> = {}): ForemostEventApi {
  return {
    getForemostEvent: overrides.getForemostEvent ?? vi.fn(async () => makeEvent('default')),
    setForemostEvent: overrides.setForemostEvent ?? vi.fn(async () => makeEvent('default')),
    removeForemostEvent: overrides.removeForemostEvent ?? vi.fn(async () => ({ status: 'ok' })),
  }
}

function resetCache() {
  useForemostEventCache.getState().reset()
}

// ──────────────────────── fetch ────────────────────────

describe('ForemostEventRepository — fetch', () => {
  beforeEach(resetCache)

  it('API 응답이 캐시 foremostEvent에 반영된다', async () => {
    // given
    const event = makeEvent('fe1')
    const repo = new ForemostEventRepository({
      api: makeFakeApi({ getForemostEvent: vi.fn(async () => event) }),
    })

    // when
    await repo.fetch()

    // then
    expect(repo.getSnapshot()).toEqual(event)
  })

  it('API가 예외를 던지면 캐시가 null이 된다', async () => {
    // given: 기존 캐시에 이벤트가 있는 상태
    useForemostEventCache.setState({ foremostEvent: makeEvent('fe1') })
    const repo = new ForemostEventRepository({
      api: makeFakeApi({ getForemostEvent: vi.fn(async () => { throw new Error('network error') }) }),
    })

    // when
    await repo.fetch()

    // then: 캐시가 null로 초기화됨
    expect(repo.getSnapshot()).toBeNull()
  })
})

// ──────────────────────── set ────────────────────────

describe('ForemostEventRepository — set', () => {
  beforeEach(resetCache)

  it('setForemost 후 API 응답이 캐시에 반영된다', async () => {
    // given
    const event = makeEvent('e1', true)
    const repo = new ForemostEventRepository({
      api: makeFakeApi({ setForemostEvent: vi.fn(async () => event) }),
    })

    // when
    await repo.set('e1', true)

    // then
    expect(repo.getSnapshot()).toEqual(event)
  })
})

// ──────────────────────── clear ────────────────────────

describe('ForemostEventRepository — clear', () => {
  beforeEach(resetCache)

  it('clear 후 캐시가 null이 된다', async () => {
    // given: 캐시에 이벤트가 있는 상태
    useForemostEventCache.setState({ foremostEvent: makeEvent('e1') })
    const repo = new ForemostEventRepository({
      api: makeFakeApi({ removeForemostEvent: vi.fn(async () => ({ status: 'ok' })) }),
    })

    // when
    await repo.clear()

    // then
    expect(repo.getSnapshot()).toBeNull()
  })
})

// ──────────────────────── getSnapshot ────────────────────────

describe('ForemostEventRepository — getSnapshot', () => {
  beforeEach(resetCache)

  it('캐시에 있는 foremostEvent를 반환한다', () => {
    // given
    const event = makeEvent('fe3')
    useForemostEventCache.setState({ foremostEvent: event })
    const repo = new ForemostEventRepository({ api: makeFakeApi() })

    // when
    const snapshot = repo.getSnapshot()

    // then
    expect(snapshot).toEqual(event)
  })

  it('캐시가 비어있으면 null을 반환한다', () => {
    // given: 캐시 초기화 상태
    const repo = new ForemostEventRepository({ api: makeFakeApi() })

    // when
    const snapshot = repo.getSnapshot()

    // then
    expect(snapshot).toBeNull()
  })
})
