import type { Todo } from '../../models/Todo'

export interface TodoLocalStorage {
  /** 현재 영역(`is_current === true`) Todo 만 반환 */
  loadCurrentTodos(): Promise<Todo[]>

  /** event_time 이 [lower, upper] 와 겹치는 Todo 반환 (at/period/allday 3 variant 모두) */
  loadTodos(range: { lower: number; upper: number }): Promise<Todo[]>

  /** 미완료 Todo (event_time 이 [0, now] 와 겹치고 is_current=false) — 반복 todo 등 carry-over 표시용 */
  loadUncompletedTodos(now: number): Promise<Todo[]>

  /** 단건 조회. 없으면 null */
  loadTodo(uuid: string): Promise<Todo | null>

  /** 신규/덮어쓰기 일괄 저장 */
  saveTodos(todos: Todo[]): Promise<void>

  /** 단일 update — keyPath 기준 put */
  updateTodo(todo: Todo): Promise<void>

  /** 일괄 삭제 (uuid 단위) */
  removeTodos(uuids: string[]): Promise<void>

  /** 특정 tagId 가 붙은 todo 모두 삭제하고 삭제된 uuid 목록 반환 */
  removeTodosWith(tagId: string): Promise<string[]>

  /** 모든 todo 제거 (signOut/wipe 용) */
  reset(): Promise<void>
}
