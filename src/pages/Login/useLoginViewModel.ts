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

  const signInWithGoogle = useCallback(async () => {
    setLoading(true)
    setErrorKey(null)
    try {
      await authRepo.signInWithGoogle()
    } catch (e) {
      if (e instanceof AuthError) {
        if (e.reason.type === 'cancelled') {
          // 사용자가 팝업을 닫은 경우 에러를 표시하지 않는다
        } else {
          setErrorKey(`error.auth.${e.reason.type}`)
        }
      } else if (
        e instanceof Error &&
        'code' in e &&
        (e as { code: string }).code === 'auth/popup-closed-by-user'
      ) {
        // Firebase 원시 에러 — 팝업 닫힘, 에러 표시 안 함
      } else {
        setErrorKey('error.unknown')
      }
    } finally {
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
        if (e.reason.type === 'cancelled') {
          // 사용자가 팝업을 닫은 경우 에러를 표시하지 않는다
        } else {
          setErrorKey(`error.auth.${e.reason.type}`)
        }
      } else if (
        e instanceof Error &&
        'code' in e &&
        (e as { code: string }).code === 'auth/popup-closed-by-user'
      ) {
        // Firebase 원시 에러 — 팝업 닫힘, 에러 표시 안 함
      } else {
        setErrorKey('error.unknown')
      }
    } finally {
      setLoading(false)
    }
  }, [authRepo])

  const dismissError = useCallback(() => setErrorKey(null), [])

  return { loading, errorKey, signInWithGoogle, signInWithApple, dismissError }
}
