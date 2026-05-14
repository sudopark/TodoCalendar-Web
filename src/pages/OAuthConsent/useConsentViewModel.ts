import { useCallback, useEffect, useRef, useState } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { useAuthStore } from '../../stores/authStore'
import { InvalidChallengeError } from '../../domain/errors/OAuthConsentError'
import type { ConsentClientInfo } from '../../models/oauthConsent'

const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/
// scheme + host[:port] 만 허용 (path/query/fragment/whitespace 끼면 거부) — 클라이언트 방어층
const ORIGIN_PATTERN = /^https?:\/\/[^/?#\s]+$/

export type ConsentViewState =
  | 'loading'
  | 'invalid_query'
  | 'redirect_to_login'
  | 'redirect_to_error'
  | 'transient_error'
  | 'ready'

export interface ConsentViewModel {
  state: ConsentViewState
  clientInfo: ConsentClientInfo | null
  retry?: () => void
}

export function useConsentViewModel(challenge: string): ConsentViewModel {
  const { oauthConsentRepo } = useRepositories()
  // ref 로 감싸서 effect deps 에서 제외 — repo 자체는 composition root 에서 한 번 생성되며 교체되지 않음
  const repoRef = useRef(oauthConsentRepo)
  repoRef.current = oauthConsentRepo

  const account = useAuthStore(s => s.account)
  const authLoading = useAuthStore(s => s.loading)

  const [state, setState] = useState<ConsentViewState>('loading')
  const [clientInfo, setClientInfo] = useState<ConsentClientInfo | null>(null)
  const [fetchAttempt, setFetchAttempt] = useState(0)

  const retry = useCallback(() => {
    setState('loading')
    setFetchAttempt(n => n + 1)
  }, [])

  useEffect(() => {
    if (!CHALLENGE_PATTERN.test(challenge)) {
      setState('invalid_query')
      return
    }
    if (authLoading) {
      setState('loading')
      return
    }
    if (!account) {
      setState('redirect_to_login')
      return
    }
    let cancelled = false
    setState('loading')
    repoRef.current
      .fetchClientInfo(challenge)
      .then(info => {
        if (cancelled) return
        if (!ORIGIN_PATTERN.test(info.redirectUriOrigin)) {
          // AS 가 정제 후 보내는 값이라 정상 흐름에선 안 일어나야 함 — 클라이언트 방어층
          setState('redirect_to_error')
          return
        }
        setClientInfo(info)
        setState('ready')
      })
      .catch(err => {
        if (cancelled) return
        if (err instanceof InvalidChallengeError) {
          setState('redirect_to_error')
        } else {
          setState('transient_error')
        }
      })
    return () => { cancelled = true }
  }, [challenge, authLoading, account, fetchAttempt])

  return { state, clientInfo, retry }
}
