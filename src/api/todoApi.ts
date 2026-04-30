import { apiClient } from './apiClient'
import type { Todo, DoneTodo, EventTime, Repeating, NotificationOption } from '../models'

/**
 * iOS `TodoMakeParams.asJson()` 와 동일한 5개 필드만 추려낸다.
 * BFF 의 complete 핸들러가 origin 을 firestore 문서에 그대로 spread 하므로,
 * `uuid` / `is_current` / `repeating_turn` / `exclude_repeatings` 같은 식별·상태 필드를 보내면
 * 저장된 done 문서가 오염되어 이후 revert / delete 가 잘못된 id 로 호출된다.
 */
function buildCompleteOrigin(origin: Todo): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { name: origin.name }
  if (origin.event_tag_id != null) sanitized.event_tag_id = origin.event_tag_id
  if (origin.event_time != null) sanitized.event_time = origin.event_time
  if (origin.repeating != null) sanitized.repeating = origin.repeating
  if (origin.notification_options != null) sanitized.notification_options = origin.notification_options
  return sanitized
}

export const todoApi = {
  getTodos(lower: number, upper: number): Promise<Todo[]> {
    return apiClient.get(`/v1/todos?lower=${lower}&upper=${upper}`)
  },

  getCurrentTodos(): Promise<Todo[]> {
    return apiClient.get('/v1/todos')
  },

  getUncompletedTodos(): Promise<Todo[]> {
    return apiClient.get('/v1/todos/uncompleted')
  },

  getTodo(id: string): Promise<Todo> {
    return apiClient.get(`/v1/todos/todo/${id}`)
  },

  createTodo(body: { name: string; event_tag_id?: string; event_time?: EventTime; repeating?: Repeating; notification_options?: NotificationOption[]; is_current?: boolean }): Promise<Todo> {
    return apiClient.post('/v1/todos/todo', body)
  },

  updateTodo(id: string, body: Partial<Pick<Todo, 'name' | 'event_tag_id' | 'event_time' | 'repeating' | 'notification_options'>>): Promise<Todo> {
    return apiClient.put(`/v1/todos/todo/${id}`, body)
  },

  completeTodo(id: string, body: { origin: Todo; next_event_time?: EventTime; next_repeating_turn?: number }): Promise<DoneTodo> {
    const sanitized: Record<string, unknown> = { origin: buildCompleteOrigin(body.origin) }
    if (body.next_event_time != null) sanitized.next_event_time = body.next_event_time
    if (body.next_repeating_turn != null) sanitized.next_repeating_turn = body.next_repeating_turn
    return apiClient.post(`/v1/todos/todo/${id}/complete`, sanitized)
  },

  replaceTodo(id: string, body: { new: Record<string, unknown>; origin_next_event_time?: EventTime; next_repeating_turn?: number }): Promise<{ new_todo: Todo; next_repeating?: Todo }> {
    return apiClient.post(`/v1/todos/todo/${id}/replace`, body)
  },

  patchTodo(id: string, body: Record<string, unknown>): Promise<Todo> {
    return apiClient.patch(`/v1/todos/todo/${id}`, body)
  },

  deleteTodo(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v1/todos/todo/${id}`)
  },
}
