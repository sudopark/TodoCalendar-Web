import { describe, it, expect } from 'vitest'
import {
  PUBLIC_DOCS,
  findPublicDoc,
  isDocLanguage,
  isSupportedDocLanguage,
  resolveDocLanguage,
} from '../../src/domain/publicDocs'

const TERMS = PUBLIC_DOCS.find(d => d.id === 'terms')!
const GOOGLE_CALENDAR_DATA = PUBLIC_DOCS.find(d => d.id === 'google-calendar-data')!

describe('publicDocs 레지스트리', () => {
  it('약관·개인정보처리방침·Google 캘린더 데이터 정책이 등록돼 있고 파일명이 <lang>/<file>.md 규약을 따른다', () => {
    // given / when
    const ids = PUBLIC_DOCS.map(d => d.id)

    // then
    expect(ids).toEqual(['terms', 'privacy', 'google-calendar-data'])
    expect(PUBLIC_DOCS.map(d => d.fileName)).toEqual([
      'terms.md',
      'privacy.md',
      'google-calendar-data.md',
    ])
  })

  it('id 로 문서를 찾으면 해당 문서가, 없는 id 면 undefined 가 반환된다', () => {
    expect(findPublicDoc('privacy')?.fileName).toBe('privacy.md')
    expect(findPublicDoc('nope')).toBeUndefined()
    expect(findPublicDoc(undefined)).toBeUndefined()
  })

  it('번역본이 있는 문서는 ko/en 을, 영문 단일본은 en 만 지원 언어로 갖는다', () => {
    expect([...TERMS.languages]).toEqual(['ko', 'en'])
    expect([...GOOGLE_CALENDAR_DATA.languages]).toEqual(['en'])
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

describe('isSupportedDocLanguage', () => {
  it('문서가 실제로 제공하는 언어만 인정한다', () => {
    expect(isSupportedDocLanguage(TERMS, 'ko')).toBe(true)
    expect(isSupportedDocLanguage(TERMS, 'en')).toBe(true)
    expect(isSupportedDocLanguage(GOOGLE_CALENDAR_DATA, 'en')).toBe(true)
    expect(isSupportedDocLanguage(GOOGLE_CALENDAR_DATA, 'ko')).toBe(false)
    expect(isSupportedDocLanguage(TERMS, 'fr')).toBe(false)
    expect(isSupportedDocLanguage(TERMS, undefined)).toBe(false)
  })
})

describe('resolveDocLanguage', () => {
  it('번역본이 있는 문서에서 ko 계열 UI 언어는 ko 문서로 clamp 된다', () => {
    expect(resolveDocLanguage(TERMS, 'ko')).toBe('ko')
    expect(resolveDocLanguage(TERMS, 'ko-KR')).toBe('ko')
  })

  it('번역본이 있는 문서에서 ko 가 아닌 나머지 UI 언어는 전부 en 문서로 clamp 된다', () => {
    expect(resolveDocLanguage(TERMS, 'en')).toBe('en')
    expect(resolveDocLanguage(TERMS, 'ja')).toBe('en')
    expect(resolveDocLanguage(TERMS, 'zh-Hans')).toBe('en')
    expect(resolveDocLanguage(TERMS, 'pt-BR')).toBe('en')
  })

  it('언어를 알 수 없으면 en 문서로 clamp 된다', () => {
    expect(resolveDocLanguage(TERMS, undefined)).toBe('en')
    expect(resolveDocLanguage(TERMS, null)).toBe('en')
    expect(resolveDocLanguage(TERMS, '')).toBe('en')
  })

  it('영문 단일본 문서는 ko 계열 UI 언어에서도 en 문서로 clamp 된다', () => {
    expect(resolveDocLanguage(GOOGLE_CALENDAR_DATA, 'ko')).toBe('en')
    expect(resolveDocLanguage(GOOGLE_CALENDAR_DATA, 'ko-KR')).toBe('en')
  })
})
