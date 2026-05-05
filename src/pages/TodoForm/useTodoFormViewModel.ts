import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { EventSaveService } from '../../domain/services/EventSaveService'
import { EventDeletionService } from '../../domain/services/EventDeletionService'
import { EventSaveError } from '../../domain/errors/EventSaveError'
import { EventDeletionError } from '../../domain/errors/EventDeletionError'
import { nextRepeatingTime, getStartTimestamp } from '../../domain/functions/repeating'
import { useEventFormDirty, type EventFormSnapshot } from '../../hooks/useEventFormDirty'
import { defaultNotificationsForEventTime } from '../../stores/eventFormStore'
import { useSettingsCache } from '../../repositories/caches/settingsCache'
import type { Todo, EventTime, Repeating, NotificationOption, EventDetail } from '../../models'
import { displayPlace } from '../../models/EventDetail'
import type { RepeatScope } from '../../components/RepeatingScopeDialog'

// MARK: - Interface

export interface TodoFormViewModel {
  // 상태
  name: string
  tagId: string | null
  eventTime: EventTime | null
  repeating: Repeating | null
  notifications: NotificationOption[]
  place: string
  url: string
  memo: string
  loading: boolean
  saving: boolean
  isDirty: boolean
  saveScopeRequired: boolean
  errorKey: string | null
  successKey: string | null
  // 원본 (반복 체크용)
  original: Todo | null

  // 액션
  setName: (v: string) => void
  setTagId: (v: string | null) => void
  setEventTime: (v: EventTime | null) => void
  setRepeating: (v: Repeating | null) => void
  setNotifications: (v: NotificationOption[]) => void
  setPlace: (v: string) => void
  setUrl: (v: string) => void
  setMemo: (v: string) => void
  save: (scope?: RepeatScope) => Promise<void>
  delete: (scope?: RepeatScope) => Promise<void>
  dismissMessage: () => void
}

// MARK: - Hook

