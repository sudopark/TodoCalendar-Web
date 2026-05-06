import type { HolidayItem } from '../../models/Holiday'

export interface HolidayLocalStorage {
  loadYear(year: number): Promise<HolidayItem[] | null>
  saveYear(year: number, holidays: HolidayItem[]): Promise<void>
  remove(year: number): Promise<void>
  reset(): Promise<void>
}
