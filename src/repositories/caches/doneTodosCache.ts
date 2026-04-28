/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import { doneTodoApi } from '../../api/doneTodoApi'
import type { DoneTodo } from '../../models'

const PAGE_SIZE = 20

interface DoneTodosCacheState {
  items: DoneTodo[]
  cursor: number | null
  hasMore: boolean
  isLoading: boolean
  // ── cache primitive operations (used by DoneTodoRepository) ───────
  replaceAll: (items: DoneTodo[]) => void
  appendPage: (items: DoneTodo[], nextCursor: number | null, hasMore: boolean) => void
  removeItem: (id: string) => void
  reset: () => void
  // ── legacy business operations (callers migrated to DoneTodoRepository in T14+) ──
  fetchNext: () => Promise<void>
  revert: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useDoneTodosCache = create<DoneTodosCacheState>((set, get) => ({
  items: [],
  cursor: null,
  hasMore: true,
  isLoading: false,

  // ── cache primitive operations ────────────────────────────────────

  replaceAll: (items: DoneTodo[]) => {
    const last = items[items.length - 1]
    const cursor = last?.done_at ?? null
    set({ items, cursor, hasMore: items.length === PAGE_SIZE && cursor !== null })
  },

  appendPage: (items: DoneTodo[], nextCursor: number | null, hasMore: boolean) => {
    set(s => ({ items: [...s.items, ...items], cursor: nextCursor, hasMore }))
  },

  removeItem: (id: string) => {
    set(s => ({ items: s.items.filter(i => i.uuid !== id) }))
  },

  reset: () => set({ items: [], cursor: null, hasMore: true, isLoading: false }),

  // ── legacy business operations (to be removed after T14+ page migration) ──

  fetchNext: async () => {
    const { isLoading, hasMore, cursor } = get()
    if (isLoading || !hasMore) return
    set({ isLoading: true })
    try {
      const fetched = await doneTodoApi.getDoneTodos(PAGE_SIZE, cursor ?? undefined)
      set(state => {
        const last = fetched[fetched.length - 1]
        const nextCursor = last?.done_at ?? null
        return {
          items: [...state.items, ...fetched],
          cursor: nextCursor,
          hasMore: fetched.length === PAGE_SIZE && nextCursor !== null,
          isLoading: false,
        }
      })
    } catch (e) {
      console.warn('Done todos 로드 실패:', e)
      set({ isLoading: false })
    }
  },

  revert: async (id: string) => {
    try {
      await doneTodoApi.revertDoneTodo(id)
      set(state => ({ items: state.items.filter(i => i.uuid !== id) }))
    } catch (e) {
      console.warn('Todo 되돌리기 실패:', e)
      throw e
    }
  },

  remove: async (id: string) => {
    try {
      await doneTodoApi.deleteDoneTodo(id)
      set(state => ({ items: state.items.filter(i => i.uuid !== id) }))
    } catch (e) {
      console.warn('Done todo 삭제 실패:', e)
      throw e
    }
  },
}))
