export type OAuthScopeCode = 'read:calendar' | 'write:calendar' | string

export interface ConsentClientInfo {
  clientName: string
  redirectUriOrigin: string
  scopes: OAuthScopeCode[]
  resource: string
  expiresAt: number
}
