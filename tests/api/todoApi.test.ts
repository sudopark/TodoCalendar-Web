import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Todo } from '../../src/models'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('todoApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    )
  })

  it('getTodos(lower, upper)가 올바른 URL로 GET 호출한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    await todoApi.getTodos(1000000, 2000000)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos')
    expect(String(url)).toContain('lower=1000000')
    expect(String(url)).toContain('upper=2000000')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('getCurrentTodos()가 /v1/todos로 GET 호출한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    await todoApi.getCurrentTodos()

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('getUncompletedTodos(refTime)가 /v1/todos/uncompleted?refTime= 으로 GET 호출한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    await todoApi.getUncompletedTodos(1700000000)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos/uncompleted')
    expect(String(url)).toContain('refTime=1700000000')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('getTodo(id)가 /v1/todos/todo/:id로 GET 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'todo-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { todoApi } = await import('../../src/api/todoApi')
    await todoApi.getTodo('todo-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos/todo/todo-1')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('createTodo(body)가 /v1/todos/todo로 POST 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'todo-2', name: 'New Todo' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { todoApi } = await import('../../src/api/todoApi')
    const body = { name: 'New Todo' }
    await todoApi.createTodo(body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos/todo')
    expect((options as RequestInit).method).toBe('POST')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('updateTodo(id, body)가 /v1/todos/todo/:id로 PUT 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'todo-1', name: 'Updated' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { todoApi } = await import('../../src/api/todoApi')
    const body = { name: 'Updated' }
    await todoApi.updateTodo('todo-1', body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos/todo/todo-1')
    expect((options as RequestInit).method).toBe('PUT')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('completeTodo(id, body)가 /v1/todos/todo/:id/complete로 POST 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'done-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { todoApi } = await import('../../src/api/todoApi')
    const origin: Todo = { uuid: 'todo-1', name: 'Test', is_current: false }
    await todoApi.completeTodo('todo-1', { origin })

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos/todo/todo-1/complete')
    expect((options as RequestInit).method).toBe('POST')
  })

  // BFF 의 complete 핸들러가 `{userId, ...origin}` 으로 origin 을 firestore 에 그대로 spread 한다.
  // 따라서 web 클라가 보내는 origin 에 `uuid` 같은 done 레코드의 식별자와 충돌하는 키가 들어가면
  // 저장된 done 문서의 `uuid` 필드가 origin todo id 로 오염되고, 이후 GET 응답에서 done 의 doc id 가
  // 이 오염된 값으로 덮어쓰여 revert / delete 가 모두 잘못된 id 로 호출된다.
  // iOS `TodoMakeParams.asJson()` 와 동일하게 name / event_tag_id / event_time / repeating /
  // notification_options 5개 필드만 보내야 한다.
  it('completeTodo 호출 시 origin payload 에서 uuid·is_current·repeating_turn·exclude_repeatings 등 식별/상태 필드를 제거한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'done-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { todoApi } = await import('../../src/api/todoApi')
    const origin: Todo = {
      uuid: 'todo-1',
      name: 'Test',
      event_tag_id: 'tag-1',
      event_time: { kind: 'at', time: 1714000000 } as never,
      repeating: { start: 1, option: { kind: 'daily', interval: 1 } } as never,
      repeating_turn: 3,
      exclude_repeatings: [1, 2],
      notification_options: [{ kind: 'atTime' } as never],
      is_current: true,
    }

    await todoApi.completeTodo('todo-1', { origin, next_event_time: undefined, next_repeating_turn: undefined })

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.origin).toEqual({
      name: 'Test',
      event_tag_id: 'tag-1',
      event_time: origin.event_time,
      repeating: origin.repeating,
      notification_options: origin.notification_options,
    })
  })

  it('completeTodo 호출 시 origin 의 옵셔널 필드가 null/undefined 이면 해당 키를 보내지 않는다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'done-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { todoApi } = await import('../../src/api/todoApi')
    const origin: Todo = { uuid: 'todo-1', name: 'Test', is_current: false }
    await todoApi.completeTodo('todo-1', { origin })

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.origin).toEqual({ name: 'Test' })
  })

  it('patchTodo(id, body)가 /v1/todos/todo/:id로 PATCH 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ uuid: 'todo-1' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { todoApi } = await import('../../src/api/todoApi')
    const body = { is_current: true }
    await todoApi.patchTodo('todo-1', body)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos/todo/todo-1')
    expect((options as RequestInit).method).toBe('PATCH')
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(body)
  })

  it('deleteTodo(id)가 /v1/todos/todo/:id로 DELETE 호출한다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { todoApi } = await import('../../src/api/todoApi')
    await todoApi.deleteTodo('todo-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos/todo/todo-1')
    expect((options as RequestInit).method).toBe('DELETE')
  })
})
