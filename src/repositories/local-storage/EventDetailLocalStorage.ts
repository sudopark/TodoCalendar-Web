import type { EventDetail } from '../../models/EventDetail'

export interface EventDetailLocalStorage {
  loadDetail(eventId: string): Promise<EventDetail | null>
  saveDetail(eventId: string, detail: EventDetail): Promise<void>
  removeDetail(eventId: string): Promise<void>
  reset(): Promise<void>
}
