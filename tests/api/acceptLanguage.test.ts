import { apiClient, setAcceptLanguageProvider } from '../../src/api/apiClient'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: async () => 'test-token' },
}))

function stubFetch() {
  const captured: { headers?: Record<string, string> } = {}
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    captured.headers = init.headers as Record<string, string>
    return { ok: true, status: 200, json: async () => ({}) } as Response
  })
  return captured
}

describe('Accept-Language 헤더', () => {
  afterEach(() => {
    setAcceptLanguageProvider(null)
    vi.unstubAllGlobals()
  })

  test('provider 가 주입되면 그 언어를 헤더로 보낸다', async () => {
    // given
    const captured = stubFetch()
    setAcceptLanguageProvider(() => 'ja')
    // when
    await apiClient.get('/v2/anything')
    // then
    expect(captured.headers?.['Accept-Language']).toBe('ja')
  })

  test('언어가 바뀌면 다음 요청부터 바뀐 언어를 보낸다', async () => {
    // given
    const captured = stubFetch()
    let lang = 'ko'
    setAcceptLanguageProvider(() => lang)
    // when
    await apiClient.get('/v2/anything')
    lang = 'de'
    await apiClient.get('/v2/anything')
    // then
    expect(captured.headers?.['Accept-Language']).toBe('de')
  })

  test('provider 가 없으면 헤더를 붙이지 않는다', async () => {
    // given
    const captured = stubFetch()
    // when
    await apiClient.get('/v2/anything')
    // then
    expect(captured.headers?.['Accept-Language']).toBeUndefined()
  })

  test('provider 가 빈 값을 주면 헤더를 붙이지 않는다', async () => {
    // given
    const captured = stubFetch()
    setAcceptLanguageProvider(() => '')
    // when
    await apiClient.get('/v2/anything')
    // then
    expect(captured.headers?.['Accept-Language']).toBeUndefined()
  })
})
