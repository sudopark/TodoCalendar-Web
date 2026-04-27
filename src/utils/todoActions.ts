import { todoApi } from '../api/todoApi'
import { nextRepeatingTime } from './repeatingTimeCalculator'
import { useCalendarEventsCache } from '../repositories/caches/calendarEventsCache'
import { useCurrentTodosCache } from '../repositories/caches/currentTodosCache'
import { useUncompletedTodosCache } from '../repositories/caches/uncompletedTodosCache'
import type { Todo } from '../models'

export async function skipRepeatingTodo(todo: Todo): Promise<void> {
  if (!todo.repeating || !todo.event_time) return
  const next = nextRepeatingTime(todo.event_time, todo.repeating_turn ?? 1, todo.repeating, todo.exclude_repeatings)
  const { removeEvent, addEvent } = useCalendarEventsCache.getState()
  if (next) {
    const updated = await todoApi.patchTodo(todo.uuid, { event_time: next.time, repeating_turn: next.turn })
    removeEvent(todo.uuid)
    if (updated.event_time) addEvent({ type: 'todo', event: updated })
  } else {
    await todoApi.deleteTodo(todo.uuid)
    removeEvent(todo.uuid)
  }
  await refreshTodoListStores()
}

export async function refreshTodoListStores(): Promise<void> {
  await Promise.all([
    useUncompletedTodosCache.getState().fetch(),
    useCurrentTodosCache.getState().fetch(),
  ]).catch(e => console.warn('Todo stores refresh failed:', e))
}

/** @deprecated Use refreshTodoListStores instead */
export const refreshAllTodoStores = refreshTodoListStores
