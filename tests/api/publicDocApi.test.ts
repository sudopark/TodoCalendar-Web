import { describe, it, expect, vi, afterEach } from 'vitest'
import { createPublicDocApi } from '../../src/api/publicDocApi'

const BASE = 'https://raw.example.test/docs'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('publicDocApi', () => {
  it('원문 레포 상대 경로를 base 에 이어 붙인 본문을 그대로 돌려준다', async () => {
    // given
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      expect(url).toBe(`${BASE}/ko/terms.md`)
      return new Response('# 이용약관', { status: 200 })
    }))
    const api = createPublicDocApi(BASE)

    // when
    const markdown = await api.fetchMarkdown('ko/terms.md')

    // then
    expect(markdown).toBe('# 이용약관')
  })

  it('하위 디렉터리가 있는 경로도 그대로 이어 붙인다', () => {
    // given
    const api = createPublicDocApi(BASE)

    // when / then
    expect(api.sourceUrl('guide/ko/01-basics.md')).toBe(`${BASE}/guide/ko/01-basics.md`)
  })

  it('base URL 끝에 슬래시가 있어도 경로가 겹치지 않는다', () => {
    // given
    const api = createPublicDocApi(`${BASE}/`)

    // when / then
    expect(api.sourceUrl('en/privacy.md')).toBe(`${BASE}/en/privacy.md`)
  })

  it('404 응답이면 reject 된다', async () => {
    // given
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })))
    const api = createPublicDocApi(BASE)

    // when / then
    await expect(api.fetchMarkdown('ko/terms.md')).rejects.toThrow()
  })
})
