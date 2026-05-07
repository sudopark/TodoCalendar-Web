import type { EventDetail } from '../models/EventDetail'
import type { LocalStorageContainer } from './local-storage/LocalStorageContainer'

// ── API 인터페이스 명시적 정의 ────────────────────────────────────────
// eventDetailApi 모듈의 실제 시그니처와 동기를 유지해야 한다.
export interface EventDetailApi {
  getEventDetail(id: string): Promise<EventDetail>
  updateEventDetail(id: string, body: EventDetail): Promise<EventDetail>
}

interface Deps {
  api: EventDetailApi
  localStorageContainer?: LocalStorageContainer
}

export class EventDetailRepository {
  private readonly deps: Deps
  private readonly cache: Map<string, EventDetail | null> = new Map()
  private readonly generations: Map<string, number> = new Map()

  constructor(deps: Deps) {
    this.deps = deps
  }

  private currentGeneration(id: string): number {
    return this.generations.get(id) ?? 0
  }

  private bumpGeneration(id: string): number {
    const next = (this.generations.get(id) ?? 0) + 1
    this.generations.set(id, next)
    return next
  }

  async get(eventId: string): Promise<EventDetail | null> {
    // 1. In-memory cache 적중 — 즉시 반환
    if (this.cache.has(eventId)) {
      return this.cache.get(eventId) ?? null
    }

    // 2. LocalStorage cache-first — 즉시 반환 + 백그라운드 Remote 갱신
    const local = this.deps.localStorageContainer
    if (local?.isInitialized()) {
      try {
        const cached = await local.eventDetail().loadDetail(eventId)
        if (cached) {
          this.cache.set(eventId, cached)
          // generation 캡처: bg refresh 가 save/invalidate 이후 완료되면 무시한다
          const refreshGen = this.currentGeneration(eventId)
          // 백그라운드 refresh — Remote 응답이 다르면 in-memory + LocalStorage 갱신
          ;(async () => {
            try {
              const remote = await this.deps.api.getEventDetail(eventId)
              if (remote && this.currentGeneration(eventId) === refreshGen) {
                this.cache.set(eventId, remote)
                if (local.isInitialized()) {
                  try { await local.eventDetail().saveDetail(eventId, remote) } catch {}
                }
              }
            } catch {
              // 백그라운드 실패는 cached 그대로 유지
            }
          })()
          return cached
        }
      } catch (e) {
        console.warn('LocalStorage event detail cache read 실패:', e)
      }
    }

    // 3. Remote
    try {
      const detail = await this.deps.api.getEventDetail(eventId)
      this.cache.set(eventId, detail)
      if (local?.isInitialized() && detail) {
        try { await local.eventDetail().saveDetail(eventId, detail) } catch {}
      }
      return detail
    } catch {
      this.cache.set(eventId, null)
      return null
    }
  }

  async save(eventId: string, detail: EventDetail): Promise<EventDetail> {
    const saved = await this.deps.api.updateEventDetail(eventId, detail)
    // bg refresh 가 save 보다 나중에 완료되어도 stale Remote 로 덮어쓰지 않도록 generation bump
    this.bumpGeneration(eventId)
    const local = this.deps.localStorageContainer
    if (local?.isInitialized()) {
      try { await local.eventDetail().saveDetail(eventId, saved) } catch (e) { console.warn('LocalStorage event detail save 실패:', e) }
    }
    this.cache.set(eventId, saved)
    return saved
  }

  async invalidate(eventId: string): Promise<void> {
    this.bumpGeneration(eventId)
    this.cache.delete(eventId)
    const local = this.deps.localStorageContainer
    if (local?.isInitialized()) {
      try { await local.eventDetail().removeDetail(eventId) } catch (e) { console.warn('LocalStorage invalidate 실패:', e) }
    }
  }
}
