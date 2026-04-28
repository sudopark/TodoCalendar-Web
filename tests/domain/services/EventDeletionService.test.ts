import { describe, it, expect, beforeEach } from 'vitest'

import { EventDeletionService } from '../../../src/domain/services/EventDeletionService'
import { EventDeletionError } from '../../../src/domain/errors/EventDeletionError'
import type { EventRepository } from '../../../src/repositories/EventRepository'
import type { Todo } from '../../../src/models/Todo'
import type { Schedule } from '../../../src/models/Schedule'
import type { EventTime } from '../../../src/models/EventTime'
import type { Repeating } from '../../../src/models/Repeating'

// ─────────────────────────── Fake Repo ────────────────────────────────

class FakeEventRepo {
  todos = new Map<string, Todo>()
  schedules = new Map<string, Schedule>()

  async deleteTodo(id: string): Promise<void> {
    this.todos.delete(id)
  }

  async patchTodoNextOccurrence(id: string, nextEventTime: EventTime, nextTurn: number): Promise<Todo> {
    const existing = this.todos.get(id)!
    const updated: Todo = { ...existing, event_time: nextEventTime, repeating_turn: nextTurn }
    this.todos.set(id, updated)
    return updated
  }

  async updateTodo(id: string, patch: Record<string, unknown>): Promise<Todo> {
    const existing = this.todos.get(id)!
    const updated: Todo = { ...existing, ...(patch as Partial<Todo>) }
    this.todos.set(id, updated)
    return updated
  }

  async deleteSchedule(id: string): Promise<void> {
    this.schedules.delete(id)
  }

  async excludeScheduleRepeating(id: string, excludeTurns: number[]): Promise<Schedule> {
    const existing = this.schedules.get(id)!
    const updated: Schedule = { ...existing, exclude_repeatings: excludeTurns }
    this.schedules.set(id, updated)
    return updated
  }

  async updateSchedule(id: string, patch: Record<string, unknown>): Promise<Schedule> {
    const existing = this.schedules.get(id)!
    const updated: Schedule = { ...existing, ...(patch as Partial<Schedule>) }
    this.schedules.set(id, updated)
    return updated
  }
}

// ─────────────────────────── 픽스처 헬퍼 ──────────────────────────────

const AT_TIME: EventTime = { time_type: 'at', timestamp: 1_700_000_000 }
// interval: 매 7일(seconds) 반복
const DAILY_REPEATING: Repeating = {
  start: 1_700_000_000,
  option: { optionType: 'every_day', interval: 1 },
}
const INTERVAL_SECONDS = 86_400 // every_day interval=1 → 1일 = 86400초

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    uuid: 'todo-1',
    name: 'Test Todo',
    is_current: false,
    ...overrides,
  }
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    uuid: 'schedule-1',
    name: 'Test Schedule',
    event_time: AT_TIME,
    ...overrides,
  }
}

function makeService(repo: FakeEventRepo): EventDeletionService {
  return new EventDeletionService({ eventRepo: repo as unknown as EventRepository })
}

// ─────────────────────────── Tests ────────────────────────────────────

