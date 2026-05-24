import type { EventTime } from './EventTime'
import type { Repeating } from './Repeating'
import type { NotificationOption } from './NotificationOption'

export interface Todo {
  uuid: string
  name: string
  event_tag_id?: string | null
  event_time?: EventTime | null
  repeating?: Repeating | null
  repeating_turn?: number
  // 제외된 occurrence 들의 시작 timestamp(epoch seconds) 배열. 서버 schema 와 동일 의미. turn 번호 아님.
  exclude_repeatings?: number[]
  notification_options?: NotificationOption[] | null
  is_current: boolean
}
