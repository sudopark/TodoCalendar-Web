import type { EventTime } from '../../models/EventTime'
import type { Repeating } from '../../models/Repeating'
import type { NotificationOption } from '../../models/NotificationOption'

export interface ScheduleFormDraft {
  name: string
  eventTagId?: string | null
  eventTime?: EventTime | null
  repeating?: Repeating | null
  notifications?: NotificationOption[]
}

export interface ScheduleFormInput {
  name: string
  event_tag_id?: string
  event_time: EventTime
  repeating?: Repeating
  notification_options?: NotificationOption[]
}

export type ScheduleFormValidation =
  | { ok: true; input: ScheduleFormInput }
  | { ok: false; reason: 'empty_name' | 'missing_time' | 'invalid_time' }

export function validateScheduleForm(draft: ScheduleFormDraft): ScheduleFormValidation {
  const trimmed = draft.name.trim()
  if (!trimmed) return { ok: false, reason: 'empty_name' }
  if (draft.eventTime == null) return { ok: false, reason: 'missing_time' }
  if (!isValidEventTime(draft.eventTime)) {
    return { ok: false, reason: 'invalid_time' }
  }
  return {
    ok: true,
    input: {
      name: trimmed,
      event_time: draft.eventTime,
      ...(draft.eventTagId != null ? { event_tag_id: draft.eventTagId } : {}),
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
