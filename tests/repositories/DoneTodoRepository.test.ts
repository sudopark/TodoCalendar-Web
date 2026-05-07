import { describe, it, expect, beforeEach, vi } from 'vitest'

// Firebase 연쇄 초기화 차단
vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('../../src/api/doneTodoApi', () => ({ doneTodoApi: {} }))

import { DoneTodoRepository } from '../../src/repositories/DoneTodoRepository'
import { useDoneTodosCache } from '../../src/repositories/caches/doneTodosCache'
import { useCurrentTodosCache } from '../../src/repositories/caches/currentTodosCache'
import { useUncompletedTodosCache } from '../../src/repositories/caches/uncompletedTodosCache'
import type { DoneTodoApi } from '../../src/repositories/DoneTodoRepository'
import type { DoneTodo } from '../../src/models'
import type { Todo } from '../../src/models'

// ──────────────────────── helpers ────────────────────────

function makeDone(id: string, done_at = 1000): DoneTodo {
  return { uuid: id, name: `done-${id}`, done_at, origin_event_id: null, event_time: null, event_tag_id: null }
}

function makeTodo(id: string): Todo {
  return { uuid: id, name: `todo-${id}`, is_current: true }
}

function makeFakeApi(overrides: Partial<DoneTodoApi> = {}): DoneTodoApi {
  return {
    getDoneTodos: overrides.getDoneTodos ?? vi.fn(async () => []),
    deleteDoneTodo: overrides.deleteDoneTodo ?? vi.fn(async () => ({ status: 'ok' })),
    revertDoneTodo: overrides.revertDoneTodo ?? vi.fn(async () => ({ todo: makeTodo('reverted'), detail: null })),
  }
}

function resetCache() {
  useDoneTodosCache.getState().reset()
  useCurrentTodosCache.getState().reset()
  useUncompletedTodosCache.getState().reset()
}

// ──────────────────────── fetchNextPage ────────────────────────

describe('DoneTodoRepository — fetchNextPage', () => {
  beforeEach(resetCache)

  it('API 응답이 캐시 items에 반영된다', async () => {
    // given
    const items = [makeDone('d1', 2000), makeDone('d2', 1000)]
    const repo = new DoneTodoRepository({ api: makeFakeApi({ getDoneTodos: vi.fn(async () => items) }) })

    // when
    await repo.fetchNextPage()

    // then
    const snapshot = repo.getSnapshot()
    expect(snapshot.find(i => i.uuid === 'd1')).toBeDefined()
    expect(snapshot.find(i => i.uuid === 'd2')).toBeDefined()
  })

  it('연속 호출 시 items가 누적된다', async () => {
    // given: 첫 페이지 20개, 두 번째 페이지 1개
    const page1 = Array.from({ length: 20 }, (_, i) => makeDone(`d${i}`, 2000 - i))
    const page2 = [makeDone('d20', 100)]
    const getDoneTodos = vi.fn().mockResolvedValueOnce(page1).mockResolvedValueOnce(page2)
    const repo = new DoneTodoRepository({ api: makeFakeApi({ getDoneTodos }) })

    // when
    await repo.fetchNextPage()
    await repo.fetchNextPage()

    // then
    expect(repo.getSnapshot()).toHaveLength(21)
  })

  it('반환 개수가 페이지 크기 미만이면 hasMore가 false가 된다', async () => {
    // given
    const repo = new DoneTodoRepository({
      api: makeFakeApi({ getDoneTodos: vi.fn(async () => [makeDone('d1')]) }),
    })

    // when
    await repo.fetchNextPage()

    // then: hasMore는 캐시에서 확인
    expect(useDoneTodosCache.getState().hasMore).toBe(false)
  })
})

// ──────────────────────── revert ────────────────────────

