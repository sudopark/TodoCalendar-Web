import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/api/tokenProvider', () => ({
  tokenProvider: { getToken: vi.fn().mockResolvedValue('test-token') },
}))

describe('holidayApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })
    )
  })

  it('getHolidays(year, locale, code)가 올바른 쿼리 파라미터로 GET 호출한다', async () => {
    const { holidayApi } = await import('../../src/api/holidayApi')
    await holidayApi.getHolidays(2026, 'ko', 'KR')

    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/v1/holiday')
    expect(String(url)).toContain('year=2026')
    expect(String(url)).toContain('locale=ko')
    expect(String(url)).toContain('code=KR')
    expect((options as RequestInit).method).toBe('GET')
  })

  it('getSupportedCountries()가 외부 gist URL로 GET 호출한다', async () => {
    const countries = [{ regionCode: 'KR', code: 'south_korea', name: 'South Korea' }]
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(countries), { status: 200, headers: { 'content-type': 'application/json' } })
    )

    const { holidayApi } = await import('../../src/api/holidayApi')
    const result = await holidayApi.getSupportedCountries()

    expect(result).toEqual(countries)
    const [url] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('gist.githubusercontent.com')
  })

  it('getSupportedCountries()가 실패하면 에러를 던진다', async () => {
    fetchSpy.mockResolvedValue(
      new Response(null, { status: 500 })
    )

    const { holidayApi } = await import('../../src/api/holidayApi')
    await expect(holidayApi.getSupportedCountries()).rejects.toThrow('Supported countries fetch failed: 500')
  })
})
