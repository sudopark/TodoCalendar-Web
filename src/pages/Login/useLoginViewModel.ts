import { useState, useCallback, useEffect } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { AuthError } from '../../domain/errors/AuthError'
import { useAuthStore } from '../../stores/authStore'

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

  // #109: Firebase 는 성공했지만 백엔드 account 등록이 실패해 LoginPage 가 unmount 되지 못하는 경우,
  // authStore.signInError 신호를 보고 loading 을 해제해 사용자가 재시도할 수 있게 한다 (stuck-spinner 차단).
  const signInError = useAuthStore(s => s.signInError)
  const clearSignInError = useAuthStore(s => s.clearSignInError)
  useEffect(() => {
    if (signInError && loading) {
      setErrorKey('error.unknown')
      setLoading(false)
      clearSignInError()
    }
  }, [signInError, loading, clearSignInError])

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
