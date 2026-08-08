import i18n, { loadLanguage } from '../../src/i18n'

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

  test('아직 번역이 없는 언어는 en 문구로 폴백한다', async () => {
    // given / when
    await loadLanguage('de')
    // then — de.json 이 아직 없으므로 fallbackLng 인 en 문구
    expect(i18n.t('nav.calendar')).toBe('Calendar')
  })
})
