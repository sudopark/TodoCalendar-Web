import type { Todo } from '../models/Todo'
import type { Schedule } from '../models/Schedule'
import type { EventTime, Repeating, NotificationOption } from '../models'
import type { DoneTodo } from '../models/DoneTodo'
import { useCalendarEventsCache } from './caches/calendarEventsCache'
import { useCurrentTodosCache } from './caches/currentTodosCache'
import { useUncompletedTodosCache } from './caches/uncompletedTodosCache'
import { monthRange } from '../domain/functions/eventTime'
import type { CalendarEvent } from '../domain/functions/eventTime'

// ── API 인터페이스 명시적 정의 ────────────────────────────────────────
// todoApi/scheduleApi 모듈의 실제 시그니처와 동기를 유지해야 한다.
export interface TodoApi {
  getTodos(lower: number, upper: number): Promise<Todo[]>
  getCurrentTodos(): Promise<Todo[]>
  getUncompletedTodos(): Promise<Todo[]>
  getTodo(id: string): Promise<Todo>
  createTodo(body: { name: string; event_tag_id?: string; event_time?: EventTime; repeating?: Repeating; notification_options?: NotificationOption[]; is_current?: boolean }): Promise<Todo>
  updateTodo(id: string, body: Partial<Pick<Todo, 'name' | 'event_tag_id' | 'event_time' | 'repeating' | 'notification_options'>>): Promise<Todo>
  completeTodo(id: string, body: { origin: Todo; next_event_time?: EventTime; next_repeating_turn?: number }): Promise<DoneTodo>
  replaceTodo(id: string, body: { new: Record<string, unknown>; origin_next_event_time?: EventTime; next_repeating_turn?: number }): Promise<{ new_todo: Todo; next_repeating?: Todo }>
  patchTodo(id: string, body: Record<string, unknown>): Promise<Todo>
  deleteTodo(id: string): Promise<{ status: string }>
}

export interface ScheduleApi {
  getSchedules(lower: number, upper: number): Promise<Schedule[]>
  getSchedule(id: string): Promise<Schedule>
  createSchedule(body: { name: string; event_tag_id?: string; event_time: EventTime; repeating?: Repeating; notification_options?: NotificationOption[] }): Promise<Schedule>
  updateSchedule(id: string, body: Partial<Pick<Schedule, 'name' | 'event_tag_id' | 'event_time' | 'repeating' | 'notification_options'>>): Promise<Schedule>
  excludeRepeating(id: string, body: { exclude_repeatings: number[] }): Promise<Schedule>
  deleteSchedule(id: string): Promise<{ status: string }>
}

export type TodoCreateInput = Parameters<TodoApi['createTodo']>[0]
export type TodoPatch = Parameters<TodoApi['patchTodo']>[1]
export type ScheduleCreateInput = Parameters<ScheduleApi['createSchedule']>[0]
export type SchedulePatch = Parameters<ScheduleApi['updateSchedule']>[1]

interface Deps {
  todoApi: TodoApi
  scheduleApi: ScheduleApi
}

export class EventRepository {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  // ── fetch: 서버 → 캐시 ────────────────────────────────────────────

  // year: 연도(4자리), month: 0-indexed 월 (JS Date 규약)
  async fetchMonth(year: number, month: number): Promise<void> {
    const range = monthRange(year, month)
    const [todos, schedules] = await Promise.all([
      this.deps.todoApi.getTodos(range.lower, range.upper),
      this.deps.scheduleApi.getSchedules(range.lower, range.upper),
    ])
    useCalendarEventsCache.getState().replaceMonth(year, month, todos, schedules)
  }

  async fetchCurrentTodos(): Promise<void> {
    const todos = await this.deps.todoApi.getCurrentTodos()
    useCurrentTodosCache.getState().replaceAll(todos)
  }

  async fetchUncompletedTodos(): Promise<void> {
    const todos = await this.deps.todoApi.getUncompletedTodos()
    useUncompletedTodosCache.getState().replaceAll(todos)
  }

  // ── observe: snapshot ────────────────────────────────────────────
  // hook 기반 구독은 src/repositories/hooks/ 디렉토리의 독립 함수로 제공한다.
  // Repository 클래스는 React를 모른다.

