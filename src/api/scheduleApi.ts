import { apiClient } from './apiClient'
import type { Schedule, EventTime, Repeating, NotificationOption } from '../models'
import { repeatingFromServer, repeatingToServer } from './repeatingCodec'

// 서버는 weekday 를 1=일..7=토 로 인코딩한다. web 은 Date.getDay()(0=일..6=토)로 통일돼 있어
// 이 모듈(네트워크 경계)에서만 변환한다. 위 레이어·로컬캐시는 전부 web 인코딩을 본다.

function scheduleFromServer(s: Schedule): Schedule {
  return s.repeating != null ? { ...s, repeating: repeatingFromServer(s.repeating) } : s
}

// 명시적 `repeating: null`(시리즈 제거 요청)은 변환 없이 그대로 통과시켜 서버에 전달한다.
function bodyToServer<T extends { repeating?: Repeating | null }>(body: T): T {
  return body.repeating != null ? { ...body, repeating: repeatingToServer(body.repeating) } : body
}

export const scheduleApi = {
  async getSchedules(lower: number, upper: number): Promise<Schedule[]> {
    const schedules = await apiClient.get<Schedule[]>(`/v2/schedules?lower=${lower}&upper=${upper}`)
    return schedules.map(scheduleFromServer)
  },

  async getSchedule(id: string): Promise<Schedule> {
    return scheduleFromServer(await apiClient.get<Schedule>(`/v2/schedules/schedule/${id}`))
  },

  async createSchedule(body: { name: string; event_tag_id?: string; event_time: EventTime; repeating?: Repeating; notification_options?: NotificationOption[] }): Promise<Schedule> {
    return scheduleFromServer(await apiClient.post<Schedule>('/v2/schedules/schedule', bodyToServer(body)))
  },

  async updateSchedule(id: string, body: Partial<Pick<Schedule, 'name' | 'event_tag_id' | 'event_time' | 'repeating' | 'notification_options'>>): Promise<Schedule> {
    return scheduleFromServer(await apiClient.put<Schedule>(`/v2/schedules/schedule/${id}`, bodyToServer(body)))
  },

  async excludeRepeating(id: string, body: { exclude_repeatings: number[] }): Promise<Schedule> {
    return scheduleFromServer(await apiClient.patch<Schedule>(`/v2/schedules/schedule/${id}/exclude`, body))
  },

  deleteSchedule(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v2/schedules/schedule/${id}`)
  },
}
