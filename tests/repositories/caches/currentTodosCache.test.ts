import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCurrentTodosCache } from '../../../src/repositories/caches/currentTodosCache'
import type { Todo } from '../../../src/models/Todo'

vi.mock('../../../src/api/todoApi', () => ({
  todoApi: { getCurrentTodos: vi.fn() },
}))

const makeTodo = (uuid: string, name: string): Todo => ({
  uuid, name, is_current: true, event_time: null,
})

describe('useCurrentTodosCache', () => {
  beforeEach(() => {
    useCurrentTodosCache.setState({ todos: [] })
    vi.clearAllMocks()
  })

  it('addTodo를 호출하면 todos 목록에서 해당 todo를 찾을 수 있다', () => {
    // given: 빈 캐시
    // when: todo 추가
    useCurrentTodosCache.getState().addTodo(makeTodo('t1', '할 일'))
    // then: 목록에서 조회 가능
    expect(useCurrentTodosCache.getState().todos.some(t => t.uuid === 't1')).toBe(true)
  })

  it('removeTodo를 호출하면 해당 todo를 더 이상 목록에서 찾을 수 없다', () => {
    // given: todo가 있는 상태
    useCurrentTodosCache.setState({ todos: [makeTodo('t1', '할 일')] })
    // when: 제거
    useCurrentTodosCache.getState().removeTodo('t1')
    // then: 목록에 없음
    expect(useCurrentTodosCache.getState().todos.some(t => t.uuid === 't1')).toBe(false)
  })

  it('reset 호출 시 초기 상태로 돌아간다', () => {
    // given: 캐시에 데이터가 있는 상태
    useCurrentTodosCache.setState({ todos: [makeTodo('t1', '할 일')] })
    // when: reset 호출
    useCurrentTodosCache.getState().reset()
    // then: 빈 목록
    expect(useCurrentTodosCache.getState().todos).toEqual([])
  })

  it('replaceTodo를 호출하면 기존 todo가 새 데이터로 교체된다', () => {
    // given: todo가 있는 상태
    useCurrentTodosCache.setState({ todos: [makeTodo('t1', '원래')] })
    // when: 교체
    useCurrentTodosCache.getState().replaceTodo(makeTodo('t1', '수정됨'))
    // then: 새 이름으로 조회됨
    expect(useCurrentTodosCache.getState().todos.find(t => t.uuid === 't1')?.name).toBe('수정됨')
  })

  it('replaceAll 로 전체 교체하면 새 목록으로 대체된다', () => {
    // given: 기존 todo가 있는 상태
    useCurrentTodosCache.setState({ todos: [makeTodo('old-1', '기존'), makeTodo('old-2', '기존2')] })
    // when: 새 목록으로 교체
    useCurrentTodosCache.getState().replaceAll([makeTodo('new-1', '새로'), makeTodo('new-2', '새로2')])
    // then: 새 목록만 남아야 한다
    const todos = useCurrentTodosCache.getState().todos
    expect(todos.some(t => t.uuid === 'new-1')).toBe(true)
    expect(todos.some(t => t.uuid === 'new-2')).toBe(true)
    expect(todos.some(t => t.uuid === 'old-1')).toBe(false)
  })

  it('빈 배열로 replaceAll 하면 캐시가 비워진다', () => {
    // given: todo가 있는 상태
    useCurrentTodosCache.setState({ todos: [makeTodo('t1', '할 일')] })
    // when: 빈 배열로 교체
    useCurrentTodosCache.getState().replaceAll([])
    // then: 빈 목록
    expect(useCurrentTodosCache.getState().todos).toHaveLength(0)
  })
})
