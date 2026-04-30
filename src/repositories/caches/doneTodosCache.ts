/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import { doneTodoApi } from '../../api/doneTodoApi'
import { useCurrentTodosCache } from './currentTodosCache'
import { useCalendarEventsCache } from './calendarEventsCache'
import type { DoneTodo, Todo } from '../../models'

const PAGE_SIZE = 20

interface DoneTodosCacheState {
  items: DoneTodo[]
  cursor: number | null
  hasMore: boolean
  isLoading: boolean
  /**
   * reset / revert / remove 가 발생할 때마다 +1. fetchNext 가 시작 시점의 generation 을 캡처해
   * 응답 도착 시 generation 이 바뀌었다면 stale 응답으로 간주하고 무시한다.
   *
   * 필요한 이유: 컴포넌트(ArchivePanel) 의 dev StrictMode 더블 useEffect 로 fetchNext 가 두 번
   * 발사되거나, fetchNext 진행 중에 revert/remove 가 일어나면, in-flight 응답이 cache 를 다시
   * 채워 (1) 항목이 중복 표시되거나 (2) 사용자가 막 지운 항목이 되살아나는 회귀가 발생한다.
   */
  generation: number
  // ── cache primitive operations (used by DoneTodoRepository) ───────
  replaceAll: (items: DoneTodo[]) => void
  appendPage: (items: DoneTodo[], nextCursor: number | null, hasMore: boolean) => void
  removeItem: (id: string) => void
  reset: () => void
  // ── legacy business operations (callers migrated to DoneTodoRepository in T14+) ──
  fetchNext: () => Promise<void>
  /** 복원된 todo 를 반환. 호출자가 currentTodos 갱신 등 후속 동선에 사용할 수 있다. */
  revert: (id: string) => Promise<Todo>
  remove: (id: string) => Promise<void>
}

export const useDoneTodosCache = create<DoneTodosCacheState>((set, get) => ({
  items: [],
  cursor: null,
  hasMore: true,
  isLoading: false,
  generation: 0,

  // ── cache primitive operations ────────────────────────────────────

  replaceAll: (items: DoneTodo[]) => {
    const last = items[items.length - 1]
    const cursor = last?.done_at ?? null
    set(s => ({
      items,
      cursor,
      hasMore: items.length === PAGE_SIZE && cursor !== null,
      generation: s.generation + 1,
    }))
  },

  appendPage: (items: DoneTodo[], nextCursor: number | null, hasMore: boolean) => {
    set(s => ({ items: [...s.items, ...items], cursor: nextCursor, hasMore }))
  },

  removeItem: (id: string) => {
    set(s => ({ items: s.items.filter(i => i.uuid !== id), generation: s.generation + 1 }))
  },

  reset: () => set(s => ({
    items: [],
    cursor: null,
    hasMore: true,
    isLoading: false,
    generation: s.generation + 1,
  })),

  // ── legacy business operations (to be removed after T14+ page migration) ──

  fetchNext: async () => {
    const { isLoading, hasMore, cursor, generation: startGen } = get()
    if (isLoading || !hasMore) return
    set({ isLoading: true })
    try {
      const fetched = await doneTodoApi.getDoneTodos(PAGE_SIZE, cursor ?? undefined)
      set(state => {
        // stale 응답: 시작 시점 이후 reset/revert/remove 가 일어났다면 무시
        if (state.generation !== startGen) return { isLoading: false }
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
      // 응답 추출 전에 done todo 의 원래 형태(event_time 유무)를 기억해 둔다.
      // 백엔드가 revert 응답의 todo.is_current 를 어떻게 채우든, 사용자 의도("원래 todo 형태로 복구")는
      // done 되기 전 todo 의 형태로 돌아가는 것 — DoneTodo.event_time 으로 판단한다.
      //   · DoneTodo.event_time 있음 → 원래 scheduled → calendarEventsCache 로만 복구
      //   · DoneTodo.event_time 없음 → 원래 untimed → currentTodosCache 로 복구
      // 응답의 is_current 만 신뢰하면 BFF 가 항상 true 로 답하는 환경에서 scheduled todo 가 current 목록에
      // 잘못 전환되는 회귀가 발생한다.
      const doneTodoBefore = get().items.find(i => i.uuid === id)
      const wasScheduled = !!doneTodoBefore?.event_time

      const response = await doneTodoApi.revertDoneTodo(id)
      const restored = response?.todo
      set(state => ({ items: state.items.filter(i => i.uuid !== id), generation: state.generation + 1 }))

      if (restored) {
        if (wasScheduled) {
          useCalendarEventsCache.getState().addEvent({ type: 'todo', event: restored })
        } else {
          useCurrentTodosCache.getState().addTodo(restored)
        }
      }
      return restored as Todo
    } catch (e) {
      console.warn('Todo 되돌리기 실패:', e)
      throw e
    }
  },

  remove: async (id: string) => {
    try {
      await doneTodoApi.deleteDoneTodo(id)
      set(state => ({ items: state.items.filter(i => i.uuid !== id), generation: state.generation + 1 }))
    } catch (e) {
      console.warn('Done todo 삭제 실패:', e)
      throw e
    }
  },
}))
