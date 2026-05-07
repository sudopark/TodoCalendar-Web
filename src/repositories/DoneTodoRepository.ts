import type { DoneTodo } from '../models/DoneTodo'
import type { Todo } from '../models/Todo'
import type { RevertDoneTodoResponse } from '../api/doneTodoApi'
import type { LocalStorageContainer } from './local-storage/LocalStorageContainer'
import { useDoneTodosCache } from './caches/doneTodosCache'
import { useCalendarEventsCache } from './caches/calendarEventsCache'
import { useCurrentTodosCache } from './caches/currentTodosCache'

const PAGE_SIZE = 20

// ── API 인터페이스 명시적 정의 ────────────────────────────────────────
// doneTodoApi 모듈의 실제 시그니처와 동기를 유지해야 한다.

export interface DoneTodoApi {
  getDoneTodos(size: number, cursor?: number): Promise<DoneTodo[]>
  deleteDoneTodo(id: string): Promise<{ status: string }>
  revertDoneTodo(id: string): Promise<RevertDoneTodoResponse>
}

interface Deps {
  api: DoneTodoApi
  localStorageContainer?: LocalStorageContainer
}

export class DoneTodoRepository {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  // ── fetch: 서버 → 캐시 ────────────────────────────────────────────

  async fetchNextPage(): Promise<void> {
    const { hasMore, cursor, generation: startGen } = useDoneTodosCache.getState()
    if (!hasMore) return
    const local = this.deps.localStorageContainer
    const isFirstPage = cursor === null || cursor === undefined

    // 1. 첫 페이지 진입 시에만 cache-first: LocalStorage recent 로 메모리 즉시 set
    if (isFirstPage && local?.isInitialized()) {
      try {
        const cached = await local.doneTodo().loadRecent(PAGE_SIZE)
        if (cached.length > 0 && useDoneTodosCache.getState().generation === startGen) {
          const last = cached[cached.length - 1]
          const nextCursor = last?.done_at ?? null
          useDoneTodosCache.getState().appendPage(cached, nextCursor, cached.length === PAGE_SIZE && nextCursor !== null)
        }
      } catch (e) {
        console.warn('LocalStorage doneTodos cache read 실패:', e)
      }
    }

    // 2. Remote 호출 — cursor 는 첫 페이지라면 undefined, 이후엔 캐시가 보유한 cursor 사용
    const fetched = await this.deps.api.getDoneTodos(PAGE_SIZE, cursor ?? undefined)

    // generation 이 변경됐다면 stale 응답 — 무시
    if (useDoneTodosCache.getState().generation !== startGen) {
      return
    }

    const last = fetched[fetched.length - 1]
    const nextCursor = last?.done_at ?? null
    const newHasMore = fetched.length === PAGE_SIZE && nextCursor !== null

    // 3. LocalStorage save (uuid 덮어쓰기로 누적)
    if (local?.isInitialized()) {
      try { await local.doneTodo().saveDoneTodos(fetched) } catch {}
    }

    // 4. 첫 페이지면 cache-first 로 임시 채운 메모리를 reset 후 Remote 데이터로 교체
    //    reset() 이 generation 을 bump 하지만 이는 의도된 reset 이므로 이후 appendPage 를 그대로 적용한다.
    if (isFirstPage) {
      useDoneTodosCache.getState().reset()
    }
    useDoneTodosCache.getState().appendPage(fetched, nextCursor, newHasMore)
  }

  // ── observe: snapshot ────────────────────────────────────────────
  // hook 기반 구독은 src/repositories/hooks/ 디렉토리의 독립 함수로 제공한다.
  // Repository 클래스는 React를 모른다.

  getSnapshot(): DoneTodo[] {
    return useDoneTodosCache.getState().items
  }

  // ── mutate: api 호출 + 캐시 갱신 ──────────────────────────────────

  async revert(id: string): Promise<Todo> {
    const response = await this.deps.api.revertDoneTodo(id)
    const local = this.deps.localStorageContainer
    if (local?.isInitialized()) {
      try {
        await local.doneTodo().removeDoneTodos([id])
        // 복원된 todo 도 LocalStorage 에 저장
        await local.todo().saveTodos([response.todo])
      } catch (e) { console.warn('LocalStorage doneTodo revert 실패:', e) }
    }
    // 메모리: doneTodos 에서 제거 + 관련 todo 캐시들에 추가
    useDoneTodosCache.getState().removeItem(id)
    if (response.todo.event_time) {
      useCalendarEventsCache.getState().addEvent({ type: 'todo', event: response.todo })
    }
    if (response.todo.is_current) {
      useCurrentTodosCache.getState().addTodo(response.todo)
    }
    return response.todo
  }

  async remove(id: string): Promise<void> {
    await this.deps.api.deleteDoneTodo(id)
    const local = this.deps.localStorageContainer
    if (local?.isInitialized()) {
      try { await local.doneTodo().removeDoneTodos([id]) } catch (e) { console.warn('LocalStorage doneTodo remove 실패:', e) }
    }
    useDoneTodosCache.getState().removeItem(id)
  }
}
