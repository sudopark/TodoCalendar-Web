import { describe, it, expect } from 'vitest'
import { PublicDocRepository } from '../../src/repositories/PublicDocRepository'
import type { PublicDocApi } from '../../src/api/publicDocApi'
import type { DocLanguage, PublicDoc } from '../../src/domain/publicDocs'

const TERMS: PublicDoc = { id: 'terms', fileName: 'terms.md', titleKey: 'publicDoc.terms.title' }

// bodies 를 참조로 들고 있어 테스트 도중 원본을 바꿀 수 있다 (캐시 검증용)
function stubApi(bodies: Partial<Record<DocLanguage, string>>): PublicDocApi {
  return {
    sourceUrl: (fileName, lang) => `https://raw.example.test/${lang}/${fileName}`,
    async fetchMarkdown(fileName, lang) {
      const body = bodies[lang]
      if (body === undefined) throw new Error(`no doc: ${lang}/${fileName}`)
      return body
    },
  }
}

describe('PublicDocRepository', () => {
  it('요청한 언어의 문서가 있으면 그 본문을 돌려준다', async () => {
    // given
    const repo = new PublicDocRepository({ api: stubApi({ ko: '한국어 본문', en: 'English body' }) })

    // when
    const markdown = await repo.loadDoc(TERMS, 'ko')

    // then
    expect(markdown).toBe('한국어 본문')
  })

  it('한 번 읽은 문서는 원본이 바뀌어도 같은 세션 안에서 같은 본문을 유지한다', async () => {
    // given: 첫 로드 뒤 원본을 바꿔 둔다 — 다시 fetch 했다면 새 본문이 나올 것이다
    const bodies = { ko: '처음 본문' }
    const repo = new PublicDocRepository({ api: stubApi(bodies) })
    await repo.loadDoc(TERMS, 'ko')
    bodies.ko = '바뀐 본문'

    // when
    const second = await repo.loadDoc(TERMS, 'ko')

    // then
    expect(second).toBe('처음 본문')
  })

  it('요청한 언어의 문서가 없으면 en 원문으로 대체된다', async () => {
    // given
    const repo = new PublicDocRepository({ api: stubApi({ en: 'English body' }) })

    // when
    const markdown = await repo.loadDoc(TERMS, 'ko')

    // then
    expect(markdown).toBe('English body')
  })

  it('en 원문마저 실패하면 reject 된다', async () => {
    // given
    const repo = new PublicDocRepository({ api: stubApi({}) })

    // when / then
    await expect(repo.loadDoc(TERMS, 'en')).rejects.toThrow()
  })

  it('원문 URL 을 문서와 언어로 만들어 준다', () => {
    // given
    const repo = new PublicDocRepository({ api: stubApi({}) })

    // when / then
    expect(repo.sourceUrl(TERMS, 'ko')).toBe('https://raw.example.test/ko/terms.md')
  })
})
