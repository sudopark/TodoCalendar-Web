import type { EventTag } from '../models/EventTag'
import type { DefaultTagColors } from '../models/DefaultTagColors'
import type { LocalStorageContainer } from './local-storage/LocalStorageContainer'
import { useEventTagListCache } from './caches/eventTagListCache'
import { useCalendarEventsCache } from './caches/calendarEventsCache'
import { useCurrentTodosCache } from './caches/currentTodosCache'
import { useUncompletedTodosCache } from './caches/uncompletedTodosCache'
import type { EventRepository } from './EventRepository'

// ── API 인터페이스 명시적 정의 ────────────────────────────────────────
// eventTagApi/settingApi 모듈의 실제 시그니처와 동기를 유지해야 한다.

export interface EventTagApi {
  getAllTags(): Promise<EventTag[]>
  createTag(body: { name: string; color_hex?: string }): Promise<EventTag>
  updateTag(id: string, body: { name: string; color_hex?: string }): Promise<EventTag>
  deleteTag(id: string): Promise<{ status: string }>
  deleteTagAndEvents(id: string): Promise<{ status: string }>
}

export interface SettingApi {
  getDefaultTagColors(): Promise<DefaultTagColors>
  updateDefaultTagColors(body: Partial<DefaultTagColors>): Promise<DefaultTagColors>
}

interface Deps {
  eventTagApi: EventTagApi
  settingApi: SettingApi
  localStorageContainer?: LocalStorageContainer
  eventRepo?: EventRepository  // cascade 용 (optional — 미주입 시 cascade 생략)
}

export class TagRepository {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  // ── fetch: cache-first → 서버 → 캐시 ────────────────────────────────

  async fetchAll(): Promise<void> {
    const local = this.deps.localStorageContainer

    // 1. Cache-first: LocalStorage → 메모리 즉시 set
    if (local?.isInitialized()) {
      try {
        const cached = await local.eventTag().loadAll()
        if (cached.length > 0) {
          useEventTagListCache.getState().replaceAll(cached, useEventTagListCache.getState().defaultTagColors)
        }
      } catch (e) {
        console.warn('LocalStorage tags cache read 실패:', e)
      }
    }

    // 2. Remote → LocalStorage replace + 메모리 갱신
    const [tags, defaultColors] = await Promise.all([
      this.deps.eventTagApi.getAllTags(),
      this.deps.settingApi.getDefaultTagColors().catch(() => null),
    ])
    if (local?.isInitialized()) {
      try {
        await local.eventTag().reset()
        await local.eventTag().saveTags(tags)
      } catch (e) {
        console.warn('LocalStorage tags replace 실패:', e)
      }
    }
    useEventTagListCache.getState().replaceAll(tags, defaultColors)
  }

  // ── observe: snapshot ────────────────────────────────────────────
  // hook 기반 구독은 src/repositories/hooks/ 디렉토리의 독립 함수로 제공한다.
  // Repository 클래스는 React를 모른다.

  getTagsSnapshot(): EventTag[] {
    return Array.from(useEventTagListCache.getState().tags.values())
  }

  getDefaultColorsSnapshot(): DefaultTagColors | null {
    return useEventTagListCache.getState().defaultTagColors ?? null
  }

  // ── mutate: api 호출 + 캐시 갱신 ──────────────────────────────────

  // LocalStorage write 를 silent fail 로 감싸는 헬퍼
  private async writeLocal(label: string, fn: () => Promise<unknown>): Promise<void> {
    const local = this.deps.localStorageContainer
    if (!local?.isInitialized()) return
    try {
      await fn()
    } catch (e) {
      console.warn(`LocalStorage ${label} 실패:`, e)
    }
  }

  async createTag(name: string, color_hex?: string): Promise<EventTag> {
    const created = await this.deps.eventTagApi.createTag({ name, color_hex })
    await this.writeLocal('createTag', () =>
      this.deps.localStorageContainer!.eventTag().saveTags([created]),
    )
    useEventTagListCache.getState().add(created)
    return created
  }

  async updateTag(id: string, patch: { name?: string; color_hex?: string }): Promise<EventTag> {
    const existing = useEventTagListCache.getState().tags.get(id)
    if (!existing) throw new Error('Tag not found')
    const updated = await this.deps.eventTagApi.updateTag(id, {
      name: patch.name ?? existing.name,
      color_hex: patch.color_hex ?? existing.color_hex ?? undefined,
    })
    await this.writeLocal('updateTag', () =>
      this.deps.localStorageContainer!.eventTag().updateTag(updated),
    )
    useEventTagListCache.getState().replace(updated)
    return updated
  }

  async updateDefaultTagColor(kind: 'default' | 'holiday', color_hex: string): Promise<void> {
    const updated = await this.deps.settingApi.updateDefaultTagColors({ [kind]: color_hex })
    useEventTagListCache.getState().setDefaultColors(updated)
  }

  async deleteTag(id: string): Promise<void> {
    await this.deps.eventTagApi.deleteTag(id)
    await this.writeLocal('deleteTag', () =>
      this.deps.localStorageContainer!.eventTag().removeTag(id),
    )
    useEventTagListCache.getState().remove(id)
  }

  async deleteTagAndEvents(id: string): Promise<void> {
    await this.deps.eventTagApi.deleteTagAndEvents(id)
    useEventTagListCache.getState().remove(id)

    // 서버 응답에 영향받은 UUID 목록 없음 — 보유 캐시를 event_tag_id 기준으로 in-memory 필터
    const filteredCurrent = useCurrentTodosCache.getState().todos.filter(t => !t.event_tag_id || t.event_tag_id !== id)
    useCurrentTodosCache.getState().replaceAll(filteredCurrent)

    const filteredUncompleted = useUncompletedTodosCache.getState().todos.filter(t => !t.event_tag_id || t.event_tag_id !== id)
    useUncompletedTodosCache.getState().replaceAll(filteredUncompleted)

    // Cascade: 캘린더 이벤트(schedule 등)는 태그+관련 이벤트 삭제 의도에 맞게 재fetch.
    // eventRepo 미주입이면 cascade 생략 (호환성 — 테스트 등에서 의존성 안 넣어도 동작).
    const eventRepo = this.deps.eventRepo
    if (!eventRepo) return

    // loadedYears 를 invalidate 해야 fetchEventsForYear 의 short-circuit 을 피할 수 있다.
    const loadedYears = Array.from(useCalendarEventsCache.getState().loadedYears)
    if (loadedYears.length > 0) {
      useCalendarEventsCache.getState().invalidateYears(loadedYears)
      await Promise.allSettled(loadedYears.map((y) => eventRepo.fetchEventsForYear(y)))
    }
  }
}
