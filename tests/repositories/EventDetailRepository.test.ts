import { describe, it, expect, beforeEach } from 'vitest'
import type { EventDetail } from '../../src/models/EventDetail'
import type { EventDetailApi } from '../../src/repositories/EventDetailRepository'
import { EventDetailRepository } from '../../src/repositories/EventDetailRepository'

// ───────────────────────────── Fake API ──────────────────────────────

function makeFakeEventDetailApi(overrides: Partial<EventDetailApi> = {}): EventDetailApi {
  return {
    getEventDetail: overrides.getEventDetail ?? (async () => ({})),
    updateEventDetail: overrides.updateEventDetail ?? (async (_id, detail) => detail),
  }
}

// ───────────────────────────── 테스트 ──────────────────────────────

describe('EventDetailRepository', () => {
  let repo: EventDetailRepository

  beforeEach(() => {
    repo = new EventDetailRepository({ api: makeFakeEventDetailApi() })
  })

  it('save 후 같은 id 로 get 하면 save 한 값이 반환된다 (캐시 hit 검증)', async () => {
    // given: 서버는 다른 값을 반환하도록 셋업 — save 한 값이 그대로 나오면 캐시에서 반환된 것
    const serverDetail: EventDetail = { memo: 'from-server' }
    const savedDetail: EventDetail = { memo: 'saved-by-client', place: 'Seoul' }
    const api = makeFakeEventDetailApi({
      getEventDetail: async () => serverDetail,
      updateEventDetail: async () => savedDetail,
    })
    repo = new EventDetailRepository({ api })

    // when
    await repo.save('e1', { memo: 'x' })
    const result = await repo.get('e1')

    // then: 서버 값(from-server)이 아니라 save 응답값(saved-by-client)이 반환되어야 함
    expect(result).toEqual(savedDetail)
  })

  it('캐시에 없는 id 로 get 하면 서버에서 받아 반환하고, 두 번째 get 도 같은 값을 반환한다', async () => {
    // given
    const serverDetail: EventDetail = { memo: 'from-server', url: 'https://example.com' }
    const api = makeFakeEventDetailApi({
      getEventDetail: async () => serverDetail,
    })
    repo = new EventDetailRepository({ api })

    // when
    const first = await repo.get('e2')
    const second = await repo.get('e2')

    // then
    expect(first).toEqual(serverDetail)
    expect(second).toEqual(serverDetail)
  })

  it('서버 fetch 가 실패하면 null 을 반환하고 캐시에 null 로 저장한다', async () => {
    // given: getEventDetail 이 throw 하는 경우 (서버 요청 실패)
    const api = makeFakeEventDetailApi({
      getEventDetail: async () => {
        throw new Error('not found')
      },
    })
    repo = new EventDetailRepository({ api })

    // when: 첫 번째 호출 (실패)
    const result = await repo.get('e3')

    // then: null 반환
    expect(result).toBeNull()

    // 캐시에 null 로 저장됐는지 확인: 다시 get 해도 null 반환
    const second = await repo.get('e3')
    expect(second).toBeNull()
  })

  it('save 가 성공하면 서버 보강 필드 포함된 반환값으로 캐시가 갱신된다', async () => {
    // given: saveEventDetail 이 입력값에 서버 보강 필드 추가해 반환
    const enriched: EventDetail = { memo: 'x', place: 'server-added-place' }
    const api = makeFakeEventDetailApi({
      updateEventDetail: async () => enriched,
    })
    repo = new EventDetailRepository({ api })

    // when
    await repo.save('e4', { memo: 'x' })
    const result = await repo.get('e4')

    // then: 서버 보강 필드가 포함된 값 반환
    expect(result).toEqual(enriched)
  })

  it('invalidate 후 get 하면 다시 서버에서 받아온다', async () => {
    // given: 1차 캐시 저장 후, 서버 반환값을 교체
    let callCount = 0
    const responses: EventDetail[] = [
      { memo: 'first-response' },
      { memo: 'second-response' },
    ]
    const api = makeFakeEventDetailApi({
      getEventDetail: async () => responses[callCount++] ?? {},
    })
    repo = new EventDetailRepository({ api })

    // when: 1차 get → invalidate → 2차 get
    await repo.get('e5')
    repo.invalidate('e5')
    const result = await repo.get('e5')

    // then: invalidate 이후 서버에서 새 응답을 받아 반환
    expect(result).toEqual({ memo: 'second-response' })
  })
})
