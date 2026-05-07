/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import type { DoneTodo } from '../../models'

const PAGE_SIZE = 20

interface DoneTodosCacheState {
  items: DoneTodo[]
  cursor: number | null
  hasMore: boolean
  isLoading: boolean
  /**
   * reset / revert / remove 가 발생할 때마다 +1. DoneTodoRepository.fetchNextPage 가
   * fetch 시작 시점의 generation 을 캡처해 응답 도착 시 generation 이 바뀌었다면 stale 응답으로
   * 간주하고 무시한다.
   *
   * 필요한 이유: 컴포넌트(ArchivePanel) 의 dev StrictMode 더블 useEffect 로 fetchNextPage 가 두 번
   * 발사되거나, fetchNextPage 진행 중에 revert/remove 가 일어나면, in-flight 응답이 cache 를 다시
   * 채워 (1) 항목이 중복 표시되거나 (2) 사용자가 막 지운 항목이 되살아나는 회귀가 발생한다.
   */
  generation: number
  // ── cache primitive operations (used by DoneTodoRepository) ───────
  replaceAll: (items: DoneTodo[]) => void
  appendPage: (items: DoneTodo[], nextCursor: number | null, hasMore: boolean) => void
  prependItem: (doneTodo: DoneTodo) => void
  removeItem: (id: string) => void
  reset: () => void
}

export const useDoneTodosCache = create<DoneTodosCacheState>((set, _get) => ({
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

  prependItem: (doneTodo: DoneTodo) => {
    set(s => ({ items: [doneTodo, ...s.items] }))
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
}))
