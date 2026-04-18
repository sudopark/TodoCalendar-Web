import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useUiStore } from '../stores/uiStore'
import { useToastStore } from '../stores/toastStore'
import { deleteScheduleEvent } from '../utils/eventDeleteHelper'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RepeatingScopeDialog, type RepeatScope } from '../components/RepeatingScopeDialog'
import { EventFormHeader } from '../components/eventForm/EventFormHeader'
import { EventTimeSection } from '../components/eventForm/EventTimeSection'
import { EventDetailsSection } from '../components/eventForm/EventDetailsSection'
import { useEventDefaultsStore } from '../stores/eventDefaultsStore'
import { useEventFormDirty, type EventFormSnapshot } from '../hooks/useEventFormDirty'
import type { Schedule, EventTime, Repeating, NotificationOption } from '../models'

export function ScheduleFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)

  const { addEvent, removeEvent } = useCalendarEventsStore()
  const { defaultTagId, defaultNotificationSeconds } = useEventDefaultsStore()

  const prefilled = (location.state as { prefilled?: Partial<EventFormSnapshot> } | null)?.prefilled

  const defaultEventTime = (): EventTime => {
    const base = selectedDate ?? new Date()
    return { time_type: 'at', timestamp: Math.floor(base.getTime() / 1000) }
  }

  const [loading, setLoading] = useState(!!id)
  const [original, setOriginal] = useState<Schedule | null>(null)
  const [originalSnapshot, setOriginalSnapshot] = useState<EventFormSnapshot | null>(null)
  const [name, setName] = useState(() => prefilled?.name ?? '')
  const [tagId, setTagId] = useState<string | null>(() => id ? null : (prefilled?.tagId !== undefined ? prefilled.tagId : defaultTagId))
  const [eventTime, setEventTime] = useState<EventTime>(() => (prefilled?.eventTime as EventTime | undefined) ?? defaultEventTime())
  const [repeating, setRepeating] = useState<Repeating | null>(() => (prefilled?.repeating as Repeating | null | undefined) ?? null)
  const [notifications, setNotifications] = useState<NotificationOption[]>(() => {
    if (prefilled?.notifications) return prefilled.notifications as NotificationOption[]
    return !id && defaultNotificationSeconds != null ? [{ type: 'time' as const, seconds: defaultNotificationSeconds }] : []
  })
  const [place, setPlace] = useState(() => prefilled?.place ?? '')
  const [url, setUrl] = useState(() => prefilled?.url ?? '')
  const [memo, setMemo] = useState(() => prefilled?.memo ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSaveScope, setShowSaveScope] = useState(false)
  const [showDeleteScope, setShowDeleteScope] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      scheduleApi.getSchedule(id),
      eventDetailApi.getEventDetail(id).catch(() => null),
    ]).then(([sch, detail]) => {
      const loadedName = sch.name
      const loadedTagId = sch.event_tag_id ?? null
      const loadedEventTime = sch.event_time
      const loadedRepeating = sch.repeating ?? null
      const loadedNotifications = sch.notification_options ?? []
      const loadedPlace = detail?.place ?? ''
      const loadedUrl = detail?.url ?? ''
      const loadedMemo = detail?.memo ?? ''
      setOriginal(sch)
      setName(loadedName)
      setTagId(loadedTagId)
      setEventTime(loadedEventTime)
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
    }).catch((e) => { console.warn('일정 로드 실패:', e); setLoading(false) })
  }, [id])

  function handleEventTimeChange(newTime: EventTime | null) {
    if (!newTime) return
    const prevIsAllDay = eventTime.time_type === 'allday'
    const nextIsAllDay = newTime.time_type === 'allday'
    if (prevIsAllDay !== nextIsAllDay) setNotifications([])
    setEventTime(newTime)
  }

  function occurrenceStart(sch: Schedule): number {
    const et = sch.event_time
    return et.time_type === 'at' ? et.timestamp : et.period_start
  }

  async function applyCreate() {
    const created = await scheduleApi.createSchedule({
      name: name.trim(),
      event_tag_id: tagId ?? undefined,
      event_time: eventTime,
      repeating: repeating ?? undefined,
      notification_options: notifications.length > 0 ? notifications : undefined,
    })
    addEvent({ type: 'schedule', event: created })
    await saveEventDetail(created.uuid)
  }

  // detail 저장은 best-effort: 실패해도 basic 저장 결과를 유지하기 위해 예외를 흡수한다
  async function saveEventDetail(targetId: string) {
    try {
      await eventDetailApi.updateEventDetail(targetId, { place: place || null, url: url || null, memo: memo || null })
    } catch {
      useToastStore.getState().show(t('eventForm.save_detail_failed'), 'error')
    }
  }

  async function applyUpdate(scope: RepeatScope) {
    if (!id || !original) return
    if (!original.repeating || scope === 'all') {
      // Non-repeating or all scope: event_time이 바뀌면 날짜 키가 달라질 수 있으므로 remove → add로 갱신
      const updated = await scheduleApi.updateSchedule(id, {
        name: name.trim(),
        event_tag_id: tagId,
        event_time: eventTime,
        repeating: repeating ?? undefined,
        notification_options: notifications.length > 0 ? notifications : null,
      })
      removeEvent(id)
      addEvent({ type: 'schedule', event: updated })
      await saveEventDetail(id)
      return
    }
    if (scope === 'this') {
      // 이 회차만 분리 → 새 단건 이벤트에 현재 폼 state로 detail 저장.
      // 원본 반복 이벤트의 detail은 유지 (종료되지 않은 다른 회차들을 위해).
      const turn = original.show_turns?.[0] ?? 0
      const excluded = await scheduleApi.excludeRepeating(id, { exclude_repeatings: [...(original.exclude_repeatings ?? []), turn] })
      const newSingle = await scheduleApi.createSchedule({
        name: name.trim(),
        event_tag_id: tagId ?? undefined,
        event_time: eventTime,
        repeating: undefined,
        notification_options: notifications.length > 0 ? notifications : undefined,
      })
      removeEvent(id)
      addEvent({ type: 'schedule', event: excluded })
      addEvent({ type: 'schedule', event: newSingle })
      await saveEventDetail(newSingle.uuid)
    } else {
      // scope === 'future': 이후 회차 전체를 새 시리즈로 분리 → 새 시리즈에 현재 폼 state로 detail 저장.
      // 원본 시리즈의 detail은 유지 (종료 처리된 과거 회차 조회 시 유효한 정보로 쓰여야 하므로).
      const cutoff = occurrenceStart(original) - 1
      const ended = await scheduleApi.updateSchedule(id, { repeating: { ...original.repeating, end: cutoff } })
      const newSeries = await scheduleApi.createSchedule({
        name: name.trim(),
        event_tag_id: tagId ?? undefined,
        event_time: eventTime,
        repeating: repeating ?? undefined,
        notification_options: notifications.length > 0 ? notifications : undefined,
      })
      removeEvent(id)
      addEvent({ type: 'schedule', event: ended })
      addEvent({ type: 'schedule', event: newSeries })
      await saveEventDetail(newSeries.uuid)
    }
  }

  async function applyDelete(scope: RepeatScope) {
    if (!id || !original) return
    try {
      await deleteScheduleEvent(original, scope)
      navigate(-1)
    } catch (e) {
      console.warn('삭제 실패:', e)
      setError(t('scheduleForm.delete_failed'))
      setShowDeleteScope(false)
      setShowDeleteConfirm(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    if (id && original?.repeating) { setShowSaveScope(true); return }
    setSaving(true)
    try {
      if (id) await applyUpdate('all')
      else await applyCreate()
      navigate(-1)
    } catch (e) {
      console.warn('저장 실패:', e)
      setError(t('scheduleForm.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveWithScope(scope: RepeatScope) {
    setShowSaveScope(false)
    setSaving(true)
    try {
      await applyUpdate(scope)
      navigate(-1)
    } catch (e) {
      console.warn('저장 실패:', e)
      setError(t('scheduleForm.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  const currentSnapshot: EventFormSnapshot = { name, tagId, eventTime, repeating, notifications, place, url, memo }
  const isDirty = useEventFormDirty(originalSnapshot, currentSnapshot)
  const canSave = name.trim() !== '' && isDirty && !saving && !showSaveScope && !showDeleteScope && !showDeleteConfirm

  function handleClose() {
    if (isDirty) {
      setShowCloseConfirm(true)
    } else {
      navigate(-1)
    }
  }

  function handleCopy() {
    const prefilledData: Partial<EventFormSnapshot> = { name, tagId, eventTime, repeating, notifications, place, url, memo }
    navigate('/schedules/new', { state: { prefilled: prefilledData } })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <EventFormHeader
        name={name}
        onNameChange={setName}
        onClose={handleClose}
        onSave={handleSave}
        onCopy={handleCopy}
        saveDisabled={!canSave}
        idPrefix="schedule"
      />

      {/* 페이지 제목: 기존 getByText 테스트 호환을 위해 sr-only 로 유지 */}
      <h1 className="sr-only">{id ? t('schedule.edit') : t('schedule.new')}</h1>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <EventTimeSection
          eventTime={eventTime}
          onEventTimeChange={handleEventTimeChange}
          repeating={repeating}
          onRepeatingChange={setRepeating}
          required={true}
        />

        <EventDetailsSection
          place={place}
          onPlaceChange={setPlace}
          url={url}
          onUrlChange={setUrl}
          memo={memo}
          onMemoChange={setMemo}
          tagId={tagId}
          onTagChange={setTagId}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          isAllDay={eventTime.time_type === 'allday'}
          fieldPrefix="schedule"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        {id && (
          <div className="flex justify-end">
            <button
              className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={() => original?.repeating ? setShowDeleteScope(true) : setShowDeleteConfirm(true)}
            >
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title={t('scheduleForm.delete_confirm_title')}
          message={t('scheduleForm.delete_confirm_message', { name })}
          confirmLabel={t('common.delete')}
          onConfirm={async () => { setShowDeleteConfirm(false); await applyDelete('all') }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {showSaveScope && (
        <RepeatingScopeDialog
          mode="edit"
          onSelect={handleSaveWithScope}
          onCancel={() => setShowSaveScope(false)}
        />
      )}
      {showDeleteScope && (
        <RepeatingScopeDialog
          mode="delete"
          onSelect={async scope => { setShowDeleteScope(false); await applyDelete(scope) }}
          onCancel={() => setShowDeleteScope(false)}
        />
      )}
      {showCloseConfirm && (
        <ConfirmDialog
          title={t('eventForm.close_confirm_title')}
          message={t('eventForm.close_confirm_message')}
          confirmLabel={t('common.leave')}
          onConfirm={() => { setShowCloseConfirm(false); navigate(-1) }}
          onCancel={() => setShowCloseConfirm(false)}
          danger={false}
        />
      )}
    </div>
  )
}
