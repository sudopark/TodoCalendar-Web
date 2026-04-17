import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useUiStore } from '../stores/uiStore'
import { useToastStore } from '../stores/toastStore'
import { deleteScheduleEvent } from '../utils/eventDeleteHelper'
import { EventTimePicker } from '../components/EventTimePicker'
import { RepeatingPicker } from '../components/RepeatingPicker'
import { TagSelector } from '../components/TagSelector'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RepeatingScopeDialog, type RepeatScope } from '../components/RepeatingScopeDialog'
import { NotificationPicker } from '../components/NotificationPicker'
import { useEventDefaultsStore } from '../stores/eventDefaultsStore'
import { useEventFormDirty, type EventFormSnapshot } from '../hooks/useEventFormDirty'
import type { Schedule, EventTime, Repeating, NotificationOption } from '../models'

export function ScheduleFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)

  const { addEvent, removeEvent } = useCalendarEventsStore()
  const { defaultTagId, defaultNotificationSeconds } = useEventDefaultsStore()

  const defaultEventTime = (): EventTime => {
    const base = selectedDate ?? new Date()
    return { time_type: 'at', timestamp: Math.floor(base.getTime() / 1000) }
  }

  const [loading, setLoading] = useState(!!id)
  const [original, setOriginal] = useState<Schedule | null>(null)
  const [originalSnapshot, setOriginalSnapshot] = useState<EventFormSnapshot | null>(null)
  const [name, setName] = useState('')
  const [tagId, setTagId] = useState<string | null>(() => id ? null : defaultTagId)
  const [eventTime, setEventTime] = useState<EventTime>(defaultEventTime)
  const [repeating, setRepeating] = useState<Repeating | null>(null)
  const [notifications, setNotifications] = useState<NotificationOption[]>(() =>
    !id && defaultNotificationSeconds != null ? [{ type: 'time' as const, seconds: defaultNotificationSeconds }] : []
  )
  const [place, setPlace] = useState('')
  const [url, setUrl] = useState('')
  const [memo, setMemo] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSaveScope, setShowSaveScope] = useState(false)
  const [showDeleteScope, setShowDeleteScope] = useState(false)
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

  function handleEventTimeChange(newTime: EventTime) {
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
      useToastStore.getState().show('추가 정보 저장 실패', 'error')
    }
  }

  async function applyUpdate(scope: RepeatScope) {
    if (!id || !original) return
    if (!original.repeating) {
      // Non-repeating: event_time이 바뀌면 날짜 키가 달라질 수 있으므로 remove → add로 갱신
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
    } else if (scope === 'all') {
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
    } else if (scope === 'this') {
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
  const canSave = name.trim() !== '' && !!eventTime && isDirty && !saving && !showSaveScope && !showDeleteScope && !showDeleteConfirm

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">{id ? t('schedule.edit') : t('schedule.new')}</h1>
        <button className="text-sm text-gray-500" onClick={() => navigate(-1)}>{t('common.cancel')}</button>
      </div>

      <div className="space-y-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.name')}</label>
          <input
            aria-label={t('event.name')}
            className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.tag')}</label>
          <div className="mt-1"><TagSelector value={tagId} onChange={setTagId} /></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.time')}</label>
          <div className="mt-1">
            <EventTimePicker value={eventTime} onChange={v => v && handleEventTimeChange(v)} required={true} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.repeat')}</label>
          <div className="mt-1">
            <RepeatingPicker
              value={repeating}
              onChange={setRepeating}
              startTimestamp={eventTime.time_type === 'at' ? eventTime.timestamp : eventTime.period_start}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.notification')}</label>
          <div className="mt-1">
            <NotificationPicker
              value={notifications}
              onChange={setNotifications}
              isAllDay={eventTime.time_type === 'allday'}
            />
          </div>
        </div>

        <div>
          <label htmlFor="schedule-place" className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.place')}</label>
          <input
            id="schedule-place"
            className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            value={place}
            onChange={e => setPlace(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="schedule-url" className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.url')}</label>
          <input
            id="schedule-url"
            className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="schedule-memo" className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.memo')}</label>
          <textarea
            id="schedule-memo"
            className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            rows={3}
            value={memo}
            onChange={e => setMemo(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={!canSave}
          >
            {t('common.save')}
          </button>
          {id && (
            <button
              className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={() => original?.repeating ? setShowDeleteScope(true) : setShowDeleteConfirm(true)}
            >
              {t('common.delete')}
            </button>
          )}
        </div>
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
    </div>
  )
}
