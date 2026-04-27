import { create } from 'zustand'
import { eventTagApi } from '../api/eventTagApi'
import { settingApi } from '../api/settingApi'
import { useCalendarEventsCache } from '../repositories/caches/calendarEventsCache'
import { useCurrentTodosCache } from '../repositories/caches/currentTodosCache'
import { useUncompletedTodosCache } from '../repositories/caches/uncompletedTodosCache'
import type { EventTag } from '../models'
import type { DefaultTagColors } from '../models'

export { DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from '../domain/tag/constants'

interface EventTagState {
  tags: Map<string, EventTag>
  defaultTagColors: DefaultTagColors | null
  fetchAll: () => Promise<void>
  createTag: (name: string, color_hex?: string) => Promise<EventTag>
  updateTag: (id: string, updates: { name?: string; color_hex?: string }) => Promise<EventTag>
  deleteTag: (id: string) => Promise<void>
  deleteTagAndEvents: (id: string) => Promise<void>
  updateDefaultTagColor: (kind: 'default' | 'holiday', color_hex: string) => Promise<void>
  reset: () => void
}

export const useEventTagStore = create<EventTagState>((set, get) => ({
  tags: new Map(),
  defaultTagColors: null,

  fetchAll: async () => {
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
    }
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

  reset: () => set({ tags: new Map(), defaultTagColors: null }),
}))
