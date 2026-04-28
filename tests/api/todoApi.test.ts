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

  it('getUncompletedTodos()가 /v1/todos/uncompleted로 GET 호출한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    await todoApi.getUncompletedTodos()

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos/uncompleted')
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
