import type { DoneTodo } from '../models/DoneTodo'
import type { Todo } from '../models/Todo'
import { useDoneTodosCache } from './caches/doneTodosCache'

const PAGE_SIZE = 20

// ── API 인터페이스 명시적 정의 ────────────────────────────────────────
// doneTodoApi 모듈의 실제 시그니처와 동기를 유지해야 한다.

export interface DoneTodoApi {
  getDoneTodos(size: number, cursor?: number): Promise<DoneTodo[]>
  deleteDoneTodo(id: string): Promise<{ status: string }>
  revertDoneTodo(id: string): Promise<Todo>
}

interface Deps {
  api: DoneTodoApi
}

export class DoneTodoRepository {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  // ── fetch: 서버 → 캐시 ────────────────────────────────────────────

  async fetchNextPage(): Promise<void> {
    const { hasMore, cursor } = useDoneTodosCache.getState()
    if (!hasMore) return
    const fetched = await this.deps.api.getDoneTodos(PAGE_SIZE, cursor ?? undefined)
    const last = fetched[fetched.length - 1]
    const nextCursor = last?.done_at ?? null
    const newHasMore = fetched.length === PAGE_SIZE && nextCursor !== null
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
    const restored = await this.deps.api.revertDoneTodo(id)
    useDoneTodosCache.getState().removeItem(id)
    return restored
  }

  async remove(id: string): Promise<void> {
    await this.deps.api.deleteDoneTodo(id)
    useDoneTodosCache.getState().removeItem(id)
  }
}
