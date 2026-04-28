import { describe, it, expect, beforeEach } from 'vitest'

// EventSaveService는 Repository 인터페이스에만 의존하므로 Firebase/API 모킹 불필요
import { EventSaveService } from '../../../src/domain/services/EventSaveService'
import { EventSaveError } from '../../../src/domain/errors/EventSaveError'
import type { EventRepository } from '../../../src/repositories/EventRepository'
import type { EventDetailRepository } from '../../../src/repositories/EventDetailRepository'
import type { Todo } from '../../../src/models/Todo'
import type { Schedule } from '../../../src/models/Schedule'
import type { EventDetail } from '../../../src/models/EventDetail'
import type { EventTime } from '../../../src/models/EventTime'

// ───────────────────────────── Fake Repos ──────────────────────────────

class FakeEventRepo {
  todos = new Map<string, Todo>()
  schedules = new Map<string, Schedule>()
  private todoCounter = 0
  private scheduleCounter = 0

  async createTodo(input: Parameters<EventRepository['createTodo']>[0]): Promise<Todo> {
    const t: Todo = { uuid: `todo-${this.todoCounter++}`, is_current: false, ...input }
    this.todos.set(t.uuid, t)
    return t
  }

  async updateTodo(id: string, patch: Parameters<EventRepository['updateTodo']>[1]): Promise<Todo> {
    const existing = this.todos.get(id) ?? { uuid: id, name: 'original', is_current: false }
    const updated: Todo = { ...existing, ...(patch as Partial<Todo>) }
    this.todos.set(id, updated)
    return updated
  }

  async createSchedule(input: Parameters<EventRepository['createSchedule']>[0]): Promise<Schedule> {
    const s: Schedule = { uuid: `schedule-${this.scheduleCounter++}`, ...input }
    this.schedules.set(s.uuid, s)
    return s
  }

  async updateSchedule(id: string, patch: Parameters<EventRepository['updateSchedule']>[1]): Promise<Schedule> {
    const existing = this.schedules.get(id) ?? {
      uuid: id,
      name: 'original',
      event_time: { time_type: 'at', timestamp: 1700000000 } as EventTime,
    }
    const updated: Schedule = { ...existing, ...(patch as Partial<Schedule>) }
    this.schedules.set(id, updated)
    return updated
  }
}

class FakeDetailRepo {
  details = new Map<string, EventDetail>()

  async get(id: string): Promise<EventDetail | null> {
    return this.details.get(id) ?? null
  }

  async save(id: string, detail: EventDetail): Promise<EventDetail> {
    const saved = { ...detail }
    this.details.set(id, saved)
    return saved
  }

  invalidate(id: string): void {
    this.details.delete(id)
  }
}

// ───────────────────────────── 헬퍼 ──────────────────────────────

const VALID_EVENT_TIME: EventTime = { time_type: 'at', timestamp: 1700000000 }

function makeService(
  eventRepo: FakeEventRepo,
  detailRepo: FakeDetailRepo,
): EventSaveService {
  return new EventSaveService({
    eventRepo: eventRepo as unknown as EventRepository,
    detailRepo: detailRepo as unknown as EventDetailRepository,
  })
}

// ───────────────────────────── 테스트 ──────────────────────────────

