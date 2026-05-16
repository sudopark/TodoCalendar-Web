export const OAUTH_ERROR_FALLBACK_KEY = 'oauth.error.fallback'

const OAUTH_ERROR_REASON_CATALOG: Record<string, string> = {
  invalid_challenge: 'oauth.error.invalid_challenge',
}

export function resolveErrorReasonI18nKey(reason: string | null | undefined): string {
  if (!reason) return OAUTH_ERROR_FALLBACK_KEY
  return OAUTH_ERROR_REASON_CATALOG[reason] ?? OAUTH_ERROR_FALLBACK_KEY
}
