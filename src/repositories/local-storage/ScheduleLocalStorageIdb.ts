import type { IDBPDatabase } from 'idb'
import type { Schedule } from '../../models/Schedule'
import type { ScheduleLocalStorage } from './ScheduleLocalStorage'

const STORE = 'schedules' as const

export class ScheduleLocalStorageIdb implements ScheduleLocalStorage {
  private readonly db: IDBPDatabase
  constructor(db: IDBPDatabase) { this.db = db }

  async loadSchedules(range: { lower: number; upper: number }): Promise<Schedule[]> {
    const tx = this.db.transaction(STORE, 'readonly')
    const idx = tx.store.index('time.timestamp')
    const keyRange = IDBKeyRange.bound(range.lower, range.upper)
    return (await idx.getAll(keyRange)) as Schedule[]
  }

  async loadSchedule(uuid: string): Promise<Schedule | null> {
    const result = await this.db.get(STORE, uuid)
    return (result as Schedule | undefined) ?? null
  }

  async saveSchedules(schedules: Schedule[]): Promise<void> {
    if (schedules.length === 0) return
    const tx = this.db.transaction(STORE, 'readwrite')
    await Promise.all(schedules.map((s) => tx.store.put(s)))
    await tx.done
  }

  async updateSchedule(schedule: Schedule): Promise<void> {
    await this.db.put(STORE, schedule)
  }

  async removeSchedules(uuids: string[]): Promise<void> {
    if (uuids.length === 0) return
    const tx = this.db.transaction(STORE, 'readwrite')
    await Promise.all(uuids.map((u) => tx.store.delete(u)))
    await tx.done
  }

  async removeSchedulesWith(tagId: string): Promise<string[]> {
    const tx = this.db.transaction(STORE, 'readwrite')
    const idx = tx.store.index('event_tag_id')
    const matched = (await idx.getAll(tagId)) as Schedule[]
    const uuids = matched.map((s) => s.uuid)
    await Promise.all(uuids.map((u) => tx.store.delete(u)))
    await tx.done
    return uuids
  }

  async reset(): Promise<void> {
    await this.db.clear(STORE)
  }
}
