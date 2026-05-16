import { describe, it, expect } from 'vitest'
import { resolveScopeI18nKey } from '../../src/constants/oauthScopeCatalog'

describe('oauthScopeCatalog', () => {
  it('알려진 scope 코드는 매핑된 i18n 키를 반환한다', () => {
    expect(resolveScopeI18nKey('read:calendar')).toBe('oauth.scope.read_calendar')
    expect(resolveScopeI18nKey('write:calendar')).toBe('oauth.scope.write_calendar')
  })

  it('알려지지 않은 scope 코드는 null 을 반환한다 (호출자가 폴백 처리)', () => {
    expect(resolveScopeI18nKey('unknown:scope')).toBeNull()
  })
})
