/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import type { EventTag } from '../../models'
import type { DefaultTagColors } from '../../models'

export { DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from '../../domain/tag/constants'

interface EventTagListCacheState {
  tags: Map<string, EventTag>
  defaultTagColors: DefaultTagColors | null
  replaceAll: (tags: EventTag[], defaultColors: DefaultTagColors | null) => void
  add: (tag: EventTag) => void
  replace: (tag: EventTag) => void
  remove: (id: string) => void
  setDefaultColors: (colors: DefaultTagColors) => void
  reset: () => void
}

export const useEventTagListCache = create<EventTagListCacheState>((set) => ({
  tags: new Map(),
  defaultTagColors: null,

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
}))
