import { describe, it, expect } from 'vitest'
import {
  PUBLIC_DOCS,
  docFileName,
  docFilePath,
  findPublicDoc,
  isDocLanguage,
  isMultiPageDoc,
  isSupportedDocLanguage,
  isValidDocPage,
  resolveDocLanguage,
} from '../../src/domain/publicDocs'

const TERMS = PUBLIC_DOCS.find(d => d.id === 'terms')!
const GOOGLE_CALENDAR_DATA = PUBLIC_DOCS.find(d => d.id === 'google-calendar-data')!
const GUIDE = PUBLIC_DOCS.find(d => d.id === 'guide')!

describe('publicDocs 레지스트리', () => {
  it('약관·방침·Google 캘린더 데이터 정책·사용 안내가 등록돼 있다', () => {
    // given / when
    const ids = PUBLIC_DOCS.map(d => d.id)

    // then
    expect(ids).toEqual(['terms', 'privacy', 'google-calendar-data', 'guide'])
  })

  it('약관류는 상단 언어 전환을 노출하고 사용 안내는 앱 언어를 따라 노출하지 않는다', () => {
    expect(TERMS.showsLanguageSwitch).toBe(true)
    expect(GUIDE.showsLanguageSwitch).toBe(false)
  })

  it('id 로 문서를 찾으면 해당 문서가, 없는 id 면 undefined 가 반환된다', () => {
    expect(findPublicDoc('privacy')?.pathTemplate).toBe('{lang}/privacy.md')
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

describe('docFilePath', () => {
  it('단일 페이지 문서는 언어만 치환한 원문 경로를 만든다', () => {
    expect(docFilePath(TERMS, 'ko')).toBe('ko/terms.md')
    expect(docFilePath(GOOGLE_CALENDAR_DATA, 'en')).toBe('en/google-calendar-data.md')
  })

  it('다중 페이지 문서는 하위 문서 slug 를 경로에 실어 준다', () => {
    expect(docFilePath(GUIDE, 'ko', '01-basics')).toBe('guide/ko/01-basics.md')
    expect(docFilePath(GUIDE, 'en', '03-widgets')).toBe('guide/en/03-widgets.md')
  })

  it('다중 페이지 문서에서 slug 를 안 주면 목차 문서를 가리킨다', () => {
    expect(docFilePath(GUIDE, 'ko')).toBe('guide/ko/README.md')
  })
})

describe('isMultiPageDoc / docFileName', () => {
  it('하위 문서를 갖는 문서만 다중 페이지로 판정되고, 단일 파일명은 갖지 않는다', () => {
    expect(isMultiPageDoc(GUIDE)).toBe(true)
    expect(docFileName(GUIDE)).toBeUndefined()
  })

  it('단일 페이지 문서는 상대 링크 판정에 쓸 파일명을 갖는다', () => {
    expect(isMultiPageDoc(TERMS)).toBe(false)
    expect(docFileName(TERMS)).toBe('terms.md')
  })
})

describe('isValidDocPage', () => {
  it('원문 레포에 있는 하위 문서 slug 형태만 통과시킨다', () => {
    expect(isValidDocPage('README')).toBe(true)
    expect(isValidDocPage('01-basics')).toBe(true)
    expect(isValidDocPage('04-external-calendars')).toBe(true)
  })

  it('상위 경로 탈출이나 경로 구분자가 섞이면 거부한다', () => {
    expect(isValidDocPage('..')).toBe(false)
    expect(isValidDocPage('../../secret')).toBe(false)
    expect(isValidDocPage('a/b')).toBe(false)
    expect(isValidDocPage('')).toBe(false)
  })
})
