/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import { todoApi } from '../../api/todoApi'
import type { Todo } from '../../models'

interface UncompletedTodosState {
  todos: Todo[]
  fetch: () => Promise<void>
  removeTodo: (id: string) => void
  replaceAll: (todos: Todo[]) => void
  reset: () => void
}

export const useUncompletedTodosCache = create<UncompletedTodosState>((set, get) => ({
  todos: [],

  fetch: async () => {
    try {
      const todos = await todoApi.getUncompletedTodos()
      set({ todos })
    } catch (e) {
      console.warn('미완료 Todo 로드 실패:', e)
      throw e  // let caller decide how to handle
    }
  },

  removeTodo: (id: string) => {
    set({ todos: get().todos.filter(t => t.uuid !== id) })
  },

  replaceAll: (todos: Todo[]) => set({ todos }),

  reset: () => set({ todos: [] }),
}))
