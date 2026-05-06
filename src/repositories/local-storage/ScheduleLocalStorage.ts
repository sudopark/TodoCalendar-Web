import type { Schedule } from '../../models/Schedule'

export interface ScheduleLocalStorage {
  loadSchedules(range: { lower: number; upper: number }): Promise<Schedule[]>
  loadSchedule(uuid: string): Promise<Schedule | null>
  saveSchedules(schedules: Schedule[]): Promise<void>
  updateSchedule(schedule: Schedule): Promise<void>
  removeSchedules(uuids: string[]): Promise<void>
  removeSchedulesWith(tagId: string): Promise<string[]>
  reset(): Promise<void>
}
