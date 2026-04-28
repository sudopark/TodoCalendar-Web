import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('apiClient', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { tokenProvider } = await import('../../src/api/tokenProvider')
    vi.mocked(tokenProvider.getToken).mockResolvedValue('test-token')
    // 각 테스트 전 핸들러 초기화
    const { setUnauthorizedHandler } = await import('../../src/api/apiClient')
    setUnauthorizedHandler(() => {})
  })

  it('인증된 사용자의 요청에는 Authorization 헤더가 포함된다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    await apiClient.get('/v1/test')

    const [, options] = fetchSpy.mock.calls[0]
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer test-token',
    })
  })

  it('서버가 성공 응답을 반환하면 JSON 데이터를 반환한다', async () => {
    const payload = { id: '1', name: 'Test' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    const result = await apiClient.get<typeof payload>('/v1/test')

    expect(result).toEqual(payload)
  })

  it('서버가 204 No Content를 반환하면 undefined를 반환한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    const result = await apiClient.delete('/v1/test/1')

    expect(result).toBeUndefined()
  })

  it('401 응답 시 AuthExpiredError가 throw된다', async () => {
    // given: fetch가 401 반환
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 })
    )

    // when / then: AuthExpiredError가 throw됨
    const { apiClient, AuthExpiredError } = await import('../../src/api/apiClient')
    await expect(apiClient.get('/v1/test')).rejects.toThrow(AuthExpiredError)
  })

  it('401 응답 시 등록된 onUnauthorized 핸들러가 실행된다', async () => {
    // given: fetch가 401 반환, 핸들러에 결과 상태를 기록
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 })
    )
    const { apiClient, setUnauthorizedHandler, AuthExpiredError } = await import('../../src/api/apiClient')
    let handlerExecuted = false
    setUnauthorizedHandler(() => { handlerExecuted = true })

    // when
    await expect(apiClient.get('/v1/test')).rejects.toThrow(AuthExpiredError)

    // then: 핸들러가 실행됐음을 결과 상태로 확인
    expect(handlerExecuted).toBe(true)
  })

  it('서버가 4xx/5xx를 반환하면 에러를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    await expect(apiClient.get('/v1/test')).rejects.toThrow()
  })

  it('토큰을 가져올 수 없으면 요청이 거부된다', async () => {
    const { tokenProvider } = await import('../../src/api/tokenProvider')
    vi.mocked(tokenProvider.getToken).mockRejectedValue(new Error('Not authenticated'))

    const { apiClient } = await import('../../src/api/apiClient')
    await expect(apiClient.get('/v1/test')).rejects.toThrow('Not authenticated')
  })

  it('POST 요청 시 body가 JSON으로 직렬화되어 전송된다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    const payload = { name: 'test', value: 42 }
    await apiClient.post('/v1/test', payload)

    const [, options] = fetchSpy.mock.calls[0]
    expect((options as RequestInit).method).toBe('POST')
    expect((options as RequestInit).body).toBe(JSON.stringify(payload))
  })

  it('PUT 요청 시 올바른 method와 body가 전송된다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    const payload = { id: '1', name: 'updated' }
    await apiClient.put('/v1/test/1', payload)

    const [, options] = fetchSpy.mock.calls[0]
    expect((options as RequestInit).method).toBe('PUT')
    expect((options as RequestInit).body).toBe(JSON.stringify(payload))
  })

  it('PATCH 요청 시 올바른 method와 body가 전송된다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    const payload = { name: 'patched' }
    await apiClient.patch('/v1/test/1', payload)

    const [, options] = fetchSpy.mock.calls[0]
    expect((options as RequestInit).method).toBe('PATCH')
    expect((options as RequestInit).body).toBe(JSON.stringify(payload))
  })

  it('DELETE 요청 시 올바른 method로 호출된다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    await apiClient.delete('/v1/test/1')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/test/1')
    expect((options as RequestInit).method).toBe('DELETE')
  })

  it('Content-Type 헤더가 application/json으로 설정된다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )

    const { apiClient } = await import('../../src/api/apiClient')
    await apiClient.get('/v1/test')

    const [, options] = fetchSpy.mock.calls[0]
    expect((options as RequestInit).headers).toMatchObject({
      'Content-Type': 'application/json',
    })
  })

  it('네트워크 에러 시 에러가 전파된다', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'))

    const { apiClient } = await import('../../src/api/apiClient')
    await expect(apiClient.get('/v1/test')).rejects.toThrow('Network failure')
  })
})
