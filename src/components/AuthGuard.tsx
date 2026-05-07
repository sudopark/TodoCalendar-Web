import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useRepositories } from '../composition/RepositoriesProvider'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { account, loading } = useAuthStore()
  const location = useLocation()
  const { localStorageContainer, eventRepo, tagRepo, foremostEventRepo } = useRepositories()

  // LocalStorageContainer lifecycle (PR1 와이어링 — 그대로 유지)
  useEffect(() => {
    if (!account?.uid) return
    let cancelled = false
    localStorageContainer.init(account.uid).catch((e) => {
      if (!cancelled) console.warn('LocalStorageContainer init 실패:', e)
    })
    return () => {
      cancelled = true
      localStorageContainer.dispose().catch(() => {})
    }
  }, [account?.uid, localStorageContainer])

  // Prefetch — Repository 기반 (cache-first 효과 자동 적용)
  useEffect(() => {
    if (account) {
      Promise.allSettled([
        tagRepo.fetchAll(),
        eventRepo.fetchCurrentTodos(),
        foremostEventRepo.fetch(),
        eventRepo.fetchUncompletedTodos(),
      ]).then(results => {
        const failed = results
          .map((r, i) => r.status === 'rejected' ? ['tags', 'todos', 'foremost', 'uncompleted'][i] : null)
          .filter(Boolean)
        if (failed.length > 0) {
          console.warn('Failed to load:', failed.join(', '))
        }
      })
    }
  }, [account, eventRepo, tagRepo, foremostEventRepo])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div data-testid="loading-spinner" className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!account) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
