/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import type { Todo } from '../../models'

interface UncompletedTodosState {
  todos: Todo[]
  addTodo: (todo: Todo) => void
  removeTodo: (id: string) => void
  replaceAll: (todos: Todo[]) => void
  reset: () => void
}

export const useUncompletedTodosCache = create<UncompletedTodosState>((set, get) => ({
  todos: [],

  addTodo: (todo: Todo) => set(s => ({ todos: [...s.todos, todo] })),

  removeTodo: (id: string) => {
    set({ todos: get().todos.filter(t => t.uuid !== id) })
  },

  replaceAll: (todos: Todo[]) => set({ todos }),

  reset: () => set({ todos: [] }),
}))
