import { describe, it, expect } from 'vitest'
import {
  PUBLIC_DOCS,
  findPublicDoc,
  isDocLanguage,
  resolveDocLanguage,
} from '../../src/domain/publicDocs'

describe('publicDocs 레지스트리', () => {
  it('약관과 개인정보처리방침이 등록돼 있고 파일명이 <lang>/<file>.md 규약을 따른다', () => {
    // given / when
    const ids = PUBLIC_DOCS.map(d => d.id)

    // then
    expect(ids).toEqual(['terms', 'privacy'])
    expect(PUBLIC_DOCS.map(d => d.fileName)).toEqual(['terms.md', 'privacy.md'])
  })

  it('id 로 문서를 찾으면 해당 문서가, 없는 id 면 undefined 가 반환된다', () => {
    expect(findPublicDoc('privacy')?.fileName).toBe('privacy.md')
    expect(findPublicDoc('nope')).toBeUndefined()
    expect(findPublicDoc(undefined)).toBeUndefined()
  })
})

describe('isDocLanguage', () => {
  it('ko/en 만 문서 언어로 인정한다', () => {
    expect(isDocLanguage('ko')).toBe(true)
    expect(isDocLanguage('en')).toBe(true)
    expect(isDocLanguage('fr')).toBe(false)
    expect(isDocLanguage('KO')).toBe(false)
    expect(isDocLanguage(undefined)).toBe(false)
  })
})

describe('resolveDocLanguage', () => {
  it('ko 계열 UI 언어는 ko 문서로 clamp 된다', () => {
    expect(resolveDocLanguage('ko')).toBe('ko')
    expect(resolveDocLanguage('ko-KR')).toBe('ko')
  })

  it('ko 가 아닌 나머지 UI 언어는 전부 en 문서로 clamp 된다', () => {
    expect(resolveDocLanguage('en')).toBe('en')
    expect(resolveDocLanguage('ja')).toBe('en')
    expect(resolveDocLanguage('zh-Hans')).toBe('en')
    expect(resolveDocLanguage('pt-BR')).toBe('en')
  })

  it('언어를 알 수 없으면 en 문서로 clamp 된다', () => {
    expect(resolveDocLanguage(undefined)).toBe('en')
    expect(resolveDocLanguage(null)).toBe('en')
    expect(resolveDocLanguage('')).toBe('en')
  })
})
