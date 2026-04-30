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

  // BFF 는 path prefix 로 v1/v2 분기 (functions/index.js 의 setVersion). v1 의 revertDoneTodo 는 평면 Todo 만 반환하고
  // doneTodoService.#runRevertDoneTodo 에 makeTodo await 누락 race 회귀가 있어 빈 todo 가 생기는 것으로 보인다.
  // v2 의 revertDoneTodoV2 는 { todo, detail } 형태로 반환하고 detail 도 함께 복원해 iOS 와 정합한다.
  // → revert 만 v2 path 로 호출. 다른 todo endpoint 의 v1 → v2 마이그레이션은 별도 이슈.
  revertDoneTodo(id: string): Promise<RevertDoneTodoResponse> {
    return apiClient.post(`/v2/todos/dones/${id}/revert`)
  },

  getDoneTodoDetail(id: string): Promise<EventDetail> {
    return apiClient.get(`/v1/event_details/done/${id}`)
  },
}
