import type { ForemostEvent } from '../models'
import type { LocalStorageContainer } from './local-storage/LocalStorageContainer'
import { useForemostEventCache } from './caches/foremostEventCache'

// ── API 인터페이스 명시적 정의 ────────────────────────────────────────
// foremostApi 모듈의 실제 시그니처와 동기를 유지해야 한다.

export interface ForemostEventApi {
  getForemostEvent(): Promise<ForemostEvent>
  setForemostEvent(body: { event_id: string; is_todo: boolean }): Promise<ForemostEvent>
  removeForemostEvent(): Promise<{ status: string }>
}

interface Deps {
  api: ForemostEventApi
  localStorageContainer?: LocalStorageContainer
}

export class ForemostEventRepository {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  // ── fetch: LocalStorage 우선 → Remote 갱신 ──────────────────────

  async fetch(): Promise<void> {
    const local = this.deps.localStorageContainer

    // 1. Cache-first: LocalStorage → 메모리 즉시 반영
    if (local?.isInitialized()) {
      try {
        const cached = await local.foremost().load()
        if (cached) {
          useForemostEventCache.getState().setEvent(cached)
        }
      } catch (e) {
        console.warn('LocalStorage foremost cache read 실패:', e)
      }
    }

    // 2. Remote: 응답으로 메모리·LocalStorage 갱신
    try {
      const event = await this.deps.api.getForemostEvent()
      useForemostEventCache.getState().setEvent(event)
      if (local?.isInitialized()) {
        try { await local.foremost().save(event) } catch {}
      }
    } catch {
      useForemostEventCache.getState().setEvent(null)
      // LocalStorage 는 그대로 보존 — 다음 세션 cache hit
    }
  }

  // ── mutate: api 호출 + 캐시 갱신 ──────────────────────────────────

  async set(eventId: string, isTodo: boolean): Promise<void> {
    const event = await this.deps.api.setForemostEvent({ event_id: eventId, is_todo: isTodo })
    const local = this.deps.localStorageContainer
    if (local?.isInitialized()) {
      try { await local.foremost().save(event) } catch (e) { console.warn('LocalStorage foremost set 실패:', e) }
    }
    useForemostEventCache.getState().setEvent(event)
  }

  async clear(): Promise<void> {
    await this.deps.api.removeForemostEvent()
    const local = this.deps.localStorageContainer
    if (local?.isInitialized()) {
      try { await local.foremost().remove() } catch (e) { console.warn('LocalStorage foremost clear 실패:', e) }
    }
    useForemostEventCache.getState().setEvent(null)
  }

  // ── observe: snapshot ────────────────────────────────────────────
  // hook 기반 구독은 src/repositories/hooks/ 디렉토리의 독립 함수로 제공한다.
  // Repository 클래스는 React를 모른다.

  getSnapshot(): ForemostEvent | null {
    return useForemostEventCache.getState().foremostEvent ?? null
  }
}
