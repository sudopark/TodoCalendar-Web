import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDoneTodosCache } from '../../../src/repositories/caches/doneTodosCache'
import { doneTodoApi } from '../../../src/api/doneTodoApi'

vi.mock('../../../src/api/doneTodoApi', () => ({
  doneTodoApi: {
    getDoneTodos: vi.fn(),
    deleteDoneTodo: vi.fn(),
    revertDoneTodo: vi.fn(),
  },
}))

const makeDone = (id: string, done_at = 1000) => ({
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
    // given
    useDoneTodosCache.setState({ items: [makeDone('d1'), makeDone('d2')] })
    vi.mocked(doneTodoApi.revertDoneTodo).mockResolvedValue({
      uuid: 'd1', name: 'done-d1', is_current: true,
    } as any)

    // when
    await useDoneTodosCache.getState().revert('d1')

    // then
    expect(useDoneTodosCache.getState().items.map(i => i.uuid)).toEqual(['d2'])
  })

  it('마지막 항목의 done_at이 null이면 hasMore가 false가 된다', async () => {
    // given: PAGE_SIZE(20)개를 반환하지만 마지막 항목의 done_at이 null
    const items = Array.from({ length: 20 }, (_, i) => makeDone(`d${i}`, i < 19 ? 2000 - i : null as any))
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
})
