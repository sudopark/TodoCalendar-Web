import { describe, test, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n, { loadLanguage } from '../../../../src/i18n'
import { LanguageSection } from '../../../../src/pages/settings/sections/LanguageSection'

describe('LanguageSection', () => {
  afterEach(async () => {
    await loadLanguage('ko')
  })

  test('부팅 시 로드되지 않았던 언어를 선택하면 그 언어의 실제 문구로 전환된다 (en 폴백 아님)', async () => {
    // given — 시스템 언어가 en 이라 ko 번들이 아직 로드되지 않은 상황을 재현
    await loadLanguage('en')
    i18n.removeResourceBundle('ko', 'translation')
    render(<LanguageSection />)
    expect(screen.getByText('Language')).toBeInTheDocument()

    // when — 설정에서 한국어를 선택
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox'), '한국어')

    // then — en 폴백 문구가 아니라 실제 한국어 문구가 나온다
    expect(await screen.findByText('언어')).toBeInTheDocument()
  })

  test('활성 언어가 아직 번역 파일 없는 제3언어여도 select 는 그 언어가 선택된 상태로 보인다', async () => {
    // given — de 는 아직 de.json 이 없는 언어 (resolveLanguage 가 반환할 수 있는 31개 언어 중 하나)
    await loadLanguage('de')

    // when
    render(<LanguageSection />)

    // then — 번역 파일 유무와 무관하게 select 값은 실제 활성 언어를 그대로 반영한다 (English 로 거짓 표시 금지)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('de')
    expect(screen.getByRole('option', { name: 'Deutsch', selected: true })).toBeInTheDocument()
  })

  test('언어를 전환하면 select 값도 새 언어로 바뀐다', async () => {
    // given — 초기 언어 ko
    render(<LanguageSection />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('ko')

    // when — English 를 선택
    const user = userEvent.setup()
    await user.selectOptions(select, 'English')

    // then — select 값이 en 으로, 렌더된 라벨도 English 문구로 바뀐다
    expect(await screen.findByText('Language')).toBeInTheDocument()
    expect(select.value).toBe('en')
  })

  test('번들 로드 자체가 실패하면 catch 로 빠져 현재 언어를 유지하고 저장하지 않는다', async () => {
    // given — en 로더는 있지만 fetch 가 실패하는 상황(청크 로드 실패 등)을 이 테스트 안에서만 재현.
    // (tests/setup.ts 가 파일 로드 시점에 이미 initI18n() 을 끝내둬서 파일 최상단 vi.mock 으로는
    //  가로챌 수 없다 — resetModules 로 새 모듈 그래프를 만들어 그 안에서 렌더링·검증한다)
    vi.resetModules()
    vi.doMock('../../../../src/i18n/localeBundleLoaders', async () => {
      const actual = await vi.importActual<typeof import('../../../../src/i18n/localeBundleLoaders')>(
        '../../../../src/i18n/localeBundleLoaders',
      )
      return {
        loaderFor: (lng: string) =>
          lng === 'en' ? () => Promise.reject(new Error('chunk load failed')) : actual.loaderFor(lng),
      }
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.removeItem('language') // 이전 테스트가 남긴 저장값 오염 제거

    const freshI18nModule = await import('../../../../src/i18n')
    await freshI18nModule.initI18n()
    await freshI18nModule.loadLanguage('ko')
    const { LanguageSection: FreshLanguageSection } = await import(
      '../../../../src/pages/settings/sections/LanguageSection'
    )

    render(<FreshLanguageSection />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('ko')

    // when — English 선택 (내부적으로 loadLanguage('en') 이 reject 되는 상황)
    const user = userEvent.setup()
    await user.selectOptions(select, 'English')

    // then — catch 로 빠져 언어도 select 표시도 원래대로, 저장도 되지 않는다
    await screen.findByText('언어') // 재렌더 이후에도 여전히 한국어 문구
    expect(select.value).toBe('ko')
    expect(freshI18nModule.readStoredLanguage()).not.toBe('en')
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
    vi.doUnmock('../../../../src/i18n/localeBundleLoaders')
    vi.resetModules()
  })
})
