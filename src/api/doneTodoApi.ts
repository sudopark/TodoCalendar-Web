import { apiClient } from './apiClient'
import type { DoneTodo, EventDetail, EventTime, NotificationOption, Repeating, Todo } from '../models'

/**
 * iOS `RevertTodoResultMapper` 와 정합 — 백엔드는 평면 Todo 가 아닌 `{ todo, detail }` 형태로 반환한다.
 */
export interface RevertDoneTodoResponse {
  todo: Todo
  detail?: EventDetail | null
}

/**
 * BFF `cancelDoneTodo` controller 가 받는 body 형태 (TodoCalendar-Functions/functions/controllers/doneTodoController.js).
 * `origin.uuid` 로 기존 todo 를 lookup 해 origin 정보로 정상 복원하므로, BFF 의 plain `revert` 가 가지는
 * doneTodo lookup race 회귀(빈 todo 가 만들어지는 문제) 를 회피할 수 있다.
 */
export interface CancelDoneTodoBody {
  origin: {
    uuid: string
    name: string
    event_tag_id?: string | null
    event_time?: EventTime | null
    repeating?: Repeating | null
    notification_options?: NotificationOption[] | null
    create_timestamp?: number
  }
  done_id?: string
}

/**
 * BFF `cancelDoneTodo` 응답 형태. iOS `RevertToggleTodoDoneResult` 와 정합.
 * - reverted: 복원된 Todo (iOS 와 동일한 키)
 * - done_id (snake_case) / deleted_done_id (iOS 디코더 키) — BFF 는 `done_id` 로 송신.
 */
export interface CancelDoneTodoResponse {
  reverted: Todo
  done_id?: string
}

export const doneTodoApi = {
  getDoneTodos(size: number, cursor?: number): Promise<DoneTodo[]> {
    const params = cursor != null
      ? `size=${size}&cursor=${cursor}`
      : `size=${size}`
    return apiClient.get(`/v1/todos/dones?${params}`)
  },

  deleteDoneTodo(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v1/todos/dones/${id}`)
  },

  /**
   * 이전에 사용하던 plain revert. BFF `#runRevertDoneTodo` 의 doneTodo lookup race 회귀로
   * 빈 todo 가 만들어지는 회귀가 발견되어, 클라이언트 흐름은 `cancelDoneTodo` 로 옮겼다.
   * 호환성/테스트 목적의 wrapper 만 남겨둔다.
   */
  revertDoneTodo(id: string): Promise<RevertDoneTodoResponse> {
    return apiClient.post(`/v2/todos/dones/${id}/revert`)
  },

  /**
   * Origin todo 정보를 body 로 보내 BFF 가 origin 기반으로 정상 todo 를 복원하게 한다 (POST /v2/todos/dones/cancel).
   * iOS `cancelDoneTodo` 와 정합 — BFF 의 plain revert 가 가진 doneTodo lookup race 우회.
   */
  cancelDoneTodo(body: CancelDoneTodoBody): Promise<CancelDoneTodoResponse> {
    return apiClient.post('/v2/todos/dones/cancel', body)
  },

  getDoneTodoDetail(id: string): Promise<EventDetail> {
    return apiClient.get(`/v1/event_details/done/${id}`)
  },
}
