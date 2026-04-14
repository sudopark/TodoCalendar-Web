import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { todoApi } from '../api/todoApi'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useUiStore } from '../stores/uiStore'
import { EventTimePicker } from '../components/EventTimePicker'
import { RepeatingPicker } from '../components/RepeatingPicker'
import { TagSelector } from '../components/TagSelector'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RepeatingScopeDialog, type RepeatScope } from '../components/RepeatingScopeDialog'
import { nextRepeatingTime, getStartTimestamp } from '../utils/repeatingTimeCalculator'
import { NotificationPicker } from '../components/NotificationPicker'
import { useEventDefaultsStore } from '../stores/eventDefaultsStore'
import type { Todo, EventTime, Repeating, NotificationOption } from '../models'

export function TodoFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)

  const { addEvent, removeEvent } = useCalendarEventsStore()
  const { addTodo, removeTodo, replaceTodo } = useCurrentTodosStore()
  const { defaultTagId, defaultNotificationSeconds } = useEventDefaultsStore()

  const [loading, setLoading] = useState(!!id)
  const [original, setOriginal] = useState<Todo | null>(null)
  const [name, setName] = useState('')
  const [tagId, setTagId] = useState<string | null>(() => id ? null : defaultTagId)
  const [eventTime, setEventTime] = useState<EventTime | null>(() =>
    selectedDate ? { time_type: 'at', timestamp: Math.floor(selectedDate.getTime() / 1000) } : null
  )
  const [repeating, setRepeating] = useState<Repeating | null>(null)
  const [notifications, setNotifications] = useState<NotificationOption[]>(() =>
    !id && defaultNotificationSeconds != null ? [{ type: 'time' as const, seconds: defaultNotificationSeconds }] : []
  )
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSaveScope, setShowSaveScope] = useState(false)
  const [showDeleteScope, setShowDeleteScope] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleEventTimeChange(newTime: EventTime | null) {
    const prevIsAllDay = eventTime?.time_type === 'allday'
    const nextIsAllDay = newTime?.time_type === 'allday'
    if (prevIsAllDay !== nextIsAllDay) setNotifications([])
    setEventTime(newTime)
  }

  useEffect(() => {
    if (!id) return
    todoApi.getTodo(id).then(todo => {
      setOriginal(todo)
      setName(todo.name)
      setTagId(todo.event_tag_id ?? null)
      setEventTime(todo.event_time ?? null)
      setRepeating(todo.repeating ?? null)
      setNotifications(todo.notification_options ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  async function handleSave() {
    if (!name.trim()) return
    if (id && original?.repeating) { setShowSaveScope(true); return }
    setSaving(true)
    try {
      if (id && original) {
        await applyUpdate()
      } else {
        await applyCreate()
      }
      navigate(-1)
    } catch (e) {
      console.warn('저장 실패:', e)
      setError(t('todoForm.save_failed'))
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
      setError(t('todoForm.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  async function applyCreate() {
    const created = await todoApi.createTodo({
      name: name.trim(),
      event_tag_id: tagId ?? undefined,
      event_time: eventTime ?? undefined,
      repeating: repeating ?? undefined,
      notification_options: notifications.length > 0 ? notifications : undefined,
    })
    if (created.event_time) addEvent({ type: 'todo', event: created })
    if (created.is_current) addTodo(created)
  }

  async function applyUpdate(scope?: RepeatScope) {
    if (!id || !original) return

    if (!original.repeating) {
      // 비반복: 기존 로직
      const updated = await todoApi.updateTodo(id, {
        name: name.trim(),
        event_tag_id: tagId,
        event_time: eventTime,
        repeating,
        notification_options: notifications.length > 0 ? notifications : null,
      })
      if (updated.event_time && !original.event_time) {
        addEvent({ type: 'todo', event: updated })
      } else if (!updated.event_time && original.event_time) {
        removeEvent(id)
      } else if (updated.event_time && original.event_time) {
        removeEvent(id)
        addEvent({ type: 'todo', event: updated })
      }
      if (updated.is_current && original.is_current) {
        replaceTodo(updated)
      } else if (updated.is_current && !original.is_current) {
        addTodo(updated)
      } else if (!updated.is_current && original.is_current) {
        removeTodo(id)
      }
    } else if (scope === 'this') {
      // 이번만: 원본을 다음 턴으로 진행 + 수정된 내용으로 새 비반복 Todo 생성
      const next = original.event_time
        ? nextRepeatingTime(original.event_time, original.repeating_turn ?? 1, original.repeating, original.exclude_repeatings)
        : null
      const result = await todoApi.replaceTodo(id, {
        new: { name: name.trim(), event_tag_id: tagId, event_time: eventTime, notification_options: notifications.length > 0 ? notifications : undefined },
        origin_next_event_time: next?.time,
        next_repeating_turn: next?.turn,
      })
      removeEvent(id)
      if (result.new_todo.event_time) addEvent({ type: 'todo', event: result.new_todo })
      if (result.next_repeating?.event_time) addEvent({ type: 'todo', event: result.next_repeating })
    } else {
      // future: 원본 시리즈 종료 + 새 시리즈 생성
      const startTs = original.event_time ? getStartTimestamp(original.event_time) : 0
      const cutoff = startTs - 1
      const ended = await todoApi.patchTodo(id, { repeating: { ...original.repeating, end: cutoff } })
      removeEvent(id)
      if (ended.event_time) addEvent({ type: 'todo', event: ended })
      if (eventTime) {
        const newSeries = await todoApi.createTodo({
          name: name.trim(),
          event_tag_id: tagId ?? undefined,
          event_time: eventTime,
          repeating: repeating ?? undefined,
          notification_options: notifications.length > 0 ? notifications : undefined,
        })
        if (newSeries.event_time) addEvent({ type: 'todo', event: newSeries })
      }
    }
  }

  async function applyDelete(scope: RepeatScope) {
    if (!id || !original) return
    try {
      if (!original.repeating) {
        await todoApi.deleteTodo(id)
        removeEvent(id)
        removeTodo(id)
      } else if (scope === 'this') {
        // 이번만 삭제: 원본을 다음 턴으로 진행
        const next = original.event_time
          ? nextRepeatingTime(original.event_time, original.repeating_turn ?? 1, original.repeating, original.exclude_repeatings)
          : null
        if (next) {
          const updated = await todoApi.patchTodo(id, { event_time: next.time, repeating_turn: next.turn })
          removeEvent(id)
          if (updated.event_time) addEvent({ type: 'todo', event: updated })
        } else {
          await todoApi.deleteTodo(id)
          removeEvent(id)
        }
        removeTodo(id)
      } else {
        // future: 시리즈 종료
        const startTs = original.event_time ? getStartTimestamp(original.event_time) : 0
        const cutoff = startTs - 1
        const ended = await todoApi.patchTodo(id, { repeating: { ...original.repeating, end: cutoff } })
        removeEvent(id)
        if (ended.event_time) addEvent({ type: 'todo', event: ended })
      }
      navigate(-1)
    } catch (e) {
      console.warn('삭제 실패:', e)
      setError(t('todoForm.delete_failed'))
      setShowDeleteScope(false)
      setShowConfirm(false)
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
        <h1 className="text-lg font-bold">{id ? t('todo.edit') : t('todo.new')}</h1>
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
          <div className="mt-1"><EventTimePicker value={eventTime} onChange={handleEventTimeChange} required={false} /></div>
        </div>

        {eventTime && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('event.repeat')}</label>
            <div className="mt-1">
              <RepeatingPicker
                value={repeating}
                onChange={setRepeating}
                startTimestamp={
                  eventTime.time_type === 'at'
                    ? eventTime.timestamp
                    : eventTime.period_start
                }
              />
            </div>
          </div>
        )}

        {eventTime && (
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
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || showSaveScope || showDeleteScope}
          >
            {t('common.save')}
          </button>
          {id && (
            <button
              className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={() => original?.repeating ? setShowDeleteScope(true) : setShowConfirm(true)}
            >
              {t('common.delete')}
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          title={t('todoForm.delete_confirm_title')}
          message={t('todoForm.delete_confirm_message', { name })}
          confirmLabel={t('common.delete')}
          onConfirm={async () => { setShowConfirm(false); await applyDelete('this') }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {showSaveScope && (
        <RepeatingScopeDialog
          mode="edit"
          eventType="todo"
          onSelect={handleSaveWithScope}
          onCancel={() => setShowSaveScope(false)}
        />
      )}
      {showDeleteScope && (
        <RepeatingScopeDialog
          mode="delete"
          eventType="todo"
          onSelect={async scope => { setShowDeleteScope(false); await applyDelete(scope) }}
          onCancel={() => setShowDeleteScope(false)}
        />
      )}
    </div>
  )
}