describe('EventDeletionService', () => {
  let repo: FakeEventRepo

  beforeEach(() => {
    repo = new FakeEventRepo()
  })

  // ── Todo: 반복 없음 ──────────────────────────────────────────────

  describe('반복 없는 todo 삭제', () => {
    it('scope 없이 호출하면 repo에서 제거된다', async () => {
      // given
      const todo = makeTodo({ uuid: 'todo-1' })
      repo.todos.set('todo-1', todo)
      const svc = makeService(repo)

      // when
      await svc.deleteTodo(todo)

      // then
      expect(repo.todos.has('todo-1')).toBe(false)
    })
  })

  // ── Todo: scope='all' ────────────────────────────────────────────

  describe("반복 todo, scope='all'", () => {
    it('repo에서 완전히 제거된다', async () => {
      // given
      const todo = makeTodo({ uuid: 'todo-1', repeating: DAILY_REPEATING, event_time: AT_TIME, repeating_turn: 1 })
      repo.todos.set('todo-1', todo)
      const svc = makeService(repo)

      // when
      await svc.deleteTodo(todo, 'all')

      // then
      expect(repo.todos.has('todo-1')).toBe(false)
    })
  })

  // ── Todo: scope='this', 다음 회차 있음 ───────────────────────────

  describe("반복 todo, scope='this', 다음 회차 있음", () => {
    it('다음 회차 event_time으로 갱신되고 삭제되지 않는다', async () => {
      // given
      const todo = makeTodo({ uuid: 'todo-1', repeating: DAILY_REPEATING, event_time: AT_TIME, repeating_turn: 1 })
      repo.todos.set('todo-1', todo)
      const svc = makeService(repo)

      // when
      await svc.deleteTodo(todo, 'this')

      // then
      expect(repo.todos.has('todo-1')).toBe(true)
      const remaining = repo.todos.get('todo-1')!
      expect((remaining.event_time as Extract<EventTime, { time_type: 'at' }>).timestamp)
        .toBe(AT_TIME.timestamp + INTERVAL_SECONDS)
      expect(remaining.repeating_turn).toBe(2)
    })
  })

  // ── Todo: scope='this', 다음 회차 없음 (end_count 소진) ──────────

  describe("반복 todo, scope='this', 다음 회차 없음", () => {
    it('repo에서 완전히 제거된다', async () => {
      // given: end_count=1 → turn 1이 마지막
      const repeatingNoMore: Repeating = { ...DAILY_REPEATING, end_count: 1 }
      const todo = makeTodo({
        uuid: 'todo-1',
        repeating: repeatingNoMore,
        event_time: AT_TIME,
        repeating_turn: 1,
      })
      repo.todos.set('todo-1', todo)
      const svc = makeService(repo)

      // when
      await svc.deleteTodo(todo, 'this')

      // then
      expect(repo.todos.has('todo-1')).toBe(false)
    })
  })

  // ── Todo: scope='future' ─────────────────────────────────────────

  describe("반복 todo, scope='future'", () => {
    it('repeating.end가 현재 turn 직전으로 설정되고 todo는 남는다', async () => {
      // given
      const todo = makeTodo({ uuid: 'todo-1', repeating: DAILY_REPEATING, event_time: AT_TIME, repeating_turn: 3 })
      repo.todos.set('todo-1', todo)
      const svc = makeService(repo)

      // when
      await svc.deleteTodo(todo, 'future')

      // then: todo 남아 있고, repeating.end = AT_TIME.timestamp - 1
      const remaining = repo.todos.get('todo-1')!
      expect(remaining.repeating?.end).toBe(AT_TIME.timestamp - 1)
    })
  })

  // ── Todo: scope 누락 시 invalid_scope ────────────────────────────

  describe('반복 todo에 scope 없이 호출하면', () => {
    it('EventDeletionError(invalid_scope)를 throw한다', async () => {
      // given
      const todo = makeTodo({ uuid: 'todo-1', repeating: DAILY_REPEATING, event_time: AT_TIME, repeating_turn: 1 })
      repo.todos.set('todo-1', todo)
      const svc = makeService(repo)

      // when / then
      await expect(svc.deleteTodo(todo)).rejects.toSatisfy(
        (e: unknown) => e instanceof EventDeletionError && e.reason.type === 'invalid_scope',
      )
      // repo 상태 변경 없어야 함
      expect(repo.todos.has('todo-1')).toBe(true)
    })
  })

  // ── Schedule: 반복 없음 ──────────────────────────────────────────

  describe('반복 없는 schedule 삭제', () => {
    it('scope 없이 호출하면 repo에서 제거된다', async () => {
      // given
      const schedule = makeSchedule({ uuid: 'schedule-1' })
      repo.schedules.set('schedule-1', schedule)
      const svc = makeService(repo)

      // when
      await svc.deleteSchedule(schedule)

      // then
      expect(repo.schedules.has('schedule-1')).toBe(false)
    })
  })

  // ── Schedule: scope='all' ────────────────────────────────────────

  describe("반복 schedule, scope='all'", () => {
    it('repo에서 완전히 제거된다', async () => {
      // given
      const schedule = makeSchedule({ uuid: 'schedule-1', repeating: DAILY_REPEATING })
      repo.schedules.set('schedule-1', schedule)
      const svc = makeService(repo)

      // when
      await svc.deleteSchedule(schedule, 'all')

      // then
      expect(repo.schedules.has('schedule-1')).toBe(false)
    })
  })

  // ── Schedule: scope='this' ───────────────────────────────────────

  describe("반복 schedule, scope='this'", () => {
    it('show_turns[0] 값이 exclude_repeatings에 추가된다', async () => {
      // given: show_turns=[3], exclude_repeatings=[1,2]
      const schedule = makeSchedule({
        uuid: 'schedule-1',
        repeating: DAILY_REPEATING,
        show_turns: [3],
        exclude_repeatings: [1, 2],
      })
      repo.schedules.set('schedule-1', schedule)
      const svc = makeService(repo)

      // when
      await svc.deleteSchedule(schedule, 'this')

      // then: schedule 남아 있고, exclude_repeatings에 3 추가
      expect(repo.schedules.has('schedule-1')).toBe(true)
      expect(repo.schedules.get('schedule-1')!.exclude_repeatings).toEqual([1, 2, 3])
    })

    it('show_turns 없으면 turn=0이 exclude_repeatings에 추가된다', async () => {
      // given: show_turns=undefined
      const schedule = makeSchedule({
        uuid: 'schedule-1',
        repeating: DAILY_REPEATING,
      })
      repo.schedules.set('schedule-1', schedule)
      const svc = makeService(repo)

      // when
      await svc.deleteSchedule(schedule, 'this')

      // then
      expect(repo.schedules.get('schedule-1')!.exclude_repeatings).toEqual([0])
    })
  })

  // ── Schedule: scope='future' ─────────────────────────────────────

  describe("반복 schedule, scope='future'", () => {
    it('repeating.end가 이벤트 시작 직전으로 설정되고 schedule은 남는다', async () => {
      // given
      const schedule = makeSchedule({ uuid: 'schedule-1', repeating: DAILY_REPEATING, event_time: AT_TIME })
      repo.schedules.set('schedule-1', schedule)
      const svc = makeService(repo)

      // when
      await svc.deleteSchedule(schedule, 'future')

      // then
      const remaining = repo.schedules.get('schedule-1')!
      expect(remaining.repeating?.end).toBe(AT_TIME.timestamp - 1)
    })
  })

  // ── Schedule: scope 누락 시 invalid_scope ────────────────────────

  describe('반복 schedule에 scope 없이 호출하면', () => {
    it('EventDeletionError(invalid_scope)를 throw한다', async () => {
      // given
      const schedule = makeSchedule({ uuid: 'schedule-1', repeating: DAILY_REPEATING })
      repo.schedules.set('schedule-1', schedule)
      const svc = makeService(repo)

      // when / then
      await expect(svc.deleteSchedule(schedule)).rejects.toSatisfy(
        (e: unknown) => e instanceof EventDeletionError && e.reason.type === 'invalid_scope',
      )
      expect(repo.schedules.has('schedule-1')).toBe(true)
    })
  })

  // ── repo throw 시 unknown 매핑 ────────────────────────────────────

  describe('repo가 예외를 throw할 때', () => {
    it('EventDeletionError(unknown)으로 매핑된다', async () => {
      // given: deleteTodo를 throw하는 fake
      const failRepo = {
        ...repo,
        deleteTodo: async () => { throw new Error('network error') },
      } as unknown as EventRepository
      const svc = new EventDeletionService({ eventRepo: failRepo })
      const todo = makeTodo({ uuid: 'todo-fail' })

      // when / then
      await expect(svc.deleteTodo(todo)).rejects.toSatisfy(
        (e: unknown) => e instanceof EventDeletionError && e.reason.type === 'unknown',
      )
    })
  })
})
