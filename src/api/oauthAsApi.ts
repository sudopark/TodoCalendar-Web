import { InvalidChallengeError, OAuthAsTransientError } from '../domain/errors/OAuthConsentError'
import type { ConsentClientInfo } from '../models/oauthConsent'

interface RawConsentResponse {
  client_name: string
  redirect_uri_origin: string
  scope: string
  resource: string
  expires_at: number
}

export interface OAuthAsApi {
  fetchConsentClient(challenge: string): Promise<ConsentClientInfo>
}

export function createOAuthAsApi(baseUrl: string): OAuthAsApi {
  return {
    async fetchConsentClient(challenge) {
      let response: Response
      try {
        response = await fetch(`${baseUrl}/v1/oauth/consent/${encodeURIComponent(challenge)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
      } catch (e) {
        throw new OAuthAsTransientError(undefined, e)
      }

      if (response.status === 404) throw new InvalidChallengeError()
      if (!response.ok) throw new OAuthAsTransientError(response.status)

      const raw = (await response.json()) as RawConsentResponse
      return {
        clientName: raw.client_name,
        redirectUriOrigin: raw.redirect_uri_origin,
        scopes: raw.scope.split(/\s+/).filter(Boolean),
        resource: raw.resource,
        expiresAt: raw.expires_at,
      }
    },
  }
}
