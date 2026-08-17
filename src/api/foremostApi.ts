import { apiClient } from './apiClient'
import type { ForemostEvent } from '../models'
import { repeatingFromServer } from './repeatingCodec'

// foremost 의 embedded event(Todo|Schedule)도 repeating 을 가질 수 있다. scheduleApi/todoApi 와
// 동일하게 네트워크 경계에서 weekday 를 web 인코딩(getDay 0=일)으로 변환한다. 미변환 시 server
// 인코딩(일=1)이 메모리/로컬캐시에 그대로 올라가, 배너 클릭 시 EventDetailPopover 의
// describeRepeating 이 요일을 한 칸 밀어 표기한다 (예: 매주 일요일 → "매주 월요일").
function foremostFromServer(f: ForemostEvent): ForemostEvent {
  if (!f.event?.repeating) return f
  return { ...f, event: { ...f.event, repeating: repeatingFromServer(f.event.repeating) } }
}

export const foremostApi = {
  async getForemostEvent(): Promise<ForemostEvent> {
    return foremostFromServer(await apiClient.get<ForemostEvent>('/v2/foremost/event'))
  },

  async setForemostEvent(body: { event_id: string; is_todo: boolean }): Promise<ForemostEvent> {
    return foremostFromServer(await apiClient.put<ForemostEvent>('/v2/foremost/event', body))
  },

  removeForemostEvent(): Promise<{ status: string }> {
    return apiClient.delete('/v2/foremost/event')
  },
}
