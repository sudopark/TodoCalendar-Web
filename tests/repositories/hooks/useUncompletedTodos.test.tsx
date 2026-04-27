import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../../src/api/scheduleApi', () => ({ scheduleApi: {} }))

import { useUncompletedTodosCache } from '../../../src/repositories/caches/uncompletedTodosCache'
import { useUncompletedTodos } from '../../../src/repositories/hooks/useUncompletedTodos'
import type { Todo } from '../../../src/models/Todo'

function makeTodo(uuid: string): Todo {
  return { uuid, name: '미완료 할 일', is_current: false, event_time: null }
}

beforeEach(() => {
  useUncompletedTodosCache.setState({ todos: [] })
  vi.clearAllMocks()
})

describe('useUncompletedTodos', () => {
  it('캐시에 있는 uncompleted todos 목록을 반환한다', () => {
    // given: 캐시에 todo 2개
    useUncompletedTodosCache.setState({ todos: [makeTodo('u1'), makeTodo('u2')] })

    // when
    const { result } = renderHook(() => useUncompletedTodos())

    // then
    expect(result.current.some(t => t.uuid === 'u1')).toBe(true)
    expect(result.current.some(t => t.uuid === 'u2')).toBe(true)
  })

  it('캐시가 갱신되면 hook 결과도 갱신된다', () => {
    // given: 초기엔 빈 캐시
    const { result } = renderHook(() => useUncompletedTodos())
    expect(result.current).toHaveLength(0)

    // when: replaceAll 로 교체
    act(() => {
      useUncompletedTodosCache.getState().replaceAll([makeTodo('u-new')])
    })

    // then: hook 결과에 새 todo가 포함되어야 한다
    expect(result.current.some(t => t.uuid === 'u-new')).toBe(true)
  })
})
