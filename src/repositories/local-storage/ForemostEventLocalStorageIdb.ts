import type { IDBPDatabase } from 'idb'
import type { ForemostEvent } from '../../models/ForemostEvent'
import type { ForemostEventLocalStorage } from './ForemostEventLocalStorage'

const STORE = 'foremost_event' as const
const KEY = 'foremost' as const

export class ForemostEventLocalStorageIdb implements ForemostEventLocalStorage {
  constructor(private readonly db: IDBPDatabase) {}

  async load(): Promise<ForemostEvent | null> {
    const r = await this.db.get(STORE, KEY)
    return (r as ForemostEvent | undefined) ?? null
  }

  async save(event: ForemostEvent): Promise<void> {
    await this.db.put(STORE, event, KEY)
  }

  async remove(): Promise<void> {
    await this.db.delete(STORE, KEY)
  }

  async reset(): Promise<void> {
    await this.db.clear(STORE)
  }
}
