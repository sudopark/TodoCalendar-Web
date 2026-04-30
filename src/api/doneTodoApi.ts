import { apiClient } from './apiClient'
import type { DoneTodo, EventDetail, Todo } from '../models'

/**
 * iOS `RevertTodoResultMapper` 와 정합 — 백엔드는 평면 Todo 가 아닌 `{ todo, detail }` 형태로 반환한다.
 * - todo: 복원된 todo (TodoEventMapper 디코드)
 * - detail: 옵셔널 EventDetail (없으면 null)
 */
export interface RevertDoneTodoResponse {
  todo: Todo
  detail?: EventDetail | null
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
   * iOS `TodoRemoteImple.revertDoneTodo` 와 동일 — POST /v2/todos/dones/{id}/revert (body 없음).
   * 응답은 { todo, detail } 형태(`RevertTodoResultMapper`).
   */
  revertDoneTodo(id: string): Promise<RevertDoneTodoResponse> {
    return apiClient.post(`/v2/todos/dones/${id}/revert`)
  },

  getDoneTodoDetail(id: string): Promise<EventDetail> {
    return apiClient.get(`/v1/event_details/done/${id}`)
  },
}
