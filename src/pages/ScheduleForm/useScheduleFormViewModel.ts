import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { EventSaveService } from '../../domain/services/EventSaveService'
import { EventDeletionService } from '../../domain/services/EventDeletionService'
import { EventSaveError } from '../../domain/errors/EventSaveError'
import { EventDeletionError } from '../../domain/errors/EventDeletionError'
import { getStartTimestamp } from '../../domain/functions/repeating'
import { useEventFormDirty, type EventFormSnapshot } from '../../hooks/useEventFormDirty'
import { defaultNotificationsForEventTime } from '../../stores/eventFormStore'
import { useSettingsCache } from '../../repositories/caches/settingsCache'
import type { Schedule, EventTime, Repeating, NotificationOption, EventDetail } from '../../models'
import type { RepeatScope } from '../../components/RepeatingScopeDialog'

// MARK: - Interface

export interface ScheduleFormViewModel {
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
  original: Schedule | null

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

export function useScheduleFormViewModel(
  id: string | undefined,
  prefilled?: Partial<EventFormSnapshot>,
  selectedDate?: Date | null,
): ScheduleFormViewModel {
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
    const base = selectedDate ?? new Date()
    return { time_type: 'at', timestamp: Math.floor(base.getTime() / 1000) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [loading, setLoading] = useState(!!id)
  const [original, setOriginal] = useState<Schedule | null>(null)
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

  // saveScopeRequired: 기존 반복 schedule 수정 시 scope 선택 필요
  const saveScopeRequired = !!id && !!original?.repeating

  // ── 로드 (편집 모드) ──────────────────────────────────────────────

  useEffect(() => {
    if (!id) return
    Promise.all([
      eventRepo.getSchedule(id),
      eventDetailRepo.get(id),
    ]).then(([schedule, detail]) => {
      const loadedName = schedule.name
      const loadedTagId = schedule.event_tag_id ?? null
      const loadedEventTime = schedule.event_time
      const loadedRepeating = schedule.repeating ?? null
      const loadedNotifications = schedule.notification_options ?? []
      const loadedPlace = detail?.place ?? ''
      const loadedUrl = detail?.url ?? ''
      const loadedMemo = detail?.memo ?? ''
      setOriginal(schedule)
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
      console.warn('일정 로드 실패:', e)
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
        // 신규 생성
        const created = await saveService.createSchedule({ name, eventTagId: tagId, eventTime, repeating, notifications })
        await saveDetail(created.uuid)
        setSuccessKey('event.created.schedule')
      } else if (!original.repeating || scope === 'all') {
        // 비반복 또는 전체 scope: 일반 업데이트
        const targetId = id
        await saveService.updateSchedule(targetId, {
          name,
          eventTagId: tagId,
          eventTime,
          repeating: scope === 'all' ? original.repeating : repeating,
          notifications,
        })
        await saveDetail(targetId)
        setSuccessKey('event.updated.schedule')
      } else if (scope === 'this') {
        // 이 회차만 분리: 원본에서 해당 turn 제외 + 새 단건 schedule 생성
        const turn = original.show_turns?.[0] ?? 0
        const excluded = [...(original.exclude_repeatings ?? []), turn]
        await eventRepo.excludeScheduleRepeating(id, excluded)
        const newSingle = await saveService.createSchedule({
          name,
          eventTagId: tagId,
          eventTime,
          notifications,
        })
        await saveDetail(newSingle.uuid)
        setSuccessKey('event.updated.schedule')
      } else {
        // future: 이후 전체를 새 시리즈로 분리
        const startTs = eventTime ? getStartTimestamp(eventTime) : 0
        const cutoff = startTs - 1
        await eventRepo.updateSchedule(id, { repeating: { ...original.repeating, end: cutoff } })
        const newSeries = await saveService.createSchedule({ name, eventTagId: tagId, eventTime, repeating, notifications })
        await saveDetail(newSeries.uuid)
        setSuccessKey('event.updated.schedule')
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
      await deletionService.deleteSchedule(original, scope)
      setSuccessKey('event.deleted.schedule')
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
