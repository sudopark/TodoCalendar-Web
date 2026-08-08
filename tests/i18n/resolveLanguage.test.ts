import { resolveLanguage } from '../../src/i18n/resolveLanguage'
import { SUPPORTED_LANGUAGES, LANGUAGE_NATIVE_NAMES } from '../../src/i18n/supportedLanguages'

describe('SUPPORTED_LANGUAGES', () => {
  test('앱과 동일한 31개 언어를 담는다', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(31)
    expect(SUPPORTED_LANGUAGES).toContain('en')
    expect(SUPPORTED_LANGUAGES).toContain('zh-Hant')
    expect(SUPPORTED_LANGUAGES).toContain('pt-BR')
  })

  test('모든 언어에 자국어 표시명이 있다', () => {
    for (const code of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_NATIVE_NAMES[code]).toBeTruthy()
    }
  })
})

describe('resolveLanguage', () => {
  test('저장된 언어가 지원 목록에 있으면 그것을 쓴다', () => {
    expect(resolveLanguage('ja', ['de-DE', 'de'])).toBe('ja')
  })

  test('저장값이 없으면 시스템 언어를 쓴다', () => {
    expect(resolveLanguage(null, ['ja-JP', 'ja'])).toBe('ja')
  })

  test('저장값이 지원 목록에 없으면 시스템 언어로 넘어간다', () => {
    expect(resolveLanguage('klingon', ['de-DE'])).toBe('de')
  })

  test('지역 변형은 기본 언어로 폴백한다', () => {
    expect(resolveLanguage(null, ['en-GB'])).toBe('en')
    expect(resolveLanguage(null, ['de-AT'])).toBe('de')
  })

  test('포르투갈어는 유럽 변형이어도 pt-BR 로 간다', () => {
    expect(resolveLanguage(null, ['pt-PT'])).toBe('pt-BR')
    expect(resolveLanguage(null, ['pt'])).toBe('pt-BR')
  })

  test('중국어는 번체·간체 스크립트로 가른다', () => {
    expect(resolveLanguage(null, ['zh-TW'])).toBe('zh-Hant')
    expect(resolveLanguage(null, ['zh-HK'])).toBe('zh-Hant')
    expect(resolveLanguage(null, ['zh-CN'])).toBe('zh-Hans')
    expect(resolveLanguage(null, ['zh-SG'])).toBe('zh-Hans')
    expect(resolveLanguage(null, ['zh'])).toBe('zh-Hans')
  })

  test('노르웨이어는 nb 로 모은다', () => {
    expect(resolveLanguage(null, ['nb-NO'])).toBe('nb')
    expect(resolveLanguage(null, ['no'])).toBe('nb')
  })

  test('선호 순서대로 훑어 첫 지원 언어를 고른다', () => {
    expect(resolveLanguage(null, ['klingon', 'xx-YY', 'fr-FR', 'ja'])).toBe('fr')
  })

  test('지원되는 언어가 하나도 없으면 en 이다', () => {
    expect(resolveLanguage(null, ['klingon', 'xx-YY'])).toBe('en')
  })

  test('시스템 언어 목록이 비어도 en 이다', () => {
    expect(resolveLanguage(null, [])).toBe('en')
  })

  test('대소문자가 달라도 매칭한다', () => {
    expect(resolveLanguage(null, ['PT-pt'])).toBe('pt-BR')
    expect(resolveLanguage('ZH-HANT', [])).toBe('zh-Hant')
  })
})
