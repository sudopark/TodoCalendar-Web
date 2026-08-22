import { describe, it, expect } from 'vitest'
import { rewriteDocLink } from '../../../src/components/markdown/rewriteDocLink'
import { PUBLIC_DOCS } from '../../../src/domain/publicDocs'

const GUIDE = PUBLIC_DOCS.find(d => d.id === 'guide')!

describe('rewriteDocLink', () => {
  it('레지스트리에 있는 md 상대 링크는 현재 언어의 내부 라우트가 된다', () => {
    expect(rewriteDocLink('./privacy.md', 'ko')).toEqual({ kind: 'internal', to: '/privacy/ko' })
    expect(rewriteDocLink('terms.md', 'en')).toEqual({ kind: 'internal', to: '/terms/en' })
    expect(rewriteDocLink('../ko/privacy.md', 'en')).toEqual({ kind: 'internal', to: '/privacy/en' })
  })

  it('md 링크에 붙은 앵커는 파일명 판정에서 제외되지만 이동 경로에는 그대로 실린다', () => {
    expect(rewriteDocLink('./privacy.md#section-3', 'ko')).toEqual({
      kind: 'internal',
      to: '/privacy/ko#section-3',
    })
  })

  it('문서 내 앵커 링크는 그대로 유지된다', () => {
    expect(rewriteDocLink('#article-1', 'ko')).toEqual({ kind: 'anchor', href: '#article-1' })
  })

  it('스킴이 있는 링크는 외부 링크로 다뤄진다', () => {
    expect(rewriteDocLink('https://example.com', 'ko')).toEqual({ kind: 'external', href: 'https://example.com' })
    expect(rewriteDocLink('mailto:me@example.com', 'ko')).toEqual({ kind: 'external', href: 'mailto:me@example.com' })
  })

  it('레지스트리에 없는 md 링크는 외부 링크로 남는다', () => {
    expect(rewriteDocLink('./changelog.md', 'ko')).toEqual({ kind: 'external', href: './changelog.md' })
  })

  it('href 가 비어 있으면 외부 링크로 다뤄진다', () => {
    expect(rewriteDocLink(undefined, 'ko')).toEqual({ kind: 'external', href: '' })
  })
})

describe('rewriteDocLink — 다중 페이지 문서 안에서', () => {
  it('형제 문서 링크는 같은 문서의 하위 경로가 된다', () => {
    expect(rewriteDocLink('./01-basics.md', 'ko', GUIDE)).toEqual({
      kind: 'internal',
      to: '/guide/ko/01-basics',
    })
  })

  it('목차 문서 링크는 하위 경로 없는 문서 루트가 된다', () => {
    expect(rewriteDocLink('./README.md', 'en', GUIDE)).toEqual({ kind: 'internal', to: '/guide/en' })
  })

  it('형제 문서 링크에 붙은 앵커가 유지된다', () => {
    expect(rewriteDocLink('./01-basics.md#이벤트-종류와-색', 'ko', GUIDE)).toEqual({
      kind: 'internal',
      to: '/guide/ko/01-basics#이벤트-종류와-색',
    })
  })

  it('레지스트리에 있는 다른 문서 링크는 그 문서 경로가 된다', () => {
    expect(rewriteDocLink('./privacy.md', 'ko', GUIDE)).toEqual({ kind: 'internal', to: '/privacy/ko' })
  })

  it('현재 문서를 모르면 형제 문서 링크는 외부 링크로 남는다', () => {
    expect(rewriteDocLink('./01-basics.md', 'ko')).toEqual({ kind: 'external', href: './01-basics.md' })
  })
})
