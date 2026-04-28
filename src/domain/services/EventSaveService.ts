import { validateTodoForm, type TodoFormDraft } from '../functions/validateTodoForm'
import { validateScheduleForm, type ScheduleFormDraft } from '../functions/validateScheduleForm'
import { EventSaveError } from '../errors/EventSaveError'
import type { EventRepository } from '../../repositories/EventRepository'
import type { EventDetailRepository } from '../../repositories/EventDetailRepository'
import type { Todo } from '../../models/Todo'
import type { Schedule } from '../../models/Schedule'
import type { EventDetail } from '../../models/EventDetail'

// MARK: - Types

interface Deps {
  eventRepo: EventRepository
  detailRepo: EventDetailRepository
}

// MARK: - EventSaveService

export class EventSaveService {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  async createTodo(draft: TodoFormDraft & { detail?: EventDetail }): Promise<Todo> {
    const v = validateTodoForm(draft)
    if (!v.ok) {
      throw new EventSaveError({ type: todoValidationFailType(v.reason) })
    }
    try {
      const created = await this.deps.eventRepo.createTodo(v.input)
      if (draft.detail) await this.deps.detailRepo.save(created.uuid, draft.detail)
      return created
    } catch (e) {
      throw mapToEventSaveError(e)
    }
  }

  async updateTodo(id: string, draft: TodoFormDraft & { detail?: EventDetail }): Promise<Todo> {
    const v = validateTodoForm(draft)
    if (!v.ok) {
      throw new EventSaveError({ type: todoValidationFailType(v.reason) })
    }
    try {
      // TodoFormInput → TodoPatch(Record<string,unknown>): spread으로 index signature 제약 우회
      const updated = await this.deps.eventRepo.updateTodo(id, { ...v.input })
      if (draft.detail) await this.deps.detailRepo.save(id, draft.detail)
      return updated
    } catch (e) {
      throw mapToEventSaveError(e)
    }
  }

  async createSchedule(draft: ScheduleFormDraft & { detail?: EventDetail }): Promise<Schedule> {
    const v = validateScheduleForm(draft)
    if (!v.ok) {
      throw new EventSaveError({ type: scheduleValidationFailType(v.reason) })
    }
    try {
      const created = await this.deps.eventRepo.createSchedule(v.input)
      if (draft.detail) await this.deps.detailRepo.save(created.uuid, draft.detail)
      return created
    } catch (e) {
      throw mapToEventSaveError(e)
    }
  }

  async updateSchedule(id: string, draft: ScheduleFormDraft & { detail?: EventDetail }): Promise<Schedule> {
    const v = validateScheduleForm(draft)
    if (!v.ok) {
      throw new EventSaveError({ type: scheduleValidationFailType(v.reason) })
    }
    try {
      const updated = await this.deps.eventRepo.updateSchedule(id, v.input)
      if (draft.detail) await this.deps.detailRepo.save(id, draft.detail)
      return updated
    } catch (e) {
      throw mapToEventSaveError(e)
    }
  }
}

// MARK: - Error mapping

function todoValidationFailType(reason: 'empty_name' | 'invalid_time'): 'invalid_name' | 'invalid_time' {
  return reason === 'empty_name' ? 'invalid_name' : 'invalid_time'
}

function scheduleValidationFailType(reason: 'empty_name' | 'missing_time' | 'invalid_time'): 'invalid_name' | 'invalid_time' {
  return reason === 'empty_name' ? 'invalid_name' : 'invalid_time'
}

function mapToEventSaveError(e: unknown): EventSaveError {
  if (e instanceof EventSaveError) return e
  return new EventSaveError({ type: 'unknown', raw: e })
}
