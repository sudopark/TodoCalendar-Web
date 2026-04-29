import { useEffect, useState, useCallback, useRef } from 'react'
import { doneTodoApi } from '../../api/doneTodoApi'
import { useDoneTodosCache } from '../../repositories/caches/doneTodosCache'
import { useCurrentTodosCache } from '../../repositories/caches/currentTodosCache'
import { useToastStore } from '../../stores/toastStore'
import type { DoneTodo, EventDetail } from '../../models'

export interface DoneTodoDetailPopoverViewModel {
  detail: EventDetail | null
  revert: () => Promise<void>
  remove: () => Promise<void>
  isReverting: boolean
  isDeleting: boolean
}

export function useDoneTodoDetailPopoverViewModel(
  doneTodo: DoneTodo,
): DoneTodoDetailPopoverViewModel {
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [isReverting, setIsReverting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const cacheRevert = useDoneTodosCache(s => s.revert)
  const cacheRemove = useDoneTodosCache(s => s.remove)
  const fetchCurrentTodos = useCurrentTodosCache(s => s.fetch)

  // useCallback deps 의 isReverting/isDeleting 으로 매 렌더마다 reference 가 깨지지 않도록
  // useRef 로 in-flight 플래그를 관리한다.
  const revertingRef = useRef(false)
  const deletingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    doneTodoApi.getDoneTodoDetail(doneTodo.uuid)
      .then(d => {
        if (cancelled) return
        setDetail(d ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setDetail(null)
      })
    return () => { cancelled = true }
  }, [doneTodo.uuid])

  const revert = useCallback(async () => {
    if (revertingRef.current) return
    revertingRef.current = true
    setIsReverting(true)
    try {
      // ArchivePanel.handleRevert 와 동일한 후처리 — 되돌린 todo 가 즉시 Current Todo 목록에 반영되도록.
      await cacheRevert(doneTodo.uuid)
      await fetchCurrentTodos()
    } catch (e) {
      console.warn('Done todo 되돌리기 실패:', e)
      useToastStore.getState().show('todo.revert_failed', 'error')
    } finally {
      revertingRef.current = false
      setIsReverting(false)
    }
  }, [cacheRevert, doneTodo.uuid, fetchCurrentTodos])

  const remove = useCallback(async () => {
    if (deletingRef.current) return
    deletingRef.current = true
    setIsDeleting(true)
    try {
      await cacheRemove(doneTodo.uuid)
    } catch (e) {
      console.warn('Done todo 삭제 실패:', e)
      useToastStore.getState().show('todo.delete_failed', 'error')
    } finally {
      deletingRef.current = false
      setIsDeleting(false)
    }
  }, [cacheRemove, doneTodo.uuid])

  return { detail, revert, remove, isReverting, isDeleting }
}
