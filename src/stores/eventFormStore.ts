import { create } from 'zustand'
import type { EventTime, Repeating, NotificationOption } from '../models'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { useUiStore } from './uiStore'
import { useEventDefaultsStore } from './eventDefaultsStore'
import { useCalendarEventsStore } from './calendarEventsStore'
import { useCurrentTodosStore } from './currentTodosStore'
import { useToastStore } from './toastStore'

interface EventFormState {
  // Visibility
  isOpen: boolean
  anchorRect: DOMRect | null

  // Form fields
  eventType: 'todo' | 'schedule'
  name: string
  eventTagId: string | null
  eventTime: EventTime | null
  repeating: Repeating | null
  notifications: NotificationOption[]
  place: string
  url: string
  memo: string

  // UI state
  saving: boolean
  error: string | null

  // Actions
  openForm: (anchorRect: DOMRect | null, eventType?: 'todo' | 'schedule') => void
  closeForm: () => void
  setEventType: (type: 'todo' | 'schedule') => void
  setName: (name: string) => void
  setEventTagId: (id: string | null) => void
  setEventTime: (time: EventTime | null) => void
  setRepeating: (repeating: Repeating | null) => void
  setNotifications: (options: NotificationOption[]) => void
  setPlace: (place: string) => void
  setUrl: (url: string) => void
  setMemo: (memo: string) => void
  save: () => Promise<void>
}

function isAllDay(time: EventTime | null): boolean {
  return time?.time_type === 'allday'
}

export function defaultNotificationsForEventTime(time: EventTime | null): NotificationOption[] {
  const { defaultNotificationSeconds, defaultAllDayNotificationSeconds } = useEventDefaultsStore.getState()
  const seconds = isAllDay(time) ? defaultAllDayNotificationSeconds : defaultNotificationSeconds
  return seconds != null ? [{ type: 'time', seconds }] : []
}

export function canSave(state: EventFormState): boolean {
  if (!state.name.trim()) return false
  if (state.eventType === 'schedule' && !state.eventTime) return false
  return true
}

export function calculateDDay(eventTime: EventTime | null): number | null {
  if (!eventTime) return null
  const startTs = eventTime.time_type === 'at' ? eventTime.timestamp : eventTime.period_start
  const startDate = new Date(startTs * 1000)
  startDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((startDate.getTime() - today.getTime()) / 86400000)
}

export const useEventFormStore = create<EventFormState>((set, get) => ({
  isOpen: false,
  anchorRect: null,
  eventType: 'todo',
  name: '',
  eventTagId: null,
  eventTime: null,
  repeating: null,
  notifications: [],
  place: '',
  url: '',
  memo: '',
  saving: false,
  error: null,

  openForm: (anchorRect, eventType = 'todo') => {
    const selectedDate = useUiStore.getState().selectedDate
    const { defaultTagId } = useEventDefaultsStore.getState()

    const eventTime: EventTime | null = selectedDate
      ? { time_type: 'at', timestamp: Math.floor(selectedDate.getTime() / 1000) }
      : null

    const notifications = defaultNotificationsForEventTime(eventTime)

    set({
      isOpen: true,
      anchorRect,
      eventType,
      name: '',
      eventTagId: defaultTagId,
      eventTime,
      repeating: null,
      notifications,
      place: '',
      url: '',
      memo: '',
      saving: false,
      error: null,
    })
  },

  closeForm: () => {
    set({
      isOpen: false,
      anchorRect: null,
      name: '',
      eventType: 'todo',
      eventTagId: null,
      eventTime: null,
      repeating: null,
      notifications: [],
      place: '',
      url: '',
      memo: '',
      saving: false,
      error: null,
    })
  },

  setEventType: (type) => {
    const { eventTime } = get()
    if (type === 'schedule' && !eventTime) {
      const selectedDate = useUiStore.getState().selectedDate
      const ts = selectedDate
        ? Math.floor(selectedDate.getTime() / 1000)
        : Math.floor(Date.now() / 1000)
      set({ eventType: type, eventTime: { time_type: 'at', timestamp: ts } })
    } else {
      set({ eventType: type })
    }
  },

  setName: (name) => set({ name }),
  setEventTagId: (id) => set({ eventTagId: id }),

  setEventTime: (time) => {
    const prev = get().eventTime
    const alldayChanged = isAllDay(prev) !== isAllDay(time)
    if (alldayChanged) {
      set({ eventTime: time, notifications: defaultNotificationsForEventTime(time) })
    } else {
      set({ eventTime: time })
    }
  },

  setRepeating: (repeating) => set({ repeating }),
  setNotifications: (options) => set({ notifications: options }),
  setPlace: (place) => set({ place }),
  setUrl: (url) => set({ url }),
  setMemo: (memo) => set({ memo }),

  save: async () => {
    const state = get()
    if (!canSave(state) || state.saving) return

    set({ saving: true, error: null })
    try {
      const trimmedName = state.name.trim()
      const body = {
        name: trimmedName,
        event_tag_id: state.eventTagId ?? undefined,
        event_time: state.eventTime ?? undefined,
        repeating: state.repeating ?? undefined,
        notification_options: state.notifications.length > 0 ? state.notifications : undefined,
      }

      let createdUuid: string

      if (state.eventType === 'todo') {
        const created = await todoApi.createTodo(body)
        createdUuid = created.uuid
        if (created.event_time) {
          useCalendarEventsStore.getState().addEvent({ type: 'todo', event: created })
        }
        if (created.is_current) {
          useCurrentTodosStore.getState().addTodo(created)
        }
      } else {
        const created = await scheduleApi.createSchedule({
          ...body,
          event_time: state.eventTime!,
        })
        createdUuid = created.uuid
        useCalendarEventsStore.getState().addEvent({ type: 'schedule', event: created })
      }

      // Save event detail if any content exists
      const hasDetail = state.place || state.url || state.memo
      if (hasDetail) {
        await eventDetailApi.updateEventDetail(createdUuid, {
          place: state.place || null,
          url: state.url || null,
          memo: state.memo || null,
        })
      }

      useToastStore.getState().show(
        state.eventType === 'todo' ? '할일이 생성되었습니다' : '일정이 생성되었습니다',
        'success',
      )
      get().closeForm()
    } catch (e) {
      const message = e instanceof Error ? e.message : '저장에 실패했습니다'
      set({ error: message })
      useToastStore.getState().show(message, 'error')
    } finally {
      set({ saving: false })
    }
  },
}))
