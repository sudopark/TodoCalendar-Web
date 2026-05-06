import type { IDBPDatabase } from 'idb'
import type { EventTag } from '../../models/EventTag'
import type { EventTagLocalStorage } from './EventTagLocalStorage'

const STORE = 'event_tags' as const

export class EventTagLocalStorageIdb implements EventTagLocalStorage {
  constructor(private readonly db: IDBPDatabase) {}

  async loadAll(): Promise<EventTag[]> {
    return (await this.db.getAll(STORE)) as EventTag[]
  }

  async loadTag(uuid: string): Promise<EventTag | null> {
    const r = await this.db.get(STORE, uuid)
    return (r as EventTag | undefined) ?? null
  }

  async saveTags(tags: EventTag[]): Promise<void> {
    if (tags.length === 0) return
    const tx = this.db.transaction(STORE, 'readwrite')
    await Promise.all(tags.map((t) => tx.store.put(t)))
    await tx.done
  }

  async updateTag(tag: EventTag): Promise<void> {
    await this.db.put(STORE, tag)
  }

  async removeTag(uuid: string): Promise<void> {
    await this.db.delete(STORE, uuid)
  }

  async reset(): Promise<void> {
    await this.db.clear(STORE)
  }
}
