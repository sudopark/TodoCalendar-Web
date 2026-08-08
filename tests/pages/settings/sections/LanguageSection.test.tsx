import { describe, test, expect, afterEach } from 'vitest'
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

  test('활성 언어가 ko/en 아닌 제3언어면 select 는 en 옵션이 선택된 상태로 보인다', async () => {
    // given — de 는 옵션에 없는 언어 (resolveLanguage 가 반환할 수 있는 31개 언어 중 하나)
    await loadLanguage('de')

    // when
    render(<LanguageSection />)

    // then — 옵션에 없는 값이라 selectedIndex 가 -1(빈 선택)이 되면 안 되고, en 이 실제로 선택돼야 한다
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('en')
    expect(screen.getByRole('option', { name: 'English', selected: true })).toBeInTheDocument()
  })
})
