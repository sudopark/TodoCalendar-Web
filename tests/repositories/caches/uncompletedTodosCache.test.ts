import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUncompletedTodosCache } from '../../../src/repositories/caches/uncompletedTodosCache'
import type { Todo } from '../../../src/models/Todo'

vi.mock('../../../src/api/todoApi', () => ({
  todoApi: { getUncompletedTodos: vi.fn() },
}))

const makeTodo = (uuid: string, name: string): Todo => ({
  uuid, name, is_current: false, event_time: null,
})

describe('useUncompletedTodosCache', () => {
  beforeEach(() => {
    useUncompletedTodosCache.setState({ todos: [] })
    vi.clearAllMocks()
  })

  it('replaceAll 로 전체 교체하면 새 목록으로 대체된다', () => {
    // given: 기존 todo가 있는 상태
    useUncompletedTodosCache.setState({ todos: [makeTodo('old-1', '기존'), makeTodo('old-2', '기존2')] })

    // when: 새 목록으로 교체
    useUncompletedTodosCache.getState().replaceAll([makeTodo('new-1', '새로'), makeTodo('new-2', '새로2')])

    // then: 새 목록만 남아야 한다
    const todos = useUncompletedTodosCache.getState().todos
    expect(todos.some(t => t.uuid === 'new-1')).toBe(true)
    expect(todos.some(t => t.uuid === 'new-2')).toBe(true)
    expect(todos.some(t => t.uuid === 'old-1')).toBe(false)
  })

  it('빈 배열로 replaceAll 하면 캐시가 비워진다', () => {
    // given: todo가 있는 상태
    useUncompletedTodosCache.setState({ todos: [makeTodo('u1', '미완료')] })

    // when: 빈 배열로 교체
    useUncompletedTodosCache.getState().replaceAll([])

    // then: 빈 목록
    expect(useUncompletedTodosCache.getState().todos).toHaveLength(0)
  })

  it('removeTodo를 호출하면 해당 todo를 더 이상 목록에서 찾을 수 없다', () => {
    // given: todo가 있는 상태
    useUncompletedTodosCache.setState({ todos: [makeTodo('u1', '미완료'), makeTodo('u2', '미완료2')] })

    // when: 제거
    useUncompletedTodosCache.getState().removeTodo('u1')

    // then: 제거된 todo는 없고 나머지는 남아야 한다
    const todos = useUncompletedTodosCache.getState().todos
    expect(todos.some(t => t.uuid === 'u1')).toBe(false)
    expect(todos.some(t => t.uuid === 'u2')).toBe(true)
  })

  it('reset 호출 시 초기 상태로 돌아간다', () => {
    // given: 캐시에 데이터가 있는 상태
    useUncompletedTodosCache.setState({ todos: [makeTodo('u1', '미완료')] })

    // when: reset 호출
    useUncompletedTodosCache.getState().reset()

    // then: 빈 목록
    expect(useUncompletedTodosCache.getState().todos).toEqual([])
  })

  // #99: 동일 cache 에 동시 fetch 호출 시 (AuthGuard + useMainViewModel + StrictMode 이중 effect 등) API 1회만.
  it('동시에 여러 번 fetch 호출 시 API 는 한 번만 호출된다 (in-flight dedup)', async () => {
    // given: 응답이 즉시 resolve 되지 않게 deferred
    const { todoApi } = await import('../../../src/api/todoApi')
    let resolveFn!: (v: Todo[]) => void
    const pending = new Promise<Todo[]>(r => { resolveFn = r })
    vi.mocked(todoApi.getUncompletedTodos).mockReturnValue(pending)

    // when: 동시에 3번 호출
    const p1 = useUncompletedTodosCache.getState().fetch()
    const p2 = useUncompletedTodosCache.getState().fetch()
    const p3 = useUncompletedTodosCache.getState().fetch()
    resolveFn([makeTodo('u1', '미완료')])
    await Promise.all([p1, p2, p3])

    // then: API 는 1회만 호출 — 사용자 관찰 가능 행위 (네트워크 트래픽 절감)
    expect(todoApi.getUncompletedTodos).toHaveBeenCalledTimes(1)
    expect(useUncompletedTodosCache.getState().todos).toHaveLength(1)
  })
})
