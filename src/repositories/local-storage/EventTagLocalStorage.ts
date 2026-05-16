import type { EventTag } from '../../models/EventTag'

export interface EventTagLocalStorage {
  loadAll(): Promise<EventTag[]>
  loadTag(uuid: string): Promise<EventTag | null>
  saveTags(tags: EventTag[]): Promise<void>
  updateTag(tag: EventTag): Promise<void>
  removeTag(uuid: string): Promise<void>
  reset(): Promise<void>
}
