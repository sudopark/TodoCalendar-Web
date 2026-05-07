import type { Todo } from '../models/Todo'
import type { Schedule } from '../models/Schedule'
import type { EventTime, Repeating, NotificationOption } from '../models'
import type { DoneTodo } from '../models/DoneTodo'
import type { LocalStorageContainer } from './local-storage/LocalStorageContainer'
import { useCalendarEventsCache } from './caches/calendarEventsCache'
import { useCurrentTodosCache } from './caches/currentTodosCache'
import { useUncompletedTodosCache } from './caches/uncompletedTodosCache'
import { monthRange, yearRange, groupEventsByDate } from '../domain/functions/eventTime'
import type { CalendarEvent } from '../domain/functions/eventTime'
import { nextRepeatingTime, getStartTimestamp } from '../domain/functions/repeating'

// ── API 인터페이스 명시적 정의 ────────────────────────────────────────
// todoApi/scheduleApi 모듈의 실제 시그니처와 동기를 유지해야 한다.
export interface TodoApi {
  getTodos(lower: number, upper: number): Promise<Todo[]>
  getCurrentTodos(): Promise<Todo[]>
  getUncompletedTodos(refTime: number): Promise<Todo[]>
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
  localStorageContainer?: LocalStorageContainer
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
    const local = this.deps.localStorageContainer

    // 1. Cache-first
    if (local?.isInitialized()) {
      try {
        const [cTodos, cSchedules] = await Promise.all([
          local.todo().loadTodos(range),
          local.schedule().loadSchedules(range),
        ])
        if (cTodos.length > 0 || cSchedules.length > 0) {
          useCalendarEventsCache.getState().replaceMonth(year, month, cTodos, cSchedules)
        }
      } catch (e) {
        console.warn('LocalStorage cache read 실패:', e)
      }
    }

