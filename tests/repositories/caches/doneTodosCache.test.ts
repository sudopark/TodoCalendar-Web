import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDoneTodosCache } from '../../../src/repositories/caches/doneTodosCache'
import { useCurrentTodosCache } from '../../../src/repositories/caches/currentTodosCache'
import { doneTodoApi } from '../../../src/api/doneTodoApi'
import type { Todo } from '../../../src/models'

vi.mock('../../../src/api/doneTodoApi', () => ({
  doneTodoApi: {
    getDoneTodos: vi.fn(),
    deleteDoneTodo: vi.fn(),
    revertDoneTodo: vi.fn(),
  },
}))

const makeDone = (id: string, done_at: number | null = 1000) => ({
  uuid: id,
  name: `done-${id}`,
  done_at,
  origin_event_id: null,
  event_time: null,
  event_tag_id: null,
})

describe('useDoneTodosCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDoneTodosCache.getState().reset()
    useCurrentTodosCache.getState().reset()
  })

  it('fetchNext 호출 시 items에 결과가 추가된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1', 2000), makeDone('d2', 1000)])

    // when
    await useDoneTodosCache.getState().fetchNext()

    // then
    expect(useDoneTodosCache.getState().items).toHaveLength(2)
  })

  it('fetchNext 연속 호출 시 items가 누적된다', async () => {
    // given: 첫 번째 응답 20개, 두 번째 응답 5개
    const page1 = Array.from({ length: 20 }, (_, i) => makeDone(`d${i}`, 2000 - i))
    const page2 = [makeDone('d20', 100)]
    vi.mocked(doneTodoApi.getDoneTodos)
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)

    // when
    await useDoneTodosCache.getState().fetchNext()
    await useDoneTodosCache.getState().fetchNext()

    // then
    expect(useDoneTodosCache.getState().items).toHaveLength(21)
    expect(useDoneTodosCache.getState().hasMore).toBe(false)
  })

  it('반환 개수가 PAGE_SIZE 미만이면 hasMore가 false가 된다', async () => {
    // given
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue([makeDone('d1')])

    // when
    await useDoneTodosCache.getState().fetchNext()

    // then
    expect(useDoneTodosCache.getState().hasMore).toBe(false)
  })

  it('remove 호출 시 items에서 해당 항목이 제거된다', async () => {
    // given
    useDoneTodosCache.setState({ items: [makeDone('d1'), makeDone('d2')] })
    vi.mocked(doneTodoApi.deleteDoneTodo).mockResolvedValue({ status: 'ok' })

    // when
    await useDoneTodosCache.getState().remove('d1')

    // then
    expect(useDoneTodosCache.getState().items.map(i => i.uuid)).toEqual(['d2'])
  })

  it('revert 호출 시 items에서 해당 항목이 제거된다', async () => {
    // given — 응답은 iOS RevertTodoResultMapper 와 동일한 { todo, detail } 형태
    useDoneTodosCache.setState({ items: [makeDone('d1'), makeDone('d2')] })
    const restored: Todo = { uuid: 'd1', name: 'done-d1', is_current: true }
    vi.mocked(doneTodoApi.revertDoneTodo).mockResolvedValue({ todo: restored, detail: null })

    // when
    await useDoneTodosCache.getState().revert('d1')

    // then
    expect(useDoneTodosCache.getState().items.map(i => i.uuid)).toEqual(['d2'])
  })

  it('revert 호출 시 응답의 todo 가 is_current 면 currentTodosCache 에 즉시 추가된다', async () => {
    // given
    useDoneTodosCache.setState({ items: [makeDone('d1')] })
    useCurrentTodosCache.getState().reset()
    const restored: Todo = { uuid: 'd1', name: '복구된 current', is_current: true }
    vi.mocked(doneTodoApi.revertDoneTodo).mockResolvedValue({ todo: restored, detail: null })

    // when
    await useDoneTodosCache.getState().revert('d1')

    // then — BFF 일관성 의존 없이 즉시 currentTodos 에 노출된다
    expect(useCurrentTodosCache.getState().todos.find(t => t.uuid === 'd1')).toEqual(restored)
  })

  it('마지막 항목의 done_at이 null이면 hasMore가 false가 된다', async () => {
    // given: PAGE_SIZE(20)개를 반환하지만 마지막 항목의 done_at이 null
    const items = Array.from({ length: 20 }, (_, i) => makeDone(`d${i}`, i < 19 ? 2000 - i : null))
    vi.mocked(doneTodoApi.getDoneTodos).mockResolvedValue(items)

    // when
    await useDoneTodosCache.getState().fetchNext()

    // then: cursor가 null이므로 다음 페이지 없음
    expect(useDoneTodosCache.getState().hasMore).toBe(false)
    expect(useDoneTodosCache.getState().cursor).toBeNull()
  })

  it('reset 호출 시 상태가 초기화된다', async () => {
    // given
    useDoneTodosCache.setState({ items: [makeDone('d1')], hasMore: false, cursor: 999 })

    // when
    useDoneTodosCache.getState().reset()

    // then
    const state = useDoneTodosCache.getState()
    expect(state.items).toHaveLength(0)
    expect(state.hasMore).toBe(true)
    expect(state.cursor).toBeNull()
  })

  it('fetchNext 응답 도착 전에 reset 이 일어났다면 stale 응답은 cache 를 다시 채우지 않는다', async () => {
    // given — fetchNext 응답을 deferred 로 잡아둔다 (race 시나리오 시뮬레이션)
    let resolveGet!: (items: ReturnType<typeof makeDone>[]) => void
    vi.mocked(doneTodoApi.getDoneTodos).mockReturnValue(
      new Promise(resolve => { resolveGet = resolve as never }),
    )

    // when — fetchNext 시작 후 응답 도착 전에 reset → stale 한 응답이 도착
    const inflight = useDoneTodosCache.getState().fetchNext()
    useDoneTodosCache.getState().reset()
    resolveGet([makeDone('d-stale', 1000)])
    await inflight

    // then — reset 으로 비워진 cache 는 stale 응답으로 다시 채워지지 않는다
    expect(useDoneTodosCache.getState().items).toHaveLength(0)
  })

  it('fetchNext 응답 도착 전에 revert/remove 가 일어나면 stale 응답이 cache 를 다시 채우지 않는다', async () => {
    // given — 초기 상태: 한 항목이 있고 fetchNext 가 in-flight
    useDoneTodosCache.setState({ items: [makeDone('d1', 1500)], cursor: 1500, hasMore: true })
    let resolveGet!: (items: ReturnType<typeof makeDone>[]) => void
    vi.mocked(doneTodoApi.getDoneTodos).mockReturnValue(
      new Promise(resolve => { resolveGet = resolve as never }),
    )
    vi.mocked(doneTodoApi.revertDoneTodo).mockResolvedValue({
      todo: { uuid: 'd1', name: 'done-d1', is_current: true },
      detail: null,
    })

    // when — 사용자가 빠르게 revert 클릭 → cache 에서 d1 제거 → fetchNext 응답 뒤늦게 도착
    const inflight = useDoneTodosCache.getState().fetchNext()
    await useDoneTodosCache.getState().revert('d1')
    resolveGet([makeDone('d1', 1500)]) // 백엔드가 다음 페이지 응답으로 d1 을 다시 보내는 케이스
    await inflight

    // then — 사용자가 막 지운 d1 이 stale 응답에 의해 되살아나지 않는다
    expect(useDoneTodosCache.getState().items.find(i => i.uuid === 'd1')).toBeUndefined()
  })
})