export function useTodoFormViewModel(
  id: string | undefined,
  prefilled?: Partial<EventFormSnapshot>,
  selectedDate?: Date | null,
): TodoFormViewModel {
  const { eventRepo, eventDetailRepo } = useRepositories()

  const saveService = useMemo(
    () => new EventSaveService({ eventRepo, detailRepo: eventDetailRepo }),
    [eventRepo, eventDetailRepo],
  )
  const deletionService = useMemo(
    () => new EventDeletionService({ eventRepo }),
    [eventRepo],
  )

  const { defaultTagId } = useSettingsCache(s => s.eventDefaults)

  // ── 초기 상태 ─────────────────────────────────────────────────────

  const initialEventTime: EventTime | null = useMemo(() => {
    if (prefilled?.eventTime !== undefined) return prefilled.eventTime as EventTime | null
    return selectedDate
      ? { time_type: 'at', timestamp: Math.floor(selectedDate.getTime() / 1000) }
      : null
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [loading, setLoading] = useState(!!id)
  const [original, setOriginal] = useState<Todo | null>(null)
  const [originalSnapshot, setOriginalSnapshot] = useState<EventFormSnapshot | null>(null)

  const [name, setName] = useState(() => prefilled?.name ?? '')
  const [tagId, setTagId] = useState<string | null>(() =>
    id ? null : (prefilled?.tagId !== undefined ? prefilled.tagId : defaultTagId),
  )
  const [eventTime, setEventTimeState] = useState<EventTime | null>(initialEventTime)
  const [repeating, setRepeating] = useState<Repeating | null>(
    () => (prefilled?.repeating as Repeating | null | undefined) ?? null,
  )
  const [notifications, setNotifications] = useState<NotificationOption[]>(() => {
    if (prefilled?.notifications) return prefilled.notifications as NotificationOption[]
    if (id) return []
    return defaultNotificationsForEventTime(initialEventTime)
  })
  const [place, setPlace] = useState(() => prefilled?.place ?? '')
  const [url, setUrl] = useState(() => prefilled?.url ?? '')
  const [memo, setMemo] = useState(() => prefilled?.memo ?? '')

  const [saving, setSaving] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [successKey, setSuccessKey] = useState<string | null>(null)

  // ── EventTime 변경 (notifications 자동 조정) ──────────────────────

  const setEventTime = useCallback((newTime: EventTime | null) => {
    setEventTimeState(prev => {
      const prevIsAllDay = prev?.time_type === 'allday'
      const nextIsAllDay = newTime?.time_type === 'allday'
      if (prevIsAllDay !== nextIsAllDay) {
        setNotifications(id ? [] : defaultNotificationsForEventTime(newTime))
      }
      return newTime
    })
  }, [id])

  // ── dirty 감지 ────────────────────────────────────────────────────

  const currentSnapshot: EventFormSnapshot = { name, tagId, eventTime, repeating, notifications, place, url, memo }
  const isDirty = useEventFormDirty(originalSnapshot, currentSnapshot)

  // saveScopeRequired: 기존 반복 todo 수정 시 scope 선택 필요
  const saveScopeRequired = !!id && !!original?.repeating

  // ── 로드 (편집 모드) ──────────────────────────────────────────────

  useEffect(() => {
    if (!id) return
    Promise.all([
      eventRepo.getTodo(id),
      eventDetailRepo.get(id),
    ]).then(([todo, detail]) => {
      const loadedName = todo.name
      const loadedTagId = todo.event_tag_id ?? null
      const loadedEventTime = todo.event_time ?? null
      const loadedRepeating = todo.repeating ?? null
      const loadedNotifications = todo.notification_options ?? []
      const loadedPlace = displayPlace(detail?.place)
      const loadedUrl = detail?.url ?? ''
      const loadedMemo = detail?.memo ?? ''
      setOriginal(todo)
      setName(loadedName)
      setTagId(loadedTagId)
      setEventTimeState(loadedEventTime)
      setRepeating(loadedRepeating)
      setNotifications(loadedNotifications)
      setPlace(loadedPlace)
      setUrl(loadedUrl)
      setMemo(loadedMemo)
      setOriginalSnapshot({
        name: loadedName,
        tagId: loadedTagId,
        eventTime: loadedEventTime,
        repeating: loadedRepeating,
        notifications: loadedNotifications,
        place: loadedPlace,
        url: loadedUrl,
        memo: loadedMemo,
      })
      setLoading(false)
    }).catch(e => {
      console.warn('할 일 로드 실패:', e)
      setLoading(false)
    })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── detail 저장 (best-effort) ────────────────────────────────────
  // 실패 시 successKey를 건드리지 않고 errorKey 에만 세팅 → 페이지에서 toast 표시 후 navigate

  const saveDetail = useCallback(async (targetId: string) => {
    const detail: EventDetail = {
      place: place || null,
      url: url || null,
      memo: memo || null,
    }
    try {
      await eventDetailRepo.save(targetId, detail)
    } catch {
      setErrorKey('eventForm.save_detail_failed')
    }
  }, [place, url, memo, eventDetailRepo])

  // ── 저장 ─────────────────────────────────────────────────────────

  const save = useCallback(async (scope?: RepeatScope) => {
    setSaving(true)
    setErrorKey(null)
    try {
      if (!id || !original) {
        // 신규 생성: 먼저 event 저장, 이후 detail best-effort
        const created = await saveService.createTodo({ name, eventTagId: tagId, eventTime, repeating, notifications })
        await saveDetail(created.uuid)
        setSuccessKey('event.created.todo')
      } else if (!original.repeating || scope === 'all') {
        // 비반복 또는 전체 scope: 일반 업데이트
        const targetId = id
        await saveService.updateTodo(targetId, {
          name,
          eventTagId: tagId,
          eventTime,
          repeating: scope === 'all' ? original.repeating : repeating,
          notifications,
        })
        await saveDetail(targetId)
        setSuccessKey('event.updated.todo')
      } else if (scope === 'this') {
        // 이 회차만 분리
        const next = original.event_time
          ? nextRepeatingTime(
              original.event_time,
              original.repeating_turn ?? 1,
              original.repeating,
              original.exclude_repeatings,
            )
          : null
        const result = await eventRepo.replaceTodoThisScope(id, {
          new: {
            name: name.trim(),
            event_tag_id: tagId,
            event_time: eventTime,
            notification_options: notifications.length > 0 ? notifications : undefined,
          },
          origin_next_event_time: next?.time,
          next_repeating_turn: next?.turn,
        })
        await saveDetail(result.new_todo.uuid)
        setSuccessKey('event.updated.todo')
      } else {
        // future: 이후 전체를 새 시리즈로 분리
        const startTs = original.event_time ? getStartTimestamp(original.event_time) : 0
        const cutoff = startTs - 1
        await eventRepo.updateTodo(id, { repeating: { ...original.repeating, end: cutoff } })
        if (eventTime) {
          const newSeries = await saveService.createTodo({ name, eventTagId: tagId, eventTime, repeating, notifications })
          await saveDetail(newSeries.uuid)
        }
        setSuccessKey('event.updated.todo')
      }
    } catch (e) {
      if (e instanceof EventSaveError) {
        setErrorKey(`error.eventSave.${e.reason.type}`)
      } else {
        setErrorKey('error.eventSave.unknown')
      }
    } finally {
      setSaving(false)
    }
  }, [id, original, name, tagId, eventTime, repeating, notifications, saveService, eventRepo, saveDetail])

  // ── 삭제 ─────────────────────────────────────────────────────────

  const deleteFn = useCallback(async (scope?: RepeatScope) => {
    if (!id || !original) return
    setSaving(true)
    setErrorKey(null)
    try {
      await deletionService.deleteTodo(original, scope)
      setSuccessKey('event.deleted.todo')
    } catch (e) {
      if (e instanceof EventDeletionError) {
        setErrorKey(`error.eventDelete.${e.reason.type}`)
      } else {
        setErrorKey('error.eventDelete.unknown')
      }
    } finally {
      setSaving(false)
    }
  }, [id, original, deletionService])

  const dismissMessage = useCallback(() => {
    setSuccessKey(null)
    setErrorKey(null)
  }, [])

  return {
    name,
    tagId,
    eventTime,
    repeating,
    notifications,
    place,
    url,
    memo,
    loading,
    saving,
    isDirty,
    saveScopeRequired,
    errorKey,
    successKey,
    original,
    setName,
    setTagId,
    setEventTime,
    setRepeating,
    setNotifications,
    setPlace,
    setUrl,
    setMemo,
    save,
    delete: deleteFn,
    dismissMessage,
  }
}
