import type { EventTag } from '../models/EventTag'
import type { DefaultTagColors } from '../models/DefaultTagColors'
import { useEventTagListCache } from './caches/eventTagListCache'

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
}

export class TagRepository {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  // ── fetch: 서버 → 캐시 ────────────────────────────────────────────

  async fetchAll(): Promise<void> {
    const [tags, defaultColors] = await Promise.all([
      this.deps.eventTagApi.getAllTags(),
      this.deps.settingApi.getDefaultTagColors().catch(() => null),
    ])
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

  async createTag(name: string, color_hex?: string): Promise<EventTag> {
    const created = await this.deps.eventTagApi.createTag({ name, color_hex })
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
    useEventTagListCache.getState().replace(updated)
    return updated
  }

  async updateDefaultTagColor(kind: 'default' | 'holiday', color_hex: string): Promise<void> {
    const updated = await this.deps.settingApi.updateDefaultTagColors({ [kind]: color_hex })
    useEventTagListCache.getState().setDefaultColors(updated)
  }

  async deleteTag(id: string): Promise<void> {
    await this.deps.eventTagApi.deleteTag(id)
    useEventTagListCache.getState().remove(id)
  }

  async deleteTagAndEvents(id: string): Promise<void> {
    await this.deps.eventTagApi.deleteTagAndEvents(id)
    useEventTagListCache.getState().remove(id)
    // 이벤트 캐시 cascading 정리는 다음 task 에서 EventRepository 와 협업 필요 — 본 task 범위 외
  }
}
