import type { EventTime } from '../../models/EventTime'
import type { Repeating } from '../../models/Repeating'
import type { NotificationOption } from '../../models/NotificationOption'

export interface TodoFormDraft {
  name: string
  eventTagId?: string | null
  eventTime?: EventTime | null
  repeating?: Repeating | null
  notifications?: NotificationOption[]
}

export interface TodoFormInput {
  name: string
  event_tag_id?: string
  event_time?: EventTime
  repeating?: Repeating
  notification_options?: NotificationOption[]
}

export type TodoFormValidation =
  | { ok: true; input: TodoFormInput }
  | { ok: false; reason: 'empty_name' | 'invalid_time' }

export function validateTodoForm(draft: TodoFormDraft): TodoFormValidation {
  const trimmed = draft.name.trim()
  if (!trimmed) return { ok: false, reason: 'empty_name' }
  if (draft.eventTime != null && !isValidEventTime(draft.eventTime)) {
    return { ok: false, reason: 'invalid_time' }
  }
  return {
    ok: true,
    input: {
      name: trimmed,
      ...(draft.eventTagId != null ? { event_tag_id: draft.eventTagId } : {}),
      ...(draft.eventTime != null ? { event_time: draft.eventTime } : {}),
      ...(draft.repeating != null ? { repeating: draft.repeating } : {}),
      ...(draft.notifications && draft.notifications.length > 0
        ? { notification_options: draft.notifications }
        : {}),
    },
  }
}

function isValidEventTime(t: EventTime): boolean {
  switch (t.time_type) {
    case 'at':
      return Number.isFinite(t.timestamp) && t.timestamp > 0
    case 'period':
      return (
        Number.isFinite(t.period_start) &&
        Number.isFinite(t.period_end) &&
        t.period_start > 0 &&
        t.period_end >= t.period_start
      )
    case 'allday':
      return (
        Number.isFinite(t.period_start) &&
        Number.isFinite(t.period_end) &&
        t.period_start > 0 &&
        t.period_end >= t.period_start
      )
  }
}
