import { useEffect, useState, useCallback } from 'react'
import { doneTodoApi } from '../../api/doneTodoApi'
import { useDoneTodosCache } from '../../repositories/caches/doneTodosCache'
import type { DoneTodo, EventDetail } from '../../models'

export interface DoneTodoDetailPopoverViewModel {
  detail: EventDetail | null
  detailLoaded: boolean
  revert: () => Promise<void>
  remove: () => Promise<void>
  isReverting: boolean
  isDeleting: boolean
}

export function useDoneTodoDetailPopoverViewModel(
  doneTodo: DoneTodo,
): DoneTodoDetailPopoverViewModel {
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [detailLoaded, setDetailLoaded] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const cacheRevert = useDoneTodosCache(s => s.revert)
  const cacheRemove = useDoneTodosCache(s => s.remove)

  useEffect(() => {
    let cancelled = false
    setDetailLoaded(false)
    setDetail(null)
    doneTodoApi.getDoneTodoDetail(doneTodo.uuid)
      .then(d => {
        if (cancelled) return
        setDetail(d ?? null)
        setDetailLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setDetail(null)
        setDetailLoaded(true)
      })
    return () => { cancelled = true }
  }, [doneTodo.uuid])

  const revert = useCallback(async () => {
    if (isReverting) return
    setIsReverting(true)
    try {
      await cacheRevert(doneTodo.uuid)
    } finally {
      setIsReverting(false)
    }
  }, [cacheRevert, doneTodo.uuid, isReverting])

  const remove = useCallback(async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await cacheRemove(doneTodo.uuid)
    } finally {
      setIsDeleting(false)
    }
  }, [cacheRemove, doneTodo.uuid, isDeleting])

  return { detail, detailLoaded, revert, remove, isReverting, isDeleting }
}
