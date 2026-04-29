import { apiClient } from './apiClient'
import type { DoneTodo, EventDetail, Todo } from '../models'

/**
 * iOS `RevertTodoResultMapper` 와 정합 — 백엔드는 평면 Todo 가 아닌 `{ todo, detail }` 형태로 반환한다.
 * 이전에 Promise<Todo> 로 잘못 선언되어 응답을 평면 Todo 처럼 다뤘고, 그 결과 currentTodos 등 후속 캐시
 * 갱신 시 이름·시간이 비어있는 "빈 todo" 가 노출되는 회귀가 있었다.
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

  revertDoneTodo(id: string): Promise<RevertDoneTodoResponse> {
    return apiClient.post(`/v1/todos/dones/${id}/revert`)
  },

  getDoneTodoDetail(id: string): Promise<EventDetail> {
    return apiClient.get(`/v1/event_details/done/${id}`)
  },
}
