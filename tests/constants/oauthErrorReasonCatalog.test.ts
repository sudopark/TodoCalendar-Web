import { describe, it, expect } from 'vitest'
import { resolveErrorReasonI18nKey, OAUTH_ERROR_FALLBACK_KEY } from '../../src/constants/oauthErrorReasonCatalog'

describe('oauthErrorReasonCatalog', () => {
  it('whitelist 의 reason 은 매핑된 키를 반환한다', () => {
    expect(resolveErrorReasonI18nKey('invalid_challenge')).toBe('oauth.error.invalid_challenge')
  })

  it('whitelist 외 reason 은 fallback 키를 반환한다 (raw 노출 금지)', () => {
    expect(resolveErrorReasonI18nKey('something_unexpected')).toBe(OAUTH_ERROR_FALLBACK_KEY)
    expect(resolveErrorReasonI18nKey('')).toBe(OAUTH_ERROR_FALLBACK_KEY)
    expect(resolveErrorReasonI18nKey(null)).toBe(OAUTH_ERROR_FALLBACK_KEY)
  })

  it('fallback 키가 정의돼 있다', () => {
    expect(OAUTH_ERROR_FALLBACK_KEY).toBe('oauth.error.fallback')
  })
})
