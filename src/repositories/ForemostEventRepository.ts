import type { ForemostEvent } from '../models'
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
}

export class ForemostEventRepository {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  // ── fetch: 서버 → 캐시 ────────────────────────────────────────────

  async fetch(): Promise<void> {
    try {
      const event = await this.deps.api.getForemostEvent()
      useForemostEventCache.getState().setEvent(event)
    } catch {
      useForemostEventCache.getState().setEvent(null)
    }
  }

  // ── mutate: api 호출 + 캐시 갱신 ──────────────────────────────────

  async set(eventId: string, isTodo: boolean): Promise<void> {
    const event = await this.deps.api.setForemostEvent({ event_id: eventId, is_todo: isTodo })
    useForemostEventCache.getState().setEvent(event)
  }

  async clear(): Promise<void> {
    await this.deps.api.removeForemostEvent()
    useForemostEventCache.getState().setEvent(null)
  }

  // ── observe: snapshot ────────────────────────────────────────────
  // hook 기반 구독은 src/repositories/hooks/ 디렉토리의 독립 함수로 제공한다.
  // Repository 클래스는 React를 모른다.

  getSnapshot(): ForemostEvent | null {
    return useForemostEventCache.getState().foremostEvent ?? null
  }
}
