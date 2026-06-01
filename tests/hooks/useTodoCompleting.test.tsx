import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useTodoCompleting } from '../../src/hooks/useTodoCompleting'
import { RepositoriesProvider } from '../../src/composition/RepositoriesProvider'
import { useToastStore } from '../../src/stores/toastStore'
import type { Repositories } from '../../src/composition/container'
import type { EventRepository } from '../../src/repositories/EventRepository'
import type { Todo } from '../../src/models'

function makeTodo(uuid = 'todo-1', overrides: Partial<Todo> = {}): Todo {
  return { uuid, name: 'test', ...overrides } as Todo
}

function makeRepeatingTodo(uuid = 'todo-r'): Todo {
  return {
    uuid,
    name: 'repeating',
    event_time: { type: 'at', time: 1000 } as any,
    repeating: { repeat_option: { optionType: 'everyDay' }, repeatingStartTime: 1000 } as any,
  } as Todo
}

function makeFakeRepo(completeImpl: EventRepository['completeTodo']): Repositories {
  return {
    eventRepo: { completeTodo: completeImpl } as unknown as EventRepository,
  } as Repositories
}

function setup(repos: Repositories) {
  return renderHook(() => useTodoCompleting(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <RepositoriesProvider value={repos}>{children}</RepositoriesProvider>
    ),
  })
}

describe('useTodoCompleting', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('toggle 호출 시 해당 todo 가 진행 중 상태가 되고, API 응답 도착 시 해제된다', async () => {
    let resolveCall: (() => void) | null = null
    const repos = makeFakeRepo(
      vi.fn(() => new Promise<any>(r => { resolveCall = () => r({ uuid: 'done', done_at: 0 }) })),
    )
    const { result } = setup(repos)

    act(() => result.current.toggle(makeTodo('a')))
    expect(result.current.isCompleting('a')).toBe(true)

    await act(async () => {
      resolveCall!()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.isCompleting('a')).toBe(false))
  })

  it('진행 중 동일 todo 의 toggle 을 다시 호출하면 진행 상태가 즉시 해제된다 (취소)', async () => {
    const repos = makeFakeRepo(
      vi.fn((_t, _s, opts: any) => new Promise<any>((_, reject) => {
        opts.signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        })
      })),
    )
    const { result } = setup(repos)

    act(() => result.current.toggle(makeTodo('a')))
    expect(result.current.isCompleting('a')).toBe(true)

    act(() => result.current.toggle(makeTodo('a')))
    expect(result.current.isCompleting('a')).toBe(false)
    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(0))
  })

  it('비-Abort 에러 발생 시 todo.complete_failed 토스트가 표시되고 진행 상태가 해제된다', async () => {
    const repos = makeFakeRepo(vi.fn(() => Promise.reject(new Error('network'))))
    const { result } = setup(repos)

    act(() => result.current.toggle(makeTodo('a')))
    await waitFor(() => expect(result.current.isCompleting('a')).toBe(false))
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].key).toBe('todo.complete_failed')
    expect(useToastStore.getState().toasts[0].type).toBe('error')
  })

  it('hook 을 가진 컴포넌트가 unmount 되면 진행 중 호출이 abort 되어 토스트가 발생하지 않는다', async () => {
    const repos = makeFakeRepo(
      vi.fn((_t, _s, opts: any) => new Promise<any>((_, reject) => {
        opts.signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        })
      })),
    )
    const { result, unmount } = setup(repos)

    act(() => result.current.toggle(makeTodo('a')))
    expect(result.current.isCompleting('a')).toBe(true)

    unmount()
    await new Promise(r => setTimeout(r, 0))
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('반복 todo 의 경우 scope="this" 로 eventRepo.completeTodo 가 호출된다', async () => {
    let capturedScope: unknown = 'unset'
    const repos = makeFakeRepo(
      vi.fn((_t: Todo, scope: unknown) => {
        capturedScope = scope
        return Promise.resolve({ uuid: 'done', done_at: 0 } as any)
      }),
    )
    const { result } = setup(repos)

    await act(async () => {
      result.current.toggle(makeRepeatingTodo('r1'))
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.isCompleting('r1')).toBe(false))
    expect(capturedScope).toBe('this')
  })
})
