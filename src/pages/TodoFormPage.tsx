import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { todoApi } from '../api/todoApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useUiStore } from '../stores/uiStore'
import { useToastStore } from '../stores/toastStore'
import { deleteTodoEvent } from '../utils/eventDeleteHelper'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RepeatingScopeDialog, type RepeatScope } from '../components/RepeatingScopeDialog'
import { nextRepeatingTime, getStartTimestamp } from '../utils/repeatingTimeCalculator'
import { EventFormHeader } from '../components/eventForm/EventFormHeader'
import { EventTimeSection } from '../components/eventForm/EventTimeSection'
import { EventDetailsSection } from '../components/eventForm/EventDetailsSection'
import { useEventDefaultsStore } from '../stores/eventDefaultsStore'
import { useEventFormDirty, type EventFormSnapshot } from '../hooks/useEventFormDirty'
import type { Todo, EventTime, Repeating, NotificationOption } from '../models'

export function TodoFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)

  const { addEvent, removeEvent } = useCalendarEventsStore()
  const { addTodo, removeTodo, replaceTodo } = useCurrentTodosStore()
  const { defaultTagId, defaultNotificationSeconds } = useEventDefaultsStore()

  const prefilled = (location.state as { prefilled?: Partial<EventFormSnapshot> } | null)?.prefilled

  const [loading, setLoading] = useState(!!id)
  const [original, setOriginal] = useState<Todo | null>(null)
  const [originalSnapshot, setOriginalSnapshot] = useState<EventFormSnapshot | null>(null)
  const [name, setName] = useState(() => prefilled?.name ?? '')
  const [tagId, setTagId] = useState<string | null>(() => id ? null : (prefilled?.tagId !== undefined ? prefilled.tagId : defaultTagId))
  const [eventTime, setEventTime] = useState<EventTime | null>(() => {
    if (prefilled?.eventTime !== undefined) return prefilled.eventTime as EventTime | null
    return selectedDate ? { time_type: 'at', timestamp: Math.floor(selectedDate.getTime() / 1000) } : null
  })
  const [repeating, setRepeating] = useState<Repeating | null>(() => (prefilled?.repeating as Repeating | null | undefined) ?? null)
  const [notifications, setNotifications] = useState<NotificationOption[]>(() => {
    if (prefilled?.notifications) return prefilled.notifications as NotificationOption[]
    return !id && defaultNotificationSeconds != null ? [{ type: 'time' as const, seconds: defaultNotificationSeconds }] : []
  })
  const [place, setPlace] = useState(() => prefilled?.place ?? '')
  const [url, setUrl] = useState(() => prefilled?.url ?? '')
  const [memo, setMemo] = useState(() => prefilled?.memo ?? '')
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSaveScope, setShowSaveScope] = useState(false)
  const [showDeleteScope, setShowDeleteScope] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
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
    Promise.all([
      todoApi.getTodo(id),
      eventDetailApi.getEventDetail(id).catch(() => null),
    ]).then(([todo, detail]) => {
      const loadedName = todo.name
      const loadedTagId = todo.event_tag_id ?? null
      const loadedEventTime = todo.event_time ?? null
      const loadedRepeating = todo.repeating ?? null
      const loadedNotifications = todo.notification_options ?? []
      const loadedPlace = detail?.place ?? ''
      const loadedUrl = detail?.url ?? ''
      const loadedMemo = detail?.memo ?? ''
      setOriginal(todo)
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
    }).catch((e) => { console.warn('할 일 로드 실패:', e); setLoading(false) })
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

  async function applyUpdate(scope?: RepeatScope) {
    if (!id || !original) return

    if (!original.repeating || scope === 'all') {
      // 비반복 또는 all scope: 반복 규칙을 유지한 채 기본 필드만 전체 업데이트
      const updated = await todoApi.updateTodo(id, {
        name: name.trim(),
        event_tag_id: tagId,
        event_time: eventTime,
        repeating: scope === 'all' ? original.repeating : repeating,
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
      await saveEventDetail(id)
    } else if (scope === 'this') {
      // 이 회차만 분리 → 새 단건 todo에 현재 폼 state로 detail 저장.
      // 원본 반복 todo의 detail은 유지 (다른 회차 조회 시 유효한 정보로 쓰여야 하므로).
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
      await saveEventDetail(result.new_todo.uuid)
    } else {
      // future: 이후 전체를 새 시리즈로 분리 → 새 시리즈에 detail 저장.
      // 원본 시리즈의 detail은 유지 (종료 처리된 과거 회차 조회 시 유효한 정보).
      // eventTime이 없으면 새 시리즈가 생성되지 않으므로 detail 저장도 생략.
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
        await saveEventDetail(newSeries.uuid)
      }
    }
  }

  async function applyDelete(scope: RepeatScope) {
    if (!id || !original) return
    try {
      await deleteTodoEvent(original, scope)
      navigate(-1)
    } catch (e) {
      console.warn('삭제 실패:', e)
      setError(t('todoForm.delete_failed'))
      setShowDeleteScope(false)
      setShowConfirm(false)
    }
  }

  const currentSnapshot: EventFormSnapshot = { name, tagId, eventTime, repeating, notifications, place, url, memo }
  const isDirty = useEventFormDirty(originalSnapshot, currentSnapshot)
  // Todo는 eventTime이 optional이므로 isValidTime 가드 없이 name + isDirty + !saving만으로 canSave 판단
  const canSave = name.trim() !== '' && isDirty && !saving && !showSaveScope && !showDeleteScope && !showConfirm

  function handleClose() {
    if (isDirty) {
      setShowCloseConfirm(true)
    } else {
      navigate(-1)
    }
  }

  function handleCopy() {
    const prefilledData: Partial<EventFormSnapshot> = { name, tagId, eventTime, repeating, notifications, place, url, memo }
    navigate('/todos/new', { state: { prefilled: prefilledData } })
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
        idPrefix="todo"
      />

      {/* 페이지 제목: 기존 getByText 테스트 호환을 위해 sr-only 로 유지 */}
      <h1 className="sr-only">{id ? t('todo.edit') : t('todo.new')}</h1>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <EventTimeSection
          eventTime={eventTime}
          onEventTimeChange={handleEventTimeChange}
          repeating={repeating}
          onRepeatingChange={setRepeating}
          required={false}
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
          isAllDay={eventTime?.time_type === 'allday'}
          fieldPrefix="todo"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        {id && (
          <div className="flex justify-end">
            <button
              className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={() => original?.repeating ? setShowDeleteScope(true) : setShowConfirm(true)}
            >
              {t('common.delete')}
            </button>
          </div>
        )}
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
