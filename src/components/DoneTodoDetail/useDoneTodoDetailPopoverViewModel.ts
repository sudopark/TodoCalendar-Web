import { useEffect, useState, useCallback, useRef } from 'react'
import { doneTodoApi } from '../../api/doneTodoApi'
import { useDoneTodosCache } from '../../repositories/caches/doneTodosCache'
import { useToastStore } from '../../stores/toastStore'
import type { DoneTodo, EventDetail } from '../../models'

export interface DoneTodoDetailPopoverViewModel {
  detail: EventDetail | null
  /** 성공 시 true, 실패(또는 중복 호출 차단) 시 false 를 반환 — 호출자가 popover close 등 후속 동선을 분기. */
  revert: () => Promise<boolean>
  remove: () => Promise<boolean>
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

  const revert = useCallback(async (): Promise<boolean> => {
    if (revertingRef.current) return false
    revertingRef.current = true
    setIsReverting(true)
    try {
      // cache.revert 가 응답 todo 를 currentTodosCache 에 직접 addTodo 한다 — 빈 todo 회귀 차단.
      await cacheRevert(doneTodo.uuid)
      return true
    } catch (e) {
      console.warn('Done todo 되돌리기 실패:', e)
      useToastStore.getState().show('todo.revert_failed', 'error')
      return false
    } finally {
      revertingRef.current = false
      setIsReverting(false)
    }
  }, [cacheRevert, doneTodo.uuid])

  const remove = useCallback(async (): Promise<boolean> => {
    if (deletingRef.current) return false
    deletingRef.current = true
    setIsDeleting(true)
    try {
      await cacheRemove(doneTodo.uuid)
      return true
    } catch (e) {
      console.warn('Done todo 삭제 실패:', e)
      useToastStore.getState().show('todo.delete_failed', 'error')
      return false
    } finally {
      deletingRef.current = false
      setIsDeleting(false)
    }
  }, [cacheRemove, doneTodo.uuid])

  return { detail, revert, remove, isReverting, isDeleting }
}
