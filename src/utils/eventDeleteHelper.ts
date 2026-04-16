import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import type { Todo } from '../models/Todo'
import type { Schedule } from '../models/Schedule'
import type { RepeatScope } from '../components/RepeatingScopeDialog'
import { nextRepeatingTime, getStartTimestamp } from './repeatingTimeCalculator'

export async function deleteTodoEvent(todo: Todo, scope?: RepeatScope): Promise<void> {
  const { addEvent, removeEvent } = useCalendarEventsStore.getState()
  const { removeTodo } = useCurrentTodosStore.getState()
  const id = todo.uuid

  if (!todo.repeating) {
    await todoApi.deleteTodo(id)
    removeEvent(id)
    removeTodo(id)
  } else if (scope === 'this') {
    const next = todo.event_time
      ? nextRepeatingTime(todo.event_time, todo.repeating_turn ?? 1, todo.repeating, todo.exclude_repeatings)
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
    const startTs = todo.event_time ? getStartTimestamp(todo.event_time) : 0
    const cutoff = startTs - 1
    const ended = await todoApi.patchTodo(id, { repeating: { ...todo.repeating, end: cutoff } })
    removeEvent(id)
    if (ended.event_time) addEvent({ type: 'todo', event: ended })
  }
}

export async function deleteScheduleEvent(schedule: Schedule, scope?: RepeatScope): Promise<void> {
  const { addEvent, removeEvent } = useCalendarEventsStore.getState()
  const id = schedule.uuid

  if (!schedule.repeating) {
    await scheduleApi.deleteSchedule(id)
    removeEvent(id)
  } else if (scope === 'all') {
    await scheduleApi.deleteSchedule(id)
    removeEvent(id)
  } else if (scope === 'this') {
    const turn = schedule.show_turns?.[0] ?? 0
    const excluded = await scheduleApi.excludeRepeating(id, {
      exclude_repeatings: [...(schedule.exclude_repeatings ?? []), turn],
    })
    removeEvent(id)
    addEvent({ type: 'schedule', event: excluded })
  } else {
    // future: 시리즈 종료
    const cutoff = getStartTimestamp(schedule.event_time) - 1
    const ended = await scheduleApi.updateSchedule(id, { repeating: { ...schedule.repeating, end: cutoff } })
    removeEvent(id)
    addEvent({ type: 'schedule', event: ended })
  }
}
