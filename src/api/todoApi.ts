import { apiClient } from './apiClient'
import type { Todo, DoneTodo, EventTime, Repeating, NotificationOption } from '../models'
import { repeatingFromServer, repeatingToServer } from './repeatingCodec'

// 서버는 weekday 를 1=일..7=토 로 인코딩한다. web 은 Date.getDay()(0=일..6=토)로 통일돼 있어
// scheduleApi 와 동일하게 이 모듈(네트워크 경계)에서만 변환한다. 위 레이어·로컬캐시는 전부 web 인코딩을 본다.
// (issue #191: todo 경로엔 이 변환이 빠져 있어, 매주 일요일(서버 1) 반복 todo 가 web 에서 월요일(1)로
//  해석돼 완료 시 다음 차수가 다음주 일요일이 아니라 내일(월요일)로 계산됐음)

function todoFromServer(t: Todo): Todo {
  return t.repeating != null ? { ...t, repeating: repeatingFromServer(t.repeating) } : t
}

// 명시적 `repeating: null`(시리즈 제거 요청)은 변환 없이 그대로 통과시켜 서버에 전달한다.
function bodyToServer<T extends { repeating?: Repeating | null }>(body: T): T {
  return body.repeating != null ? { ...body, repeating: repeatingToServer(body.repeating) } : body
}

// patchTodo / replaceTodo 처럼 타입이 느슨한 Record body 안의 repeating 만 서버 인코딩으로 변환.
function recordRepeatingToServer<T extends Record<string, unknown>>(body: T): T {
  return body.repeating != null
    ? { ...body, repeating: repeatingToServer(body.repeating as Repeating) }
    : body
}

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
  if (origin.repeating != null) sanitized.repeating = repeatingToServer(origin.repeating)
  if (origin.notification_options != null) sanitized.notification_options = origin.notification_options
  return sanitized
}

export const todoApi = {
  async getTodos(lower: number, upper: number): Promise<Todo[]> {
    const todos = await apiClient.get<Todo[]>(`/v2/todos?lower=${lower}&upper=${upper}`)
    return todos.map(todoFromServer)
  },

  async getCurrentTodos(): Promise<Todo[]> {
    const todos = await apiClient.get<Todo[]>('/v2/todos')
    return todos.map(todoFromServer)
  },

  async getUncompletedTodos(refTime: number): Promise<Todo[]> {
    const todos = await apiClient.get<Todo[]>(`/v2/todos/uncompleted?refTime=${refTime}`)
    return todos.map(todoFromServer)
  },

  async getTodo(id: string): Promise<Todo> {
    return todoFromServer(await apiClient.get<Todo>(`/v2/todos/todo/${id}`))
  },

  async createTodo(body: { name: string; event_tag_id?: string; event_time?: EventTime; repeating?: Repeating; notification_options?: NotificationOption[]; is_current?: boolean }): Promise<Todo> {
    return todoFromServer(await apiClient.post<Todo>('/v2/todos/todo', bodyToServer(body)))
  },

  async updateTodo(id: string, body: Partial<Pick<Todo, 'name' | 'event_tag_id' | 'event_time' | 'repeating' | 'notification_options'>>): Promise<Todo> {
    return todoFromServer(await apiClient.put<Todo>(`/v2/todos/todo/${id}`, bodyToServer(body)))
  },

  completeTodo(id: string, body: { origin: Todo; next_event_time?: EventTime; next_repeating_turn?: number }, options?: { signal?: AbortSignal }): Promise<DoneTodo> {
    const sanitized: Record<string, unknown> = { origin: buildCompleteOrigin(body.origin) }
    if (body.next_event_time != null) sanitized.next_event_time = body.next_event_time
    if (body.next_repeating_turn != null) sanitized.next_repeating_turn = body.next_repeating_turn
    // DoneTodo 는 repeating 필드가 없어 응답 변환 불필요.
    return apiClient.post(`/v2/todos/todo/${id}/complete`, sanitized, options)
  },

  async replaceTodo(id: string, body: { new: Record<string, unknown>; origin_next_event_time?: EventTime; next_repeating_turn?: number }): Promise<{ new_todo: Todo; next_repeating?: Todo }> {
    const result = await apiClient.post<{ new_todo: Todo; next_repeating?: Todo }>(
      `/v2/todos/todo/${id}/replace`,
      { ...body, new: recordRepeatingToServer(body.new) },
    )
    return {
      new_todo: todoFromServer(result.new_todo),
      next_repeating: result.next_repeating != null ? todoFromServer(result.next_repeating) : undefined,
    }
  },

  async patchTodo(id: string, body: Record<string, unknown>): Promise<Todo> {
    return todoFromServer(await apiClient.patch<Todo>(`/v2/todos/todo/${id}`, recordRepeatingToServer(body)))
  },

  deleteTodo(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v2/todos/todo/${id}`)
  },
}
