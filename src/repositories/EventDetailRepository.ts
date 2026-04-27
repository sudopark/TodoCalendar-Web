import type { EventDetail } from '../models/EventDetail'

// ── API 인터페이스 명시적 정의 ────────────────────────────────────────
// eventDetailApi 모듈의 실제 시그니처와 동기를 유지해야 한다.
export interface EventDetailApi {
  getEventDetail(id: string): Promise<EventDetail>
  updateEventDetail(id: string, body: EventDetail): Promise<EventDetail>
}

interface Deps {
  api: EventDetailApi
}

export class EventDetailRepository {
  private readonly deps: Deps
  private readonly cache: Map<string, EventDetail | null> = new Map()

  constructor(deps: Deps) {
    this.deps = deps
  }

  async get(eventId: string): Promise<EventDetail | null> {
    if (this.cache.has(eventId)) {
      return this.cache.get(eventId) ?? null
    }
    try {
      const detail = await this.deps.api.getEventDetail(eventId)
      this.cache.set(eventId, detail)
      return detail
    } catch {
      this.cache.set(eventId, null)
      return null
    }
  }

  async save(eventId: string, detail: EventDetail): Promise<EventDetail> {
    const saved = await this.deps.api.updateEventDetail(eventId, detail)
    this.cache.set(eventId, saved)
    return saved
  }

  invalidate(eventId: string): void {
    this.cache.delete(eventId)
  }
}
