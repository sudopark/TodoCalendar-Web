const OAUTH_SCOPE_CATALOG: Record<string, string> = {
  'read:calendar': 'oauth.scope.read_calendar',
  'write:calendar': 'oauth.scope.write_calendar',
}

export function resolveScopeI18nKey(code: string): string | null {
  return OAUTH_SCOPE_CATALOG[code] ?? null
}
