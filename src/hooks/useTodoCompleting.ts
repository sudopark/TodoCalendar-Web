import { useCallback, useEffect, useRef, useState } from 'react'
import { useRepositories } from '../composition/RepositoriesProvider'
import { useToastStore } from '../stores/toastStore'
import type { Todo } from '../models'

export interface UseTodoCompletingResult {
  isCompleting: (todoId: string) => boolean
  toggle: (todo: Todo) => void
}

function isAbortError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError'
}

export function useTodoCompleting(): UseTodoCompletingResult {
  const { eventRepo } = useRepositories()
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const controllersRef = useRef<Map<string, AbortController>>(new Map())

  useEffect(() => {
    const map = controllersRef.current
    return () => {
      map.forEach(c => c.abort())
      map.clear()
    }
  }, [])

  const removeId = useCallback((id: string) => {
    controllersRef.current.delete(id)
    setCompletingIds(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const isCompleting = useCallback(
    (id: string) => completingIds.has(id),
    [completingIds],
  )

  const toggle = useCallback((todo: Todo) => {
    if (controllersRef.current.has(todo.uuid)) {
      controllersRef.current.get(todo.uuid)!.abort()
      removeId(todo.uuid)
      return
    }

    const controller = new AbortController()
    controllersRef.current.set(todo.uuid, controller)
    setCompletingIds(prev => new Set(prev).add(todo.uuid))

    const scope = (todo.repeating && todo.event_time) ? 'this' : undefined

    eventRepo.completeTodo(todo, scope, { signal: controller.signal })
      .catch((e: unknown) => {
        if (isAbortError(e)) return
        useToastStore.getState().show('todo.complete_failed', 'error')
      })
      .finally(() => {
        removeId(todo.uuid)
      })
  }, [eventRepo, removeId])

  return { isCompleting, toggle }
}
