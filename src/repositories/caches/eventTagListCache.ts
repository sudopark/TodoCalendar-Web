/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import { eventTagApi } from '../../api/eventTagApi'
import { settingApi } from '../../api/settingApi'
import { useCalendarEventsCache } from './calendarEventsCache'
import { useCurrentTodosCache } from './currentTodosCache'
import { useUncompletedTodosCache } from './uncompletedTodosCache'
import type { EventTag } from '../../models'
import type { DefaultTagColors } from '../../models'

export { DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from '../../domain/tag/constants'

interface EventTagListCacheState {
  tags: Map<string, EventTag>
  defaultTagColors: DefaultTagColors | null
  // ── cache primitive operations (used by TagRepository) ────────────
  replaceAll: (tags: EventTag[], defaultColors: DefaultTagColors | null) => void
  add: (tag: EventTag) => void
  replace: (tag: EventTag) => void
  remove: (id: string) => void
  setDefaultColors: (colors: DefaultTagColors) => void
  reset: () => void
  // ── legacy business operations (callers migrated to TagRepository in T14+) ──
  fetchAll: () => Promise<void>
  createTag: (name: string, color_hex?: string) => Promise<EventTag>
  updateTag: (id: string, updates: { name?: string; color_hex?: string }) => Promise<EventTag>
  deleteTag: (id: string) => Promise<void>
  deleteTagAndEvents: (id: string) => Promise<void>
  updateDefaultTagColor: (kind: 'default' | 'holiday', color_hex: string) => Promise<void>
}

// 동시 fetchAll 호출 (AuthGuard + 페이지 ViewModel + dev StrictMode 이중 effect 등) 시
// 같은 promise 를 공유해 API 호출 1회로 묶는다 (#99).
let fetchAllInFlight: Promise<void> | null = null

export const useEventTagListCache = create<EventTagListCacheState>((set, get) => ({
  tags: new Map(),
  defaultTagColors: null,

  // ── cache primitive operations ────────────────────────────────────

  replaceAll: (tags: EventTag[], defaultColors: DefaultTagColors | null) => {
    const map = new Map<string, EventTag>()
    for (const tag of tags) map.set(tag.uuid, tag)
    set({ tags: map, defaultTagColors: defaultColors })
  },

  add: (tag: EventTag) => {
    set(s => { const tags = new Map(s.tags); tags.set(tag.uuid, tag); return { tags } })
  },

  replace: (tag: EventTag) => {
    set(s => { const tags = new Map(s.tags); tags.set(tag.uuid, tag); return { tags } })
  },

  remove: (id: string) => {
    set(s => { const tags = new Map(s.tags); tags.delete(id); return { tags } })
  },

  setDefaultColors: (colors: DefaultTagColors) => {
    set({ defaultTagColors: colors })
  },

  reset: () => set({ tags: new Map(), defaultTagColors: null }),

  // ── legacy business operations (to be removed after T14+ page migration) ──

  fetchAll: async () => {
    if (fetchAllInFlight) return fetchAllInFlight
    fetchAllInFlight = (async () => {
      try {
        const [list, defaultColors] = await Promise.all([
          eventTagApi.getAllTags(),
          settingApi.getDefaultTagColors(),
        ])
        const map = new Map<string, EventTag>()
        for (const tag of list) map.set(tag.uuid, tag)
        set({ tags: map, defaultTagColors: defaultColors })
      } catch (e) {
        console.warn('태그 로드 실패:', e)
        throw e
      } finally {
        fetchAllInFlight = null
      }
    })()
    return fetchAllInFlight
  },

  createTag: async (name: string, color_hex?: string) => {
    const tag = await eventTagApi.createTag({ name, color_hex })
    set(s => { const tags = new Map(s.tags); tags.set(tag.uuid, tag); return { tags } })
    return tag
  },

  updateTag: async (id: string, updates: { name?: string; color_hex?: string }) => {
    const existing = get().tags.get(id)
    if (!existing) throw new Error('Tag not found')
    const tag = await eventTagApi.updateTag(id, {
      name: updates.name ?? existing.name,
      color_hex: updates.color_hex ?? existing.color_hex ?? undefined,
    })
    set(s => { const tags = new Map(s.tags); tags.set(tag.uuid, tag); return { tags } })
    return tag
  },

  deleteTag: async (id: string) => {
    await eventTagApi.deleteTag(id)
    set(s => { const tags = new Map(s.tags); tags.delete(id); return { tags } })
  },

  deleteTagAndEvents: async (id: string) => {
    await eventTagApi.deleteTagAndEvents(id)
    set(s => { const tags = new Map(s.tags); tags.delete(id); return { tags } })
    const loadedYears = Array.from(useCalendarEventsCache.getState().loadedYears)
    if (loadedYears.length > 0) {
      await useCalendarEventsCache.getState().refreshYears(loadedYears).catch(() => {})
    }
    useCurrentTodosCache.getState().fetch().catch(() => {})
    useUncompletedTodosCache.getState().fetch().catch(() => {})
  },

  updateDefaultTagColor: async (kind, color_hex) => {
    const updated = await settingApi.updateDefaultTagColors({ [kind]: color_hex })
    set({ defaultTagColors: updated })
  },
}))
