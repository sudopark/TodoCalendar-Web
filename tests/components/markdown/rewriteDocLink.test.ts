import { describe, it, expect } from 'vitest'
import { rewriteDocLink } from '../../../src/components/markdown/rewriteDocLink'

describe('rewriteDocLink', () => {
  it('레지스트리에 있는 md 상대 링크는 현재 언어의 내부 라우트가 된다', () => {
    expect(rewriteDocLink('./privacy.md', 'ko')).toEqual({ kind: 'internal', to: '/privacy/ko' })
    expect(rewriteDocLink('terms.md', 'en')).toEqual({ kind: 'internal', to: '/terms/en' })
    expect(rewriteDocLink('../ko/privacy.md', 'en')).toEqual({ kind: 'internal', to: '/privacy/en' })
  })

  it('md 링크에 붙은 앵커·쿼리는 파일명 판정에서 무시된다', () => {
    expect(rewriteDocLink('./privacy.md#section-3', 'ko')).toEqual({ kind: 'internal', to: '/privacy/ko' })
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
