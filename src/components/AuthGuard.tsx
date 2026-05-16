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

  // LocalStorageContainer init 완료 후 prefetch — init 먼저 await 해야 Repository cache-first 단계에서
  // isInitialized() 가 true 를 반환한다 (두 effect 를 분리하면 race 발생)
  useEffect(() => {
    if (!account?.uid) return
    let cancelled = false

    ;(async () => {
      // 1. LocalStorage init 먼저
      try {
        await localStorageContainer.init(account.uid)
      } catch (e) {
        if (!cancelled) console.warn('LocalStorageContainer init 실패:', e)
        // init 실패해도 Remote prefetch 는 진행 (degraded — cache-first 만 skip)
      }
      if (cancelled) return

      // 2. Prefetch — Repository 가 이제 isInitialized() 체크 시 true 받음
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
    })()

    return () => {
      cancelled = true
      localStorageContainer.dispose().catch(() => {})
    }
  }, [account?.uid, localStorageContainer, eventRepo, tagRepo, foremostEventRepo])

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
