import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('doneTodoApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    )
  })

  it('getDoneTodos(size)가 cursor 없이 올바른 URL로 GET 호출한다', async () => {
    const { doneTodoApi } = await import('../../src/api/doneTodoApi')
    await doneTodoApi.getDoneTodos(20)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos/dones')
    expect(String(url)).toContain('size=20')
    expect(String(url)).not.toContain('cursor')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('getDoneTodos(size, cursor)가 cursor 포함 URL로 GET 호출한다', async () => {
    const { doneTodoApi } = await import('../../src/api/doneTodoApi')
    await doneTodoApi.getDoneTodos(20, 1714000000)

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/todos/dones')
    expect(String(url)).toContain('size=20')
    expect(String(url)).toContain('cursor=1714000000')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('deleteDoneTodo(id)가 /v2/todos/dones/:id로 DELETE 호출한다 (iOS removeDoneTodo 와 동일 prefix)', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { doneTodoApi } = await import('../../src/api/doneTodoApi')
    await doneTodoApi.deleteDoneTodo('done-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v2/todos/dones/done-1')
    expect((options as RequestInit).method).toBe('DELETE')
  })

  it('revertDoneTodo(id)가 /v2/todos/dones/:id/revert로 POST 호출한다 (BFF v2 응답 형태 정합)', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ todo: { uuid: 'todo-1', name: 'restored' }, detail: null }), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { doneTodoApi } = await import('../../src/api/doneTodoApi')
    await doneTodoApi.revertDoneTodo('done-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v2/todos/dones/done-1/revert')
    expect((options as RequestInit).method).toBe('POST')
  })

  it('getDoneTodoDetail(id)가 /v1/event_details/done/:id로 GET 호출하고 응답을 그대로 반환한다', async () => {
    const detailMock = { place: '집', url: 'https://x', memo: '메모' }
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(detailMock), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { doneTodoApi } = await import('../../src/api/doneTodoApi')
    const result = await doneTodoApi.getDoneTodoDetail('done-1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/event_details/done/done-1')
    expect((options as RequestInit).method).toBe('GET')
    expect(result).toEqual(detailMock)
  })
})