  // year: 연도(4자리), month: 0-indexed 월
  getMonthEventsSnapshot(year: number, month: number): CalendarEvent[] {
    const range = monthRange(year, month)
    const lowerDate = new Date(range.lower * 1000)
    lowerDate.setHours(0, 0, 0, 0)
    const upperDate = new Date(range.upper * 1000)
    upperDate.setHours(23, 59, 59, 999)
    const result: CalendarEvent[] = []
    for (const [key, events] of useCalendarEventsCache.getState().eventsByDate) {
      const d = new Date(key)
      if (d >= lowerDate && d <= upperDate) {
        result.push(...events)
      }
    }
    return result
  }

  getCurrentTodosSnapshot(): Todo[] {
    return useCurrentTodosCache.getState().todos
  }

  // ── fetch single ──────────────────────────────────────────────────

  async getTodo(id: string): Promise<Todo> {
    return this.deps.todoApi.getTodo(id)
  }

  async getSchedule(id: string): Promise<Schedule> {
    return this.deps.scheduleApi.getSchedule(id)
  }

  // ── mutate: api 호출 + 캐시 갱신 ──────────────────────────────────

  async createTodo(input: TodoCreateInput): Promise<Todo> {
    const created = await this.deps.todoApi.createTodo(input)
    if (created.event_time) {
      useCalendarEventsCache.getState().addEvent({ type: 'todo', event: created })
    }
    if (created.is_current) {
      useCurrentTodosCache.getState().addTodo(created)
    }
    return created
  }

  async updateTodo(id: string, patch: TodoPatch): Promise<Todo> {
    const updated = await this.deps.todoApi.patchTodo(id, patch)
    useCalendarEventsCache.getState().replaceEvent(id, { type: 'todo', event: updated })
    if (updated.is_current) {
      // 이미 목록에 있으면 교체, 없으면 추가 (is_current가 새로 true가 된 경우)
      const alreadyInList = useCurrentTodosCache.getState().todos.some(t => t.uuid === id)
      if (alreadyInList) {
        useCurrentTodosCache.getState().replaceTodo(updated)
      } else {
        useCurrentTodosCache.getState().addTodo(updated)
      }
    } else {
      useCurrentTodosCache.getState().removeTodo(id)
    }
    return updated
  }

  async deleteTodo(id: string): Promise<void> {
    await this.deps.todoApi.deleteTodo(id)
    useCalendarEventsCache.getState().removeEvent(id)
    useCurrentTodosCache.getState().removeTodo(id)
  }

  async patchTodoNextOccurrence(id: string, nextEventTime: EventTime, nextTurn: number): Promise<Todo> {
    const updated = await this.deps.todoApi.patchTodo(id, {
      event_time: nextEventTime,
      repeating_turn: nextTurn,
    })
    useCalendarEventsCache.getState().replaceEvent(id, { type: 'todo', event: updated })
    return updated
  }

  // 반복 todo를 "이 회차만" 분리: 원본을 다음 회차로 전진시키고 새 단건 todo를 반환
  async replaceTodoThisScope(
    id: string,
    body: Parameters<TodoApi['replaceTodo']>[1],
  ): Promise<{ new_todo: Todo; next_repeating: Todo | undefined }> {
    const result = await this.deps.todoApi.replaceTodo(id, body)
    useCalendarEventsCache.getState().removeEvent(id)
    if (result.new_todo.event_time) {
      useCalendarEventsCache.getState().addEvent({ type: 'todo', event: result.new_todo })
    }
    if (result.next_repeating?.event_time) {
      useCalendarEventsCache.getState().addEvent({ type: 'todo', event: result.next_repeating })
    }
    return { new_todo: result.new_todo, next_repeating: result.next_repeating }
  }

  // ── Schedule 동형 ──────────────────────────────────────────────────

  async createSchedule(input: ScheduleCreateInput): Promise<Schedule> {
    const created = await this.deps.scheduleApi.createSchedule(input)
    useCalendarEventsCache.getState().addEvent({ type: 'schedule', event: created })
    return created
  }

  async updateSchedule(id: string, patch: SchedulePatch): Promise<Schedule> {
    const updated = await this.deps.scheduleApi.updateSchedule(id, patch)
    useCalendarEventsCache.getState().replaceEvent(id, { type: 'schedule', event: updated })
    return updated
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.deps.scheduleApi.deleteSchedule(id)
    useCalendarEventsCache.getState().removeEvent(id)
  }

  async excludeScheduleRepeating(id: string, excludeTurns: number[]): Promise<Schedule> {
    const updated = await this.deps.scheduleApi.excludeRepeating(id, { exclude_repeatings: excludeTurns })
    useCalendarEventsCache.getState().replaceEvent(id, { type: 'schedule', event: updated })
    return updated
  }

}
