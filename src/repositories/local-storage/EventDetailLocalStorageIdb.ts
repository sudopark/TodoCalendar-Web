import type { IDBPDatabase } from 'idb'
import type { EventDetail } from '../../models/EventDetail'
import type { EventDetailLocalStorage } from './EventDetailLocalStorage'

const STORE = 'event_details' as const

interface EventDetailRecord extends EventDetail {
  event_id: string
}

export class EventDetailLocalStorageIdb implements EventDetailLocalStorage {
  private readonly db: IDBPDatabase
  constructor(db: IDBPDatabase) { this.db = db }

  async loadDetail(eventId: string): Promise<EventDetail | null> {
    const r = (await this.db.get(STORE, eventId)) as EventDetailRecord | undefined
    if (!r) return null
    const { event_id: _id, ...rest } = r
    return rest as EventDetail
  }

  async saveDetail(eventId: string, detail: EventDetail): Promise<void> {
    const record: EventDetailRecord = { ...detail, event_id: eventId }
    await this.db.put(STORE, record)
  }

  async removeDetail(eventId: string): Promise<void> {
    await this.db.delete(STORE, eventId)
  }

  async reset(): Promise<void> {
    await this.db.clear(STORE)
  }
}
