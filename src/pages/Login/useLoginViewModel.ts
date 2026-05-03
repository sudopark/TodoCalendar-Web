import { useState, useCallback } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { AuthError } from '../../domain/errors/AuthError'

// MARK: - Interface

export interface LoginViewModel {
  loading: boolean
  errorKey: string | null
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  dismissError: () => void
}

// MARK: - Hook

export function useLoginViewModel(): LoginViewModel {
  const { authRepo } = useRepositories()
  const [loading, setLoading] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  // #109: 성공 시 loading 을 풀지 않는다 — authStore.account 가 set 되고 LoginPage 가 Navigate 로
  // unmount 될 때까지 전환 로딩 화면을 유지하기 위함. 실패/취소 시에만 loading 을 풀어 다시 시도 가능.
  const signInWithGoogle = useCallback(async () => {
    setLoading(true)
    setErrorKey(null)
    try {
      await authRepo.signInWithGoogle()
    } catch (e) {
      if (e instanceof AuthError) {
        if (e.reason.type !== 'cancelled') {
          setErrorKey(`error.auth.${e.reason.type}`)
        }
      } else if (
        !(e instanceof Error && 'code' in e && (e as { code: string }).code === 'auth/popup-closed-by-user')
      ) {
        setErrorKey('error.unknown')
      }
      setLoading(false)
    }
  }, [authRepo])

  const signInWithApple = useCallback(async () => {
    setLoading(true)
    setErrorKey(null)
    try {
      await authRepo.signInWithApple()
    } catch (e) {
      if (e instanceof AuthError) {
        if (e.reason.type !== 'cancelled') {
          setErrorKey(`error.auth.${e.reason.type}`)
        }
      } else if (
        !(e instanceof Error && 'code' in e && (e as { code: string }).code === 'auth/popup-closed-by-user')
      ) {
        setErrorKey('error.unknown')
      }
      setLoading(false)
    }
  }, [authRepo])

  const dismissError = useCallback(() => setErrorKey(null), [])

  return { loading, errorKey, signInWithGoogle, signInWithApple, dismissError }
}
