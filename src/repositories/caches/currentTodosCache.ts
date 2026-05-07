/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import type { Todo } from '../../models'

interface CurrentTodosState {
  todos: Todo[]
  addTodo: (todo: Todo) => void
  removeTodo: (uuid: string) => void
  replaceTodo: (todo: Todo) => void
  replaceAll: (todos: Todo[]) => void
  reset: () => void
}

export const useCurrentTodosCache = create<CurrentTodosState>((set) => ({
  todos: [],

  addTodo: (todo: Todo) => set(s => ({ todos: [...s.todos, todo] })),
  removeTodo: (uuid: string) => set(s => ({ todos: s.todos.filter(t => t.uuid !== uuid) })),
  replaceTodo: (todo: Todo) => set(s => ({ todos: s.todos.map(t => t.uuid === todo.uuid ? todo : t) })),
  replaceAll: (todos: Todo[]) => set({ todos }),
  reset: () => set({ todos: [] }),
}))
