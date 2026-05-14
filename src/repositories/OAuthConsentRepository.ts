import type { OAuthAsApi } from '../api/oauthAsApi'
import type { ConsentClientInfo } from '../models/oauthConsent'
import { InvalidChallengeError, OAuthAsTransientError } from '../domain/errors/OAuthConsentError'

interface Deps {
  api: OAuthAsApi
}

export class OAuthConsentRepository {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  async fetchClientInfo(challenge: string): Promise<ConsentClientInfo> {
    try {
      return await this.deps.api.fetchConsentClient(challenge)
    } catch (e) {
      if (e instanceof InvalidChallengeError) throw e
      if (e instanceof OAuthAsTransientError) throw e
      throw new OAuthAsTransientError(undefined, e)
    }
  }
}
