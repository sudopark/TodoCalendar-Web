import { describe, it, expect } from 'vitest'
import { OAuthConsentRepository } from '../../src/repositories/OAuthConsentRepository'
import { InvalidChallengeError, OAuthAsTransientError } from '../../src/domain/errors/OAuthConsentError'
import type { ConsentClientInfo } from '../../src/models/oauthConsent'

const sampleInfo: ConsentClientInfo = {
  clientName: 'Claude Desktop',
  redirectUriOrigin: 'https://claude.ai',
  scopes: ['read:calendar'],
  resource: 'https://mcp.todo-calendar.com/mcp',
  expiresAt: 0,
}

describe('OAuthConsentRepository', () => {
  it('정상 응답이면 ConsentClientInfo 를 그대로 반환한다', async () => {
    const repo = new OAuthConsentRepository({
      api: { fetchConsentClient: async () => sampleInfo },
    })
    const result = await repo.fetchClientInfo('abc-123')
    expect(result).toEqual(sampleInfo)
  })

  it('api 가 InvalidChallengeError 를 throw 하면 그대로 전파한다', async () => {
    const repo = new OAuthConsentRepository({
      api: { fetchConsentClient: async () => { throw new InvalidChallengeError() } },
    })
    await expect(repo.fetchClientInfo('abc')).rejects.toBeInstanceOf(InvalidChallengeError)
  })

  it('api 가 OAuthAsTransientError 를 throw 하면 그대로 전파한다', async () => {
    const repo = new OAuthConsentRepository({
      api: { fetchConsentClient: async () => { throw new OAuthAsTransientError(503) } },
    })
    await expect(repo.fetchClientInfo('abc')).rejects.toBeInstanceOf(OAuthAsTransientError)
  })

  it('도메인 외 unknown 에러는 OAuthAsTransientError 로 wrap 한다', async () => {
    const repo = new OAuthConsentRepository({
      api: { fetchConsentClient: async () => { throw new Error('unexpected') } },
    })
    await expect(repo.fetchClientInfo('abc')).rejects.toBeInstanceOf(OAuthAsTransientError)
  })
})
