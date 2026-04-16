import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { scheduleApi } from '../api/scheduleApi'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useUiStore } from '../stores/uiStore'
import { deleteScheduleEvent } from '../utils/eventDeleteHelper'
import { EventTimePicker } from '../components/EventTimePicker'
import { RepeatingPicker } from '../components/RepeatingPicker'
import { TagSelector } from '../components/TagSelector'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RepeatingScopeDialog, type RepeatScope } from '../components/RepeatingScopeDialog'
import { NotificationPicker } from '../components/NotificationPicker'
import { useEventDefaultsStore } from '../stores/eventDefaultsStore'
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
  const [name, setName] = useState('')
  const [tagId, setTagId] = useState<string | null>(() => id ? null : defaultTagId)
  const [eventTime, setEventTime] = useState<EventTime>(defaultEventTime)
  const [repeating, setRepeating] = useState<Repeating | null>(null)
  const [notifications, setNotifications] = useState<NotificationOption[]>(() =>
    !id && defaultNotificationSeconds != null ? [{ type: 'time' as const, seconds: defaultNotificationSeconds }] : []
  )
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSaveScope, setShowSaveScope] = useState(false)
  const [showDeleteScope, setShowDeleteScope] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    scheduleApi.getSchedule(id).then(sch => {
      setOriginal(sch)
      setName(sch.name)
      setTagId(sch.event_tag_id ?? null)
      setEventTime(sch.event_time)
      setRepeating(sch.repeating ?? null)
      setNotifications(sch.notification_options ?? [])
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
    } else if (scope === 'this') {
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
    } else {
      // scope === 'future'
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

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
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
