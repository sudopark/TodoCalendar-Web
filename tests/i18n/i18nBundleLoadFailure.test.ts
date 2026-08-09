import { describe, test, expect, vi } from 'vitest'

/**
 * tests/setup.ts 가 모든 테스트 파일에서 initI18n()/loadLanguage('ko') 를 이미 실행해두기 때문에,
 * 파일 최상단 vi.mock 으로는 그 시점에 이미 평가된 src/i18n.ts 의 loaderFor 바인딩을 바꿀 수 없다
 * (setupFiles 실행이 이 파일의 vi.mock 등록보다 먼저 끝난다). 그래서 테스트 안에서
 * vi.resetModules() + vi.doMock() 으로 완전히 새 모듈 그래프를 만들어 그 안에서 검증한다.
 */
describe('i18n 번들 로드 실패', () => {
  test('loader 는 있는데 번들 fetch 자체가 실패하면 loadLanguage 가 reject 한다', async () => {
    // given — en 로더가 존재하지만 fetch 자체가 실패하는 상황(청크 로드 실패 등)을 재현
    vi.resetModules()
    vi.doMock('../../src/i18n/localeBundleLoaders', async () => {
      const actual = await vi.importActual<typeof import('../../src/i18n/localeBundleLoaders')>(
        '../../src/i18n/localeBundleLoaders',
      )
      return {
        loaderFor: (lng: string) =>
          lng === 'en' ? () => Promise.reject(new Error('chunk load failed')) : actual.loaderFor(lng),
      }
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const fresh = await import('../../src/i18n')
    await fresh.initI18n()

    // when / then — en 을 선택하면 reject 되고, 현재 언어도 저장값도 en 으로 바뀌지 않는다
    const languageBefore = fresh.default.language
    await expect(fresh.loadLanguage('en')).rejects.toThrow('chunk load failed')
    expect(fresh.default.language).toBe(languageBefore)
    expect(fresh.readStoredLanguage()).not.toBe('en')
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
    vi.doUnmock('../../src/i18n/localeBundleLoaders')
    vi.resetModules()
  })

  test('loader 자체가 없는(아직 번역 파일 없는) 언어는 실패로 분류되지 않고 정상적으로 전환된다', async () => {
    // given — 앞 테스트의 resetModules 로 새 모듈 그래프이므로 초기화부터 다시
    const fresh = await import('../../src/i18n')
    await fresh.initI18n()

    // when — de.json 은 애초에 없는 파일이라 "missing" 이지 "failed" 가 아니다
    await expect(fresh.loadLanguage('de')).resolves.toBeUndefined()

    // then — reject 되지 않고 언어 전환은 그대로 반영된다 (en 폴백은 i18nBootstrap.test.ts 에서 검증)
    expect(fresh.default.language).toBe('de')
  })
})
