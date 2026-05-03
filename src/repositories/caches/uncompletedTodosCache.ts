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

// 동시 fetch 호출 (AuthGuard + 페이지 ViewModel + dev StrictMode 이중 effect 등) 시
// 같은 promise 를 공유해 API 호출 1회로 묶는다 (#99).
let inFlight: Promise<void> | null = null

export const useUncompletedTodosCache = create<UncompletedTodosState>((set, get) => ({
  todos: [],

  fetch: async () => {
    if (inFlight) return inFlight
    inFlight = (async () => {
      try {
        const refTime = Math.floor(Date.now() / 1000)
        const todos = await todoApi.getUncompletedTodos(refTime)
        set({ todos })
      } catch (e) {
        console.warn('미완료 Todo 로드 실패:', e)
        throw e
      } finally {
        inFlight = null
      }
    })()
    return inFlight
  },

  removeTodo: (id: string) => {
    set({ todos: get().todos.filter(t => t.uuid !== id) })
  },

  replaceAll: (todos: Todo[]) => set({ todos }),

  reset: () => set({ todos: [] }),
}))
