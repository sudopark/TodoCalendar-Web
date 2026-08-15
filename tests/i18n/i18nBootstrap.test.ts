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

  test('지원 언어인데 번들만 없으면 언어는 그대로 두고 문구만 en 으로 폴백한다', async () => {
    // given — de 로더만 없는 상태. setup.ts 의 initI18n 이 vi.mock hoisting 보다 먼저 돌아서
    // top-level mock 이 안 먹으므로 resetModules + doMock 으로 새 인스턴스를 만든다
    vi.resetModules()
    vi.doMock('../../src/i18n/localeBundleLoaders', async () => {
      const actual = await vi.importActual<typeof import('../../src/i18n/localeBundleLoaders')>(
        '../../src/i18n/localeBundleLoaders',
      )
      return { loaderFor: (lng: string) => (lng === 'de' ? undefined : actual.loaderFor(lng)) }
    })
    const fresh = await import('../../src/i18n')
    await fresh.initI18n()

    // when
    await fresh.loadLanguage('de')

    // then — 미지원 코드로 걸러진 게 아니라 번들만 없는 상태여야 의미가 있다
    expect(fresh.default.language).toBe('de')
    expect(fresh.default.t('nav.calendar')).toBe('Calendar')

    vi.doUnmock('../../src/i18n/localeBundleLoaders')
    vi.resetModules()
  })
})
