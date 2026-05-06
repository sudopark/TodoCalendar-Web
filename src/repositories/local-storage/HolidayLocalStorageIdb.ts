import type { IDBPDatabase } from 'idb'
import type { HolidayItem } from '../../models/Holiday'
import type { HolidayLocalStorage } from './HolidayLocalStorage'

const STORE = 'holidays' as const

interface HolidayRecord {
  year: number
  holidays: HolidayItem[]
}

export class HolidayLocalStorageIdb implements HolidayLocalStorage {
  constructor(private readonly db: IDBPDatabase) {}

  async loadYear(year: number): Promise<HolidayItem[] | null> {
    const r = (await this.db.get(STORE, year)) as HolidayRecord | undefined
    return r?.holidays ?? null
  }

  async saveYear(year: number, holidays: HolidayItem[]): Promise<void> {
    const record: HolidayRecord = { year, holidays }
    await this.db.put(STORE, record)
  }

  async remove(year: number): Promise<void> {
    await this.db.delete(STORE, year)
  }

  async reset(): Promise<void> {
    await this.db.clear(STORE)
  }
}
