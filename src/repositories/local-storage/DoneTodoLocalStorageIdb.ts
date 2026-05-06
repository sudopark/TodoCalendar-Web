import type { IDBPDatabase } from 'idb'
import type { DoneTodo } from '../../models/DoneTodo'
import type { DoneTodoLocalStorage } from './DoneTodoLocalStorage'

const STORE = 'done_todos' as const

export class DoneTodoLocalStorageIdb implements DoneTodoLocalStorage {
  constructor(private readonly db: IDBPDatabase) {}

  async loadRecent(limit: number): Promise<DoneTodo[]> {
    const tx = this.db.transaction(STORE, 'readonly')
    const idx = tx.store.index('done_at')
    const result: DoneTodo[] = []
    let cursor = await idx.openCursor(null, 'prev')
    while (cursor && result.length < limit) {
      result.push(cursor.value as DoneTodo)
      cursor = await cursor.continue()
    }
    return result
  }

  async loadDoneTodo(uuid: string): Promise<DoneTodo | null> {
    const r = await this.db.get(STORE, uuid)
    return (r as DoneTodo | undefined) ?? null
  }

  async saveDoneTodos(items: DoneTodo[]): Promise<void> {
    if (items.length === 0) return
    const tx = this.db.transaction(STORE, 'readwrite')
    await Promise.all(items.map((d) => tx.store.put(d)))
    await tx.done
  }

  async removeDoneTodos(uuids: string[]): Promise<void> {
    if (uuids.length === 0) return
    const tx = this.db.transaction(STORE, 'readwrite')
    await Promise.all(uuids.map((u) => tx.store.delete(u)))
    await tx.done
  }

  async reset(): Promise<void> {
    await this.db.clear(STORE)
  }
}
