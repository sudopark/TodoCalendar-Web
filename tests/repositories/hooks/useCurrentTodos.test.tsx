import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../../src/api/scheduleApi', () => ({ scheduleApi: {} }))

import { useCurrentTodosCache } from '../../../src/repositories/caches/currentTodosCache'
import { useCurrentTodos } from '../../../src/repositories/hooks/useCurrentTodos'
import type { Todo } from '../../../src/models/Todo'

function makeTodo(uuid: string): Todo {
  return { uuid, name: '할 일', is_current: true, event_time: null }
}

beforeEach(() => {
  useCurrentTodosCache.setState({ todos: [] })
  vi.clearAllMocks()
})

describe('useCurrentTodos', () => {
  it('캐시에 있는 current todos 목록을 반환한다', () => {
    // given: 캐시에 todo 2개
    useCurrentTodosCache.setState({ todos: [makeTodo('t1'), makeTodo('t2')] })

    // when
    const { result } = renderHook(() => useCurrentTodos())

    // then
    expect(result.current.some(t => t.uuid === 't1')).toBe(true)
    expect(result.current.some(t => t.uuid === 't2')).toBe(true)
  })

  it('캐시가 갱신되면 hook 결과도 갱신된다', () => {
    // given: 초기엔 빈 캐시
    const { result } = renderHook(() => useCurrentTodos())
    expect(result.current).toHaveLength(0)

    // when: todo 추가
    act(() => {
      useCurrentTodosCache.getState().addTodo(makeTodo('new-t'))
    })

    // then: hook 결과에 새 todo가 포함되어야 한다
    expect(result.current.some(t => t.uuid === 'new-t')).toBe(true)
  })
})
