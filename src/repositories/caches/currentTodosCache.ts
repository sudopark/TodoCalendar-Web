/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import { todoApi } from '../../api/todoApi'
import type { Todo } from '../../models'

interface CurrentTodosState {
  todos: Todo[]
  fetch: () => Promise<void>
  addTodo: (todo: Todo) => void
  removeTodo: (uuid: string) => void
  replaceTodo: (todo: Todo) => void
  replaceAll: (todos: Todo[]) => void
  reset: () => void
}

// 동시 fetch 호출 (AuthGuard + 페이지 ViewModel + dev StrictMode 이중 effect 등) 시
// 같은 promise 를 공유해 API 호출 1회로 묶는다 (#99).
let inFlight: Promise<void> | null = null

export const useCurrentTodosCache = create<CurrentTodosState>((set) => ({
  todos: [],

  fetch: async () => {
    if (inFlight) return inFlight
    inFlight = (async () => {
      try {
        const todos = await todoApi.getCurrentTodos()
        set({ todos })
      } catch (e) {
        console.warn('Current todo 로드 실패:', e)
        throw e
      } finally {
        inFlight = null
      }
    })()
    return inFlight
  },

  addTodo: (todo: Todo) => set(s => ({ todos: [...s.todos, todo] })),
  removeTodo: (uuid: string) => set(s => ({ todos: s.todos.filter(t => t.uuid !== uuid) })),
  replaceTodo: (todo: Todo) => set(s => ({ todos: s.todos.map(t => t.uuid === todo.uuid ? todo : t) })),
  replaceAll: (todos: Todo[]) => set({ todos }),
  reset: () => set({ todos: [] }),
}))