describe('EventSaveService', () => {
  let eventRepo: FakeEventRepo
  let detailRepo: FakeDetailRepo
  let service: EventSaveService

  beforeEach(() => {
    eventRepo = new FakeEventRepo()
    detailRepo = new FakeDetailRepo()
    service = makeService(eventRepo, detailRepo)
  })

  // ── createTodo ──────────────────────────────────────────────────

  describe('createTodo', () => {
    it('이름이 비어있으면 invalid_name EventSaveError를 throw한다', async () => {
      // given
      const draft = { name: '' }
      // when
      const act = () => service.createTodo(draft)
      // then
      await expect(act).rejects.toThrow(EventSaveError)
      await expect(act).rejects.toMatchObject({ reason: { type: 'invalid_name' } })
    })

    it('이름이 공백만 있으면 invalid_name EventSaveError를 throw한다', async () => {
      // given
      const draft = { name: '   ' }
      // when
      const act = () => service.createTodo(draft)
      // then
      await expect(act).rejects.toMatchObject({ reason: { type: 'invalid_name' } })
    })

    it('유효하지 않은 eventTime이면 invalid_time EventSaveError를 throw한다', async () => {
      // given
      const draft = { name: '할일', eventTime: { time_type: 'at' as const, timestamp: 0 } }
      // when
      const act = () => service.createTodo(draft)
      // then
      await expect(act).rejects.toMatchObject({ reason: { type: 'invalid_time' } })
    })

    it('유효한 draft이면 생성된 Todo를 반환하고 fakeRepo에 저장된다', async () => {
      // given
      const draft = { name: '새 할일', eventTime: VALID_EVENT_TIME }
      // when
      const result = await service.createTodo(draft)
      // then
      expect(result.name).toBe('새 할일')
      expect(eventRepo.todos.get(result.uuid)).toBeDefined()
      expect(eventRepo.todos.get(result.uuid)?.name).toBe('새 할일')
    })

    it('detail이 함께 전달되면 detailRepo에도 저장된다', async () => {
      // given
      const detail: EventDetail = { memo: '메모입니다', place: '서울' }
      const draft = { name: '할일', detail }
      // when
      const result = await service.createTodo(draft)
      // then
      expect(detailRepo.details.get(result.uuid)).toEqual(detail)
    })

    it('detail 없이 생성하면 detailRepo에는 아무것도 저장되지 않는다', async () => {
      // given
      const draft = { name: '할일' }
      // when
      await service.createTodo(draft)
      // then
      expect(detailRepo.details.size).toBe(0)
    })

    it('eventRepo가 throw하면 EventSaveError(unknown)으로 매핑된다', async () => {
      // given
      const failingRepo = new FakeEventRepo()
      failingRepo.createTodo = async () => { throw new Error('network error') }
      const svc = makeService(failingRepo, detailRepo)
      // when
      const act = () => svc.createTodo({ name: '할일' })
      // then
      await expect(act).rejects.toBeInstanceOf(EventSaveError)
      await expect(act).rejects.toMatchObject({ reason: { type: 'unknown' } })
    })
  })

  // ── updateTodo ──────────────────────────────────────────────────

  describe('updateTodo', () => {
    it('유효한 draft이면 업데이트된 Todo를 반환하고 fakeRepo에 반영된다', async () => {
      // given
      const existing: Todo = { uuid: 'todo-1', name: '기존 할일', is_current: false }
      eventRepo.todos.set('todo-1', existing)
      const draft = { name: '수정된 할일', eventTime: VALID_EVENT_TIME }
      // when
      const result = await service.updateTodo('todo-1', draft)
      // then
      expect(result.name).toBe('수정된 할일')
      expect(eventRepo.todos.get('todo-1')?.name).toBe('수정된 할일')
    })

    it('이름이 비어있으면 invalid_name EventSaveError를 throw한다', async () => {
      // given
      const draft = { name: '' }
      // when
      const act = () => service.updateTodo('todo-1', draft)
      // then
      await expect(act).rejects.toMatchObject({ reason: { type: 'invalid_name' } })
    })

    it('detail이 함께 전달되면 detailRepo에 저장된다', async () => {
      // given
      const detail: EventDetail = { url: 'https://example.com' }
      const draft = { name: '수정된 할일', detail }
      // when
      await service.updateTodo('todo-1', draft)
      // then
      expect(detailRepo.details.get('todo-1')).toEqual(detail)
    })
  })

  // ── createSchedule ──────────────────────────────────────────────

  describe('createSchedule', () => {
    it('이름이 비어있으면 invalid_name EventSaveError를 throw한다', async () => {
      // given
      const draft = { name: '', eventTime: VALID_EVENT_TIME }
      // when
      const act = () => service.createSchedule(draft)
      // then
      await expect(act).rejects.toMatchObject({ reason: { type: 'invalid_name' } })
    })

    it('eventTime이 없으면 invalid_time EventSaveError를 throw한다', async () => {
      // given
      const draft = { name: '일정', eventTime: null }
      // when
      const act = () => service.createSchedule(draft)
      // then
      await expect(act).rejects.toMatchObject({ reason: { type: 'invalid_time' } })
    })

    it('유효한 draft이면 생성된 Schedule을 반환하고 fakeRepo에 저장된다', async () => {
      // given
      const draft = { name: '새 일정', eventTime: VALID_EVENT_TIME }
      // when
      const result = await service.createSchedule(draft)
      // then
      expect(result.name).toBe('새 일정')
      expect(eventRepo.schedules.get(result.uuid)).toBeDefined()
      expect(eventRepo.schedules.get(result.uuid)?.name).toBe('새 일정')
    })

    it('detail이 함께 전달되면 detailRepo에도 저장된다', async () => {
      // given
      const detail: EventDetail = { place: '회의실' }
      const draft = { name: '일정', eventTime: VALID_EVENT_TIME, detail }
      // when
      const result = await service.createSchedule(draft)
      // then
      expect(detailRepo.details.get(result.uuid)).toEqual(detail)
    })

    it('eventRepo가 throw하면 EventSaveError(unknown)으로 매핑된다', async () => {
      // given
      const failingRepo = new FakeEventRepo()
      failingRepo.createSchedule = async () => { throw new Error('server error') }
      const svc = makeService(failingRepo, detailRepo)
      // when
      const act = () => svc.createSchedule({ name: '일정', eventTime: VALID_EVENT_TIME })
      // then
      await expect(act).rejects.toBeInstanceOf(EventSaveError)
      await expect(act).rejects.toMatchObject({ reason: { type: 'unknown' } })
    })
  })

  // ── updateSchedule ──────────────────────────────────────────────

  describe('updateSchedule', () => {
    it('유효한 draft이면 업데이트된 Schedule을 반환하고 fakeRepo에 반영된다', async () => {
      // given
      const existing: Schedule = {
        uuid: 'schedule-1',
        name: '기존 일정',
        event_time: VALID_EVENT_TIME,
      }
      eventRepo.schedules.set('schedule-1', existing)
      const draft = { name: '수정된 일정', eventTime: VALID_EVENT_TIME }
      // when
      const result = await service.updateSchedule('schedule-1', draft)
      // then
      expect(result.name).toBe('수정된 일정')
      expect(eventRepo.schedules.get('schedule-1')?.name).toBe('수정된 일정')
    })

    it('이름이 비어있으면 invalid_name EventSaveError를 throw한다', async () => {
      // given
      const draft = { name: '', eventTime: VALID_EVENT_TIME }
      // when
      const act = () => service.updateSchedule('schedule-1', draft)
      // then
      await expect(act).rejects.toMatchObject({ reason: { type: 'invalid_name' } })
    })

    it('detail이 함께 전달되면 detailRepo에 저장된다', async () => {
      // given
      const detail: EventDetail = { memo: '업데이트 메모' }
      const draft = { name: '수정된 일정', eventTime: VALID_EVENT_TIME, detail }
      // when
      await service.updateSchedule('schedule-1', draft)
      // then
      expect(detailRepo.details.get('schedule-1')).toEqual(detail)
    })

    it('eventRepo가 throw하면 EventSaveError(unknown)으로 매핑된다', async () => {
      // given
      const failingRepo = new FakeEventRepo()
      failingRepo.updateSchedule = async () => { throw new Error('forbidden') }
      const svc = makeService(failingRepo, detailRepo)
      // when
      const act = () => svc.updateSchedule('schedule-1', { name: '일정', eventTime: VALID_EVENT_TIME })
      // then
      await expect(act).rejects.toBeInstanceOf(EventSaveError)
      await expect(act).rejects.toMatchObject({ reason: { type: 'unknown' } })
    })
  })
})
