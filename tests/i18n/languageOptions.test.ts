import { describe, it, expect } from 'vitest'
import { LANGUAGE_OPTIONS, filterLanguages } from '../../src/i18n/languageOptions'
import { SUPPORTED_LANGUAGES } from '../../src/i18n/supportedLanguages'

describe('LANGUAGE_OPTIONS', () => {
  it('지원 언어 전부에 대해 코드·자국어명·영문명을 갖춘 항목이 만들어진다', () => {
    // given: 지원 언어 세트
    // when: 옵션 목록을 읽는다
    const codes = LANGUAGE_OPTIONS.map(o => o.code)

    // then: 지원 언어와 코드 집합이 일치하고, 모든 항목에 표기 이름이 채워져 있다
    // 이름이 빠지면 코드 문자열로 폴백하므로, 폴백하지 않았음을 확인해야 실제 가드가 된다
    expect(codes).toEqual([...SUPPORTED_LANGUAGES])
    expect(LANGUAGE_OPTIONS.filter(o => o.nativeName === o.code)).toEqual([])
    expect(LANGUAGE_OPTIONS.filter(o => o.englishName === o.code)).toEqual([])
  })
})

describe('filterLanguages', () => {
  it('검색어가 비어 있으면 전체 목록을 그대로 돌려준다', () => {
    // given: 공백만 있는 검색어
    // when: 필터링한다
    const result = filterLanguages(LANGUAGE_OPTIONS, '   ')

    // then: 전체가 그대로 나온다
    expect(result).toEqual(LANGUAGE_OPTIONS)
  })

  it('자국어 명칭으로 검색하면 해당 언어를 찾는다', () => {
    // given: 자국어 표기 검색어
    // when: 필터링한다
    const result = filterLanguages(LANGUAGE_OPTIONS, '한국')

    // then: 한국어만 남는다
    expect(result.map(o => o.code)).toEqual(['ko'])
  })

  it('현재 UI 언어를 읽지 못하는 사용자가 영문 명칭으로 자기 언어를 찾을 수 있다', () => {
    // given: 영문 명칭 검색어
    // when: 필터링한다
    const result = filterLanguages(LANGUAGE_OPTIONS, 'korean')

    // then: 한국어가 검색된다
    expect(result.map(o => o.code)).toEqual(['ko'])
  })

  it('언어 코드로 검색하면 해당 언어를 찾는다', () => {
    // given: BCP47 코드 검색어
    // when: 필터링한다
    const result = filterLanguages(LANGUAGE_OPTIONS, 'zh-Hant')

    // then: 번체 중국어가 검색된다
    expect(result.map(o => o.code)).toEqual(['zh-Hant'])
  })

  it('대소문자를 구분하지 않는다', () => {
    // given: 대문자 검색어
    // when: 필터링한다
    const result = filterLanguages(LANGUAGE_OPTIONS, 'DEUTSCH')

    // then: 독일어가 검색된다
    expect(result.map(o => o.code)).toEqual(['de'])
  })

  it('발음 구별 부호 없이 입력해도 해당 언어를 찾는다', () => {
    // given: 라틴 키보드로 입력한, 구별 부호 없는 검색어
    // when: 필터링한다
    const cestina = filterLanguages(LANGUAGE_OPTIONS, 'cestina')
    const turkce = filterLanguages(LANGUAGE_OPTIONS, 'turkce')

    // then: Čeština·Türkçe 가 검색된다
    expect(cestina.map(o => o.code)).toEqual(['cs'])
    expect(turkce.map(o => o.code)).toEqual(['tr'])
  })

  it('여러 언어에 걸치는 검색어는 매칭되는 언어를 모두 돌려준다', () => {
    // given: 두 언어의 자국어 명칭에 공통으로 들어가는 검색어
    // when: 필터링한다
    const result = filterLanguages(LANGUAGE_OPTIONS, 'bahasa')

    // then: 인도네시아어·말레이어가 모두 남는다
    expect(result.map(o => o.code)).toEqual(['id', 'ms'])
  })

  it('매칭되는 언어가 없으면 빈 목록을 돌려준다', () => {
    // given: 어느 언어와도 맞지 않는 검색어
    // when: 필터링한다
    const result = filterLanguages(LANGUAGE_OPTIONS, 'zzzz')

    // then: 빈 목록이다
    expect(result).toEqual([])
  })
})
