import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useEventTagListCache } from '../repositories/caches/eventTagListCache'
import { useCurrentTodosCache } from '../repositories/caches/currentTodosCache'
import { useForemostEventCache } from '../repositories/caches/foremostEventCache'
import { useUncompletedTodosCache } from '../repositories/caches/uncompletedTodosCache'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { account, loading } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (account) {
      Promise.allSettled([
        useEventTagListCache.getState().fetchAll(),
        useCurrentTodosCache.getState().fetch(),
        useForemostEventCache.getState().fetch(),
        useUncompletedTodosCache.getState().fetch(),
      ]).then(results => {
        const failed = results
          .map((r, i) => r.status === 'rejected' ? ['tags', 'todos', 'foremost', 'uncompleted'][i] : null)
          .filter(Boolean)
        if (failed.length > 0) {
          console.warn('Failed to load:', failed.join(', '))
          // Still show the app — partial data is better than blocking
        }
      })
    }
  }, [account])

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
