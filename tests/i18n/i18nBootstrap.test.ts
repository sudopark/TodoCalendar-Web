import i18n, { loadLanguage } from '../../src/i18n'
import { SUPPORTED_LANGUAGES } from '../../src/i18n/supportedLanguages'
import { loaderFor } from '../../src/i18n/localeBundleLoaders'

describe('i18n 부트스트랩', () => {
  afterEach(async () => {
    await loadLanguage('ko')
  })

  test('점이 들어간 flat 키를 그대로 조회한다', () => {
    // given / when
    const result = i18n.t('nav.calendar')
    // then — 키가 그대로 반환되면 조회 실패
    expect(result).not.toBe('nav.calendar')
    expect(result.length).toBeGreaterThan(0)
  })

  test('언어를 로드하면 그 언어 문구가 나온다', async () => {
    // given / when
    await loadLanguage('en')
    // then
    expect(i18n.t('nav.calendar')).toBe('Calendar')
  })

  test('지원 언어는 모두 번들 로더를 갖는다', () => {
    // given / when
    const withoutBundle = SUPPORTED_LANGUAGES.filter(lng => loaderFor(lng) === undefined)
    // then
    expect(withoutBundle).toEqual([])
  })

  test('번들이 없는 언어로 전환하면 en 문구로 폴백한다', async () => {
    // given — 로케일 파일이 없는 코드
    expect(loaderFor('xx')).toBeUndefined()
    // when
    await loadLanguage('xx')
    // then
    expect(i18n.t('nav.calendar')).toBe('Calendar')
  })
})
