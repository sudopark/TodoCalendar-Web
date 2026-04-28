import { EventDeletionError } from '../errors/EventDeletionError'
import { nextRepeatingTime, getStartTimestamp } from '../functions/repeating'
import type { EventRepository } from '../../repositories/EventRepository'
import type { Todo } from '../../models/Todo'
import type { Schedule } from '../../models/Schedule'
import type { RepeatScope } from '../../components/RepeatingScopeDialog'

// MARK: - Types

interface Deps {
  eventRepo: EventRepository
}

// MARK: - EventDeletionService

export class EventDeletionService {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  async deleteTodo(todo: Todo, scope?: RepeatScope): Promise<void> {
    try {
      if (!todo.repeating) {
        await this.deps.eventRepo.deleteTodo(todo.uuid)
        return
      }

      if (scope === undefined) {
        throw new EventDeletionError({ type: 'invalid_scope' })
      }

      switch (scope) {
        case 'all':
          await this.deps.eventRepo.deleteTodo(todo.uuid)
          break

        case 'this': {
          const next = todo.event_time
            ? nextRepeatingTime(
                todo.event_time,
                todo.repeating_turn ?? 1,
                todo.repeating,
                todo.exclude_repeatings,
              )
            : null
          if (next) {
            await this.deps.eventRepo.patchTodoNextOccurrence(todo.uuid, next.time, next.turn)
          } else {
            await this.deps.eventRepo.deleteTodo(todo.uuid)
          }
          break
        }

        case 'future': {
          const startTs = todo.event_time ? getStartTimestamp(todo.event_time) : 0
          const cutoff = startTs - 1
          await this.deps.eventRepo.updateTodo(todo.uuid, {
            repeating: { ...todo.repeating, end: cutoff },
          })
          break
        }
      }
    } catch (e) {
      if (e instanceof EventDeletionError) throw e
      throw mapToEventDeletionError(e)
    }
  }

  async deleteSchedule(schedule: Schedule, scope?: RepeatScope): Promise<void> {
    try {
      if (!schedule.repeating) {
        await this.deps.eventRepo.deleteSchedule(schedule.uuid)
        return
      }

      if (scope === undefined) {
        throw new EventDeletionError({ type: 'invalid_scope' })
      }

      switch (scope) {
        case 'all':
          await this.deps.eventRepo.deleteSchedule(schedule.uuid)
          break

        case 'this': {
          const turn = schedule.show_turns?.[0] ?? 0
          const excluded = [...(schedule.exclude_repeatings ?? []), turn]
          await this.deps.eventRepo.excludeScheduleRepeating(schedule.uuid, excluded)
          break
        }

        case 'future': {
          const cutoff = getStartTimestamp(schedule.event_time) - 1
          await this.deps.eventRepo.updateSchedule(schedule.uuid, {
            repeating: { ...schedule.repeating, end: cutoff },
          })
          break
        }
      }
    } catch (e) {
      if (e instanceof EventDeletionError) throw e
      throw mapToEventDeletionError(e)
    }
  }
}

// MARK: - Private helpers

function mapToEventDeletionError(e: unknown): EventDeletionError {
  return new EventDeletionError({ type: 'unknown', raw: e })
}