describe('DoneTodoRepository — revert', () => {
  beforeEach(resetCache)

  it('revert 후 캐시에서 해당 항목이 제거되고 복원된 Todo가 반환된다', async () => {
    // given — 응답은 iOS RevertTodoResultMapper 와 동일한 { todo, detail } 형태
    useDoneTodosCache.setState({ items: [makeDone('d1'), makeDone('d2')] })
    const restored = makeTodo('d1')
    const repo = new DoneTodoRepository({
      api: makeFakeApi({ revertDoneTodo: vi.fn(async () => ({ todo: restored, detail: null })) }),
    })

    // when
    const result = await repo.revert('d1')

    // then
    expect(result.uuid).toBe('d1')
    expect(repo.getSnapshot().find(i => i.uuid === 'd1')).toBeUndefined()
    expect(repo.getSnapshot().find(i => i.uuid === 'd2')).toBeDefined()
  })

  it('revert 된 todo 가 is_current 이면 currentTodosCache 에 추가된다', async () => {
    // given
    useDoneTodosCache.setState({ items: [makeDone('d3')] })
    const restored: Todo = { ...makeTodo('d3'), is_current: true }
    const repo = new DoneTodoRepository({
      api: makeFakeApi({ revertDoneTodo: vi.fn(async () => ({ todo: restored, detail: null })) }),
    })

    // when
    await repo.revert('d3')

    // then: currentTodosCache 에 추가됨
    expect(useCurrentTodosCache.getState().todos.find(t => t.uuid === restored.uuid)).toBeDefined()
  })

  it('revert 된 todo 가 과거 시점(event_time.timestamp <= now, is_current=false)이면 uncompletedTodosCache 에 추가된다', async () => {
    // given: 과거 시점의 todo — timestamp 를 1(과거)로 설정
    useDoneTodosCache.setState({ items: [makeDone('d4')] })
    const restored: Todo = {
      uuid: 'd4', name: 'past-todo', is_current: false,
      event_time: { time_type: 'at', timestamp: 1 },
    }
    const repo = new DoneTodoRepository({
      api: makeFakeApi({ revertDoneTodo: vi.fn(async () => ({ todo: restored, detail: null })) }),
    })

    // when
    await repo.revert('d4')

    // then: uncompletedTodosCache 에 추가됨
    expect(useUncompletedTodosCache.getState().todos.find(t => t.uuid === 'd4')).toBeDefined()
  })

  it('revert 된 todo 가 is_current=true 이면 uncompletedTodosCache 에 추가되지 않는다', async () => {
    // given: is_current=true 인 todo
    useDoneTodosCache.setState({ items: [makeDone('d5')] })
    const restored: Todo = {
      uuid: 'd5', name: 'current-todo', is_current: true,
      event_time: { time_type: 'at', timestamp: 1 },
    }
    const repo = new DoneTodoRepository({
      api: makeFakeApi({ revertDoneTodo: vi.fn(async () => ({ todo: restored, detail: null })) }),
    })

    // when
    await repo.revert('d5')

    // then: uncompletedTodosCache 에 없음 (currentTodosCache 만)
    expect(useUncompletedTodosCache.getState().todos.find(t => t.uuid === 'd5')).toBeUndefined()
    expect(useCurrentTodosCache.getState().todos.find(t => t.uuid === 'd5')).toBeDefined()
  })

  it('revert 된 todo 가 미래 시점이면 uncompletedTodosCache 에 추가되지 않는다', async () => {
    // given: 미래 timestamp
    const futureTs = Date.now() / 1000 + 86400 * 365 // 1년 후
    useDoneTodosCache.setState({ items: [makeDone('d6')] })
    const restored: Todo = {
      uuid: 'd6', name: 'future-todo', is_current: false,
      event_time: { time_type: 'at', timestamp: futureTs },
    }
    const repo = new DoneTodoRepository({
      api: makeFakeApi({ revertDoneTodo: vi.fn(async () => ({ todo: restored, detail: null })) }),
    })

    // when
    await repo.revert('d6')

    // then: uncompletedTodosCache 에 없음
    expect(useUncompletedTodosCache.getState().todos.find(t => t.uuid === 'd6')).toBeUndefined()
  })
})

// ──────────────────────── remove ────────────────────────

describe('DoneTodoRepository — remove', () => {
  beforeEach(resetCache)

  it('remove 후 캐시에서 해당 항목이 제거된다', async () => {
    // given
    useDoneTodosCache.setState({ items: [makeDone('d1'), makeDone('d2')] })
    const repo = new DoneTodoRepository({
      api: makeFakeApi({ deleteDoneTodo: vi.fn(async () => ({ status: 'ok' })) }),
    })

    // when
    await repo.remove('d1')

    // then
    expect(repo.getSnapshot().find(i => i.uuid === 'd1')).toBeUndefined()
    expect(repo.getSnapshot().find(i => i.uuid === 'd2')).toBeDefined()
  })
})

// ──────────────────────── getSnapshot ────────────────────────

describe('DoneTodoRepository — getSnapshot', () => {
  beforeEach(resetCache)

  it('캐시에 있는 items를 배열로 반환한다', async () => {
    // given
    useDoneTodosCache.setState({ items: [makeDone('d1'), makeDone('d2'), makeDone('d3')] })
    const repo = new DoneTodoRepository({ api: makeFakeApi() })

    // when
    const snapshot = repo.getSnapshot()

    // then
    expect(snapshot).toHaveLength(3)
    expect(snapshot[0].uuid).toBe('d1')
  })
})