    // 2. Remote
    const [todos, schedules] = await Promise.all([
      this.deps.todoApi.getTodos(range.lower, range.upper),
      this.deps.scheduleApi.getSchedules(range.lower, range.upper),
    ])
    if (local?.isInitialized()) {
      try {
        const existingTodos = await local.todo().loadTodos(range)
        await local.todo().removeTodos(existingTodos.map(t => t.uuid))
        await local.todo().saveTodos(todos)
        const existingSchedules = await local.schedule().loadSchedules(range)
        await local.schedule().removeSchedules(existingSchedules.map(s => s.uuid))
        await local.schedule().saveSchedules(schedules)
      } catch (e) {
        console.warn('LocalStorage replaceCache 실패:', e)
      }
    }
    useCalendarEventsCache.getState().replaceMonth(year, month, todos, schedules)
  }

  async fetchEventsForYear(year: number): Promise<void> {
    if (useCalendarEventsCache.getState().loadedYears.has(year)) return
    const range = yearRange(year)
    const local = this.deps.localStorageContainer

    // 1. Cache-first: LocalStorage 에 캐시가 있으면 메모리 store 에 즉시 set
    if (local?.isInitialized()) {
      try {
        const [cachedTodos, cachedSchedules] = await Promise.all([
          local.todo().loadTodos(range),
          local.schedule().loadSchedules(range),
        ])
        if (cachedTodos.length > 0 || cachedSchedules.length > 0) {
          const grouped = groupEventsByDate(cachedTodos, cachedSchedules, range.lower, range.upper)
          const merged = new Map(useCalendarEventsCache.getState().eventsByDate)
          // 해당 year 의 기존 entries 제거 후 신규 set (cache-first 도 replace 의미)
          for (const key of merged.keys()) {
            if (key.startsWith(String(year))) merged.delete(key)
          }
          for (const [k, evs] of grouped) {
            merged.set(k, evs)
          }
          useCalendarEventsCache.setState({ eventsByDate: merged })
        }
      } catch (e) {
        console.warn('LocalStorage cache read 실패:', e)
      }
    }

    // 2. Remote: 서버 응답으로 LocalStorage 와 메모리 store 교체
    try {
      useCalendarEventsCache.setState({ loading: true })
      const [todos, schedules] = await Promise.all([
        this.deps.todoApi.getTodos(range.lower, range.upper),
        this.deps.scheduleApi.getSchedules(range.lower, range.upper),
      ])
      if (local?.isInitialized()) {
        try {
          const existingTodos = await local.todo().loadTodos(range)
          await local.todo().removeTodos(existingTodos.map(t => t.uuid))
          await local.todo().saveTodos(todos)
          const existingSchedules = await local.schedule().loadSchedules(range)
          await local.schedule().removeSchedules(existingSchedules.map(s => s.uuid))
          await local.schedule().saveSchedules(schedules)
        } catch (e) {
          console.warn('LocalStorage replaceCache 실패:', e)
        }
      }
      // 메모리: 해당 year 의 기존 entries 제거 후 신규 merge
      const yearEvents = groupEventsByDate(todos, schedules, range.lower, range.upper)
      const current = useCalendarEventsCache.getState()
      const merged = new Map(current.eventsByDate)
      for (const key of merged.keys()) {
        if (key.startsWith(String(year))) merged.delete(key)
      }
      for (const [key, events] of yearEvents) {
        merged.set(key, [...(merged.get(key) ?? []), ...events])
      }
      const newLoadedYears = new Set(current.loadedYears)
      newLoadedYears.add(year)
      useCalendarEventsCache.setState({ eventsByDate: merged, loading: false, loadedYears: newLoadedYears })
    } catch (e) {
      console.warn('이벤트 로드 실패:', e)
      useCalendarEventsCache.setState({ loading: false })
    }
  }

  async fetchCurrentTodos(): Promise<void> {
    const local = this.deps.localStorageContainer

    // 1. Cache-first
    if (local?.isInitialized()) {
      try {
        const cached = await local.todo().loadCurrentTodos()
        if (cached.length > 0) {
          useCurrentTodosCache.getState().replaceAll(cached)
        }
      } catch (e) {
        console.warn('LocalStorage current cache read 실패:', e)
      }
    }

    // 2. Remote
    const todos = await this.deps.todoApi.getCurrentTodos()
    if (local?.isInitialized()) {
      try {
        const existing = await local.todo().loadCurrentTodos()
        await local.todo().removeTodos(existing.map(t => t.uuid))
        await local.todo().saveTodos(todos)
      } catch (e) {
        console.warn('LocalStorage current replace 실패:', e)
      }
    }
    useCurrentTodosCache.getState().replaceAll(todos)
  }

  async fetchUncompletedTodos(): Promise<void> {
    const refTime = Math.floor(Date.now() / 1000)
    const local = this.deps.localStorageContainer

    // 1. Cache-first
    if (local?.isInitialized()) {
      try {
        const cached = await local.todo().loadUncompletedTodos(refTime)
        if (cached.length > 0) {
          useUncompletedTodosCache.getState().replaceAll(cached)
        }
      } catch (e) {
        console.warn('LocalStorage uncompleted cache read 실패:', e)
      }
    }

    // 2. Remote
    const todos = await this.deps.todoApi.getUncompletedTodos(refTime)
    if (local?.isInitialized()) {
      try {
        const existing = await local.todo().loadUncompletedTodos(refTime)
        await local.todo().removeTodos(existing.map(t => t.uuid))
        await local.todo().saveTodos(todos)
      } catch (e) {
        console.warn('LocalStorage uncompleted replace 실패:', e)
      }
    }
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

  // LocalStorage 작업을 silent fail 로 감싸는 헬퍼 — IDB 실패가 mutation 흐름을 깨지 않게
  private async writeLocal(label: string, fn: () => Promise<unknown>): Promise<void> {
    const local = this.deps.localStorageContainer
    if (!local?.isInitialized()) return
    try {
      await fn()
    } catch (e) {
      console.warn(`LocalStorage ${label} 실패:`, e)
    }
  }

  async createTodo(input: TodoCreateInput): Promise<Todo> {
    const created = await this.deps.todoApi.createTodo(input)
    await this.writeLocal('createTodo', () =>
      this.deps.localStorageContainer!.todo().saveTodos([created]),
    )
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
    await this.writeLocal('updateTodo', () =>
      this.deps.localStorageContainer!.todo().updateTodo(updated),
    )
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
    await this.writeLocal('deleteTodo', async () => {
      const local = this.deps.localStorageContainer!
      await local.todo().removeTodos([id])
      await local.eventDetail().removeDetail(id)
    })
    useCalendarEventsCache.getState().removeEvent(id)
    useCurrentTodosCache.getState().removeTodo(id)
  }

  async patchTodoNextOccurrence(id: string, nextEventTime: EventTime, nextTurn: number): Promise<Todo> {
    const updated = await this.deps.todoApi.patchTodo(id, {
      event_time: nextEventTime,
      repeating_turn: nextTurn,
    })
    await this.writeLocal('patchTodoNextOccurrence', () =>
      this.deps.localStorageContainer!.todo().updateTodo(updated),
    )
    useCalendarEventsCache.getState().replaceEvent(id, { type: 'todo', event: updated })
    return updated
  }

  // 반복 todo를 "이 회차만" 분리: 원본을 다음 회차로 전진시키고 새 단건 todo를 반환
  async replaceTodoThisScope(
    id: string,
    body: Parameters<TodoApi['replaceTodo']>[1],
  ): Promise<{ new_todo: Todo; next_repeating: Todo | undefined }> {
    const result = await this.deps.todoApi.replaceTodo(id, body)
    await this.writeLocal('replaceTodoThisScope', async () => {
      const local = this.deps.localStorageContainer!
      await local.todo().removeTodos([id])
      const toSave: Todo[] = [result.new_todo]
      if (result.next_repeating) toSave.push(result.next_repeating)
      await local.todo().saveTodos(toSave)
    })
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
    await this.writeLocal('createSchedule', () =>
      this.deps.localStorageContainer!.schedule().saveSchedules([created]),
    )
    useCalendarEventsCache.getState().addEvent({ type: 'schedule', event: created })
    return created
  }

  async updateSchedule(id: string, patch: SchedulePatch): Promise<Schedule> {
    const updated = await this.deps.scheduleApi.updateSchedule(id, patch)
    await this.writeLocal('updateSchedule', () =>
      this.deps.localStorageContainer!.schedule().updateSchedule(updated),
    )
    useCalendarEventsCache.getState().replaceEvent(id, { type: 'schedule', event: updated })
    return updated
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.deps.scheduleApi.deleteSchedule(id)
    await this.writeLocal('deleteSchedule', async () => {
      const local = this.deps.localStorageContainer!
      await local.schedule().removeSchedules([id])
      await local.eventDetail().removeDetail(id)
    })
    useCalendarEventsCache.getState().removeEvent(id)
  }

  async excludeScheduleRepeating(id: string, excludeTurns: number[]): Promise<Schedule> {
    const updated = await this.deps.scheduleApi.excludeRepeating(id, { exclude_repeatings: excludeTurns })
    await this.writeLocal('excludeScheduleRepeating', () =>
      this.deps.localStorageContainer!.schedule().updateSchedule(updated),
    )
    useCalendarEventsCache.getState().replaceEvent(id, { type: 'schedule', event: updated })
    return updated
  }

  async completeTodo(todo: Todo, scope?: 'this' | 'future' | 'all'): Promise<DoneTodo> {
    const isRepeating = !!todo.repeating && !!todo.event_time

    if (scope === 'this' && isRepeating) {
      const next = nextRepeatingTime(todo.event_time!, todo.repeating_turn ?? 1, todo.repeating!, todo.exclude_repeatings)
      const done = await this.deps.todoApi.completeTodo(todo.uuid, {
        origin: todo,
        next_event_time: next?.time,
        next_repeating_turn: next?.turn,
      })
      if (next?.time) {
        const nextTurn = next.turn ?? (todo.repeating_turn ?? 1) + 1
        const advanced: Todo = { ...todo, event_time: next.time, repeating_turn: nextTurn }
        await this.writeLocal('completeTodo (this+next)', async () => {
          const local = this.deps.localStorageContainer!
          await local.todo().updateTodo(advanced)
          await local.doneTodo().saveDoneTodos([done])
        })
        useCalendarEventsCache.getState().replaceEvent(todo.uuid, { type: 'todo', event: advanced })
        useCurrentTodosCache.getState().replaceTodo(advanced)
        useUncompletedTodosCache.getState().removeTodo(todo.uuid)
      } else {
        await this.writeLocal('completeTodo (this+end)', async () => {
          const local = this.deps.localStorageContainer!
          await local.todo().removeTodos([todo.uuid])
          await local.eventDetail().removeDetail(todo.uuid)
          await local.doneTodo().saveDoneTodos([done])
        })
        useCalendarEventsCache.getState().removeEvent(todo.uuid)
        useCurrentTodosCache.getState().removeTodo(todo.uuid)
        useUncompletedTodosCache.getState().removeTodo(todo.uuid)
      }
      return done
    }

    if (scope === 'future' && isRepeating) {
      const startTs = getStartTimestamp(todo.event_time!)
      await this.deps.todoApi.patchTodo(todo.uuid, { repeating: { ...todo.repeating, end: startTs - 1 } })
      const done = await this.deps.todoApi.completeTodo(todo.uuid, { origin: todo })
      await this.writeLocal('completeTodo (future)', async () => {
        const local = this.deps.localStorageContainer!
        await local.todo().removeTodos([todo.uuid])
        await local.eventDetail().removeDetail(todo.uuid)
        await local.doneTodo().saveDoneTodos([done])
      })
      useCalendarEventsCache.getState().removeEvent(todo.uuid)
      useCurrentTodosCache.getState().removeTodo(todo.uuid)
      useUncompletedTodosCache.getState().removeTodo(todo.uuid)
      return done
    }

    const done = await this.deps.todoApi.completeTodo(todo.uuid, { origin: todo })
    await this.writeLocal('completeTodo (all)', async () => {
      const local = this.deps.localStorageContainer!
      await local.todo().removeTodos([todo.uuid])
      await local.eventDetail().removeDetail(todo.uuid)
      await local.doneTodo().saveDoneTodos([done])
    })
    useCalendarEventsCache.getState().removeEvent(todo.uuid)
    useCurrentTodosCache.getState().removeTodo(todo.uuid)
    useUncompletedTodosCache.getState().removeTodo(todo.uuid)
    return done
  }

}
